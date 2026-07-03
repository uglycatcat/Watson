import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";

export function registerErrorHandler(app: {
  setErrorHandler: (
    handler: (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => void,
  ) => void;
}) {
  app.setErrorHandler((error, _request, reply) => {
    const status = error.statusCode ?? 500;
    const message =
      status >= 500
        ? "Internal server error"
        : error.message || "Request failed";
    if (status >= 500) {
      console.error("[error]", error.message);
    }
    reply.status(status).send({ error: message });
  });
}
