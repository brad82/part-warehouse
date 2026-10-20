import { fileURLToPath } from "node:url";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
/** The service definition both sides load. */
export const PROTO_PATH = fileURLToPath(new URL("../image_scraper.proto", import.meta.url));
/** Images are up to 15 MB, over gRPC's 4 MB default. */
export const MAX_MESSAGE_BYTES = 16 * 1024 * 1024;
/** A failure whose message is fit to show the user. */
export class ImageScraperError extends Error {
    code;
    constructor(message, code = "refused") {
        super(message);
        this.code = code;
        this.name = "ImageScraperError";
    }
}
const TO_STATUS = {
    refused: grpc.status.FAILED_PRECONDITION,
    invalid: grpc.status.INVALID_ARGUMENT,
    unavailable: grpc.status.UNAVAILABLE,
    internal: grpc.status.INTERNAL,
};
function fromStatus(err) {
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
function loadService() {
    const definition = protoLoader.loadSync(PROTO_PATH, { defaults: true });
    const root = grpc.loadPackageDefinition(definition);
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
export function createImageScraperClient(address, { findDeadlineMs = 4 * 60_000, fetchDeadlineMs = 30_000 } = {}) {
    const Service = loadService();
    const client = new Service(address, grpc.credentials.createInsecure(), messageLimits);
    const deadline = (ms) => ({ deadline: Date.now() + ms });
    const call = (run) => new Promise((resolve, reject) => run((err, res) => (err ? reject(fromStatus(err)) : resolve(res))));
    return {
        async findImages(pageUrl) {
            const res = await call((cb) => client.findImages({ pageUrl }, deadline(findDeadlineMs), cb));
            return res.imageUrls;
        },
        fetchImage: (url) => call((cb) => client.fetchImage({ url }, deadline(fetchDeadlineMs), cb)),
        close: () => client.close(),
    };
}
/** Serves `impl` over gRPC; resolves to the bound port. */
export async function serveImageScraper(impl, address, log = () => { }) {
    const server = new grpc.Server(messageLimits);
    const unary = (name, handle) => (call, callback) => {
        handle(call.request).then((res) => callback(null, res), (err) => {
            const known = err instanceof ImageScraperError ? err : null;
            if (!known)
                log(`${name} failed`, err);
            callback({
                code: TO_STATUS[known?.code ?? "internal"],
                details: known?.message ?? "The image scraper failed.",
            });
        });
    };
    const handlers = {
        findImages: unary("FindImages", async (req) => ({
            imageUrls: await impl.findImages(req.pageUrl),
        })),
        fetchImage: unary("FetchImage", (req) => impl.fetchImage(req.url)),
    };
    server.addService(loadService().service, handlers);
    const port = await new Promise((resolve, reject) => server.bindAsync(address, grpc.ServerCredentials.createInsecure(), (err, bound) => err ? reject(err) : resolve(bound)));
    return { port, server };
}
