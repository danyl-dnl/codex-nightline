import express from "express";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";
import trialHandler from "./api/trial.js";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(currentDirectory, ".env.local") });

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(express.json());
app.all("/api/trial", (req, res) => trialHandler(req, res));

const server = app.listen(port, () => {
  console.log(`Fair Price API listening at http://localhost:${port}`);
});

server.on("error", (error) => {
  console.error("Fair Price API failed to start:", error.message);
  process.exitCode = 1;
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    server.close(() => process.exit(0));
  });
}
