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
app.post("/api/trial", (req, res) => trialHandler(req, res));

app.listen(port, () => {
  console.log(`Fair Price API listening at http://localhost:${port}`);
});
