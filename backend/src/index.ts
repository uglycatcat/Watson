import "dotenv/config";
import { buildApp } from "./app.js";

const { app, config } = await buildApp();

await app.listen({ port: config.server.port, host: config.server.host });
console.log(`Watson listening on http://${config.server.host}:${config.server.port}`);
