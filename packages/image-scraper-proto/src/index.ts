import { fileURLToPath } from "node:url";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";

/** The service definition both sides load. */
export const PROTO_PATH = fileURLToPath(new URL("../image_scraper.proto", import.meta.url));

/** Images are up to 15 MB, over gRPC's 4 MB default. */
export const MAX_MESSAGE_BYTES = 16 * 1024 * 1024;

export type FetchedImage = { data: Buffer; contentType: string };

/** What the scraper app implements and the API calls. */
export interface ImageScraper {
  /** Image URLs a product page offers, best first. */
  findImages(pageUrl: string): Promise<string[]>;
  fetchImage(url: string): Promise<FetchedImage>;
}

/**
 * How a call failed:
 * - refused: the site said no (robot check, 404, not an image)
 * - invalid: a bad URL
 * - unavailable: the scraper isn't running or timed out
 * - internal: anything else
 */
export type ImageScraperErrorCode = "refused" | "invalid" | "unavailable" | "internal";

/** A failure whose message is fit to show the user. */
export class ImageScraperError extends Error {
  constructor(
    message: string,
    readonly code: ImageScraperErrorCode = "refused",
  ) {
    super(message);
    this.name = "ImageScraperError";
  }
}

const TO_STATUS: Record<ImageScraperErrorCode, grpc.status> = {
  refused: grpc.status.FAILED_PRECONDITION,
  invalid: grpc.status.INVALID_ARGUMENT,
  unavailable: grpc.status.UNAVAILABLE,
  internal: grpc.status.INTERNAL,
};

function fromStatus(err: grpc.ServiceError): ImageScraperError {
  switch (err.code) {
    case grpc.status.FAILED_PRECONDITION:
      return new ImageScraperError(err.details, "refused");
    case grpc.status.INVALID_ARGUMENT:
      return new ImageScraperError(err.details, "invalid");
    case grpc.status.UNAVAILABLE:
      return new ImageScraperError("The image scraper isn't running.", "unavailable");
    case grpc.status.DEADLINE_EXCEEDED:
      return new ImageScraperError("The image scraper took too long.", "unavailable");
    default:
      return new ImageScraperError("The image scraper failed.", "internal");
  }
}

type FindImagesRequest = { pageUrl: string };
type FindImagesResponse = { imageUrls: string[] };
type FetchImageRequest = { url: string };

type Handlers = {
  findImages: grpc.handleUnaryCall<FindImagesRequest, FindImagesResponse>;
  fetchImage: grpc.handleUnaryCall<FetchImageRequest, FetchedImage>;
};

type RawClient = grpc.Client & {
  findImages(
    req: FindImagesRequest,
    options: grpc.CallOptions,
    callback: (err: grpc.ServiceError | null, res?: FindImagesResponse) => void,
  ): void;
  fetchImage(
    req: FetchImageRequest,
    options: grpc.CallOptions,
    callback: (err: grpc.ServiceError | null, res?: FetchedImage) => void,
  ): void;
};

function loadService(): grpc.ServiceClientConstructor {
  const definition = protoLoader.loadSync(PROTO_PATH, { defaults: true });
  const root = grpc.loadPackageDefinition(definition) as unknown as {
    partswarehouse: { imagescraper: { v1: { ImageScraper: grpc.ServiceClientConstructor } } };
  };
  return root.partswarehouse.imagescraper.v1.ImageScraper;
}

const messageLimits = {
  "grpc.max_receive_message_length": MAX_MESSAGE_BYTES,
  "grpc.max_send_message_length": MAX_MESSAGE_BYTES,
};

/**
 * Calls a scraper at `address` (host:port). Failures arrive as
 * ImageScraperError. Finding images can load a page in a browser (and in
 * headed mode wait for a person), hence the long default deadline.
 */
export function createImageScraperClient(
  address: string,
  { findDeadlineMs = 4 * 60_000, fetchDeadlineMs = 30_000 } = {},
): ImageScraper & { close(): void } {
  const Service = loadService();
  // The constructor is built from the .proto at runtime, so it's untyped.
  const client = new Service(
    address,
    grpc.credentials.createInsecure(),
    messageLimits,
  ) as unknown as RawClient;
  const deadline = (ms: number) => ({ deadline: Date.now() + ms });

  const call = <Res>(run: (cb: (err: grpc.ServiceError | null, res?: Res) => void) => void) =>
    new Promise<Res>((resolve, reject) =>
      run((err, res) => (err ? reject(fromStatus(err)) : resolve(res!))),
    );

  return {
    async findImages(pageUrl) {
      const res = await call<FindImagesResponse>((cb) =>
        client.findImages({ pageUrl }, deadline(findDeadlineMs), cb),
      );
      return res.imageUrls;
    },
    fetchImage: (url) =>
      call<FetchedImage>((cb) => client.fetchImage({ url }, deadline(fetchDeadlineMs), cb)),
    close: () => client.close(),
  };
}

/** Serves `impl` over gRPC; resolves to the bound port. */
export async function serveImageScraper(
  impl: ImageScraper,
  address: string,
  log: (message: string, err: unknown) => void = () => {},
): Promise<{ port: number; server: grpc.Server }> {
  const server = new grpc.Server(messageLimits);

  const unary =
    <Req, Res>(name: string, handle: (req: Req) => Promise<Res>): grpc.handleUnaryCall<Req, Res> =>
    (call, callback) => {
      handle(call.request).then(
        (res) => callback(null, res),
        (err: unknown) => {
          const known = err instanceof ImageScraperError ? err : null;
          if (!known) log(`${name} failed`, err);
          callback({
            code: TO_STATUS[known?.code ?? "internal"],
            details: known?.message ?? "The image scraper failed.",
          });
        },
      );
    };

  const handlers: Handlers = {
    findImages: unary("FindImages", async (req: FindImagesRequest) => ({
      imageUrls: await impl.findImages(req.pageUrl),
    })),
    fetchImage: unary("FetchImage", (req: FetchImageRequest) => impl.fetchImage(req.url)),
  };
  server.addService(loadService().service, handlers);

  const port = await new Promise<number>((resolve, reject) =>
    server.bindAsync(address, grpc.ServerCredentials.createInsecure(), (err, bound) =>
      err ? reject(err) : resolve(bound),
    ),
  );
  return { port, server };
}
