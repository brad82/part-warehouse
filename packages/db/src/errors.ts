/**
 * A rule broken by the caller. Fastify's default error handler replies with
 * `statusCode` and `message`, so repositories can throw this without knowing
 * about HTTP.
 */
export class DomainError extends Error {
  constructor(
    readonly statusCode: 400 | 404 | 409,
    message: string,
  ) {
    super(message);
  }
}
