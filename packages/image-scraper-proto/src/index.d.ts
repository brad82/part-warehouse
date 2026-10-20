import * as grpc from "@grpc/grpc-js";
/** The service definition both sides load. */
export declare const PROTO_PATH: string;
/** Images are up to 15 MB, over gRPC's 4 MB default. */
export declare const MAX_MESSAGE_BYTES: number;
export type FetchedImage = {
    data: Buffer;
    contentType: string;
};
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
export declare class ImageScraperError extends Error {
    readonly code: ImageScraperErrorCode;
    constructor(message: string, code?: ImageScraperErrorCode);
}
/**
 * Calls a scraper at `address` (host:port). Failures arrive as
 * ImageScraperError. Finding images can load a page in a browser (and in
 * headed mode wait for a person), hence the long default deadline.
 */
export declare function createImageScraperClient(address: string, { findDeadlineMs, fetchDeadlineMs }?: {
    findDeadlineMs?: number | undefined;
    fetchDeadlineMs?: number | undefined;
}): ImageScraper & {
    close(): void;
};
/** Serves `impl` over gRPC; resolves to the bound port. */
export declare function serveImageScraper(impl: ImageScraper, address: string, log?: (message: string, err: unknown) => void): Promise<{
    port: number;
    server: grpc.Server;
}>;
