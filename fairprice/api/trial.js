import { benchmarks } from "./data/benchmarks.js";
import { createVerdict, streamAgent } from "./lib/openai.js";
import {
  createCaseContext,
  createSharedInstructions,
  defensePrompt,
  judgePrompt,
  prosecutorPrompt,
} from "./lib/prompts.js";

function writeEvent(res, event, data) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export default async function handler(req, res) {
  try {
    const { product, price, sellerRating: requestedSellerRating } = req.body || {};
    if (
      typeof product !== "string" ||
      !product.trim() ||
      typeof price !== "number" ||
      !Number.isFinite(price) ||
      price < 0
    ) {
      return res.status(400).json({ error: "Missing product or price" });
    }

    const sellerRating =
      typeof requestedSellerRating === "number" &&
      Number.isFinite(requestedSellerRating) &&
      requestedSellerRating >= 1 &&
      requestedSellerRating <= 5
        ? requestedSellerRating
        : null;
    const caseContext = createCaseContext(product.trim(), price, sellerRating);
    const sharedInstructions = createSharedInstructions(benchmarks);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const prosecutorText = await streamAgent({
      systemPrompt: prosecutorPrompt(sharedInstructions),
      userPrompt: caseContext,
      onChunk: (chunk) => writeEvent(res, "prosecutor", { chunk }),
    });
    writeEvent(res, "prosecutor_done", {});

    const defenseText = await streamAgent({
      systemPrompt: defensePrompt(sharedInstructions),
      userPrompt: `${caseContext}\n\nProsecutor's completed argument:\n${prosecutorText}`,
      onChunk: (chunk) => writeEvent(res, "defense", { chunk }),
    });
    writeEvent(res, "defense_done", {});

    const judgeText = await streamAgent({
      systemPrompt: judgePrompt(sharedInstructions),
      userPrompt: `${caseContext}\n\nProsecutor's completed argument:\n${prosecutorText}\n\nDefense's completed argument:\n${defenseText}`,
      onChunk: (chunk) => writeEvent(res, "judge", { chunk }),
    });

    writeEvent(res, "verdict", await createVerdict(judgeText));
    writeEvent(res, "done", {});
    res.end();
  } catch (error) {
    if (!res.headersSent) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
    }
    writeEvent(res, "error", { message: "The court hit a snag. Try again." });
    res.end();
  }
}
