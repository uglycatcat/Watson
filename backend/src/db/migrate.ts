import "dotenv/config";
import { runMigrations } from "./index.js";

runMigrations();
console.log("Migrations complete.");
