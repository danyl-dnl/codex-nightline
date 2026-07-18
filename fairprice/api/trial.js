import { researchComparables, streamAgent } from "./lib/openai.js";
import { createEvidenceVerdict, matchBenchmark, priceLabel } from "./lib/pricing.js";
import { allowRequest, cacheTrial, getCachedTrial, logTrial } from "./lib/runtime.js";
import {
  createCaseContext,
  createSharedInstructions,
  defensePrompt,
  judgePrompt,
  prosecutorPrompt,
} from "./lib/prompts.js";

const ASSESSMENT_VERSION = "4";

function writeEvent(res, event, data) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function writeSseHeaders(res) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();
}

function validationError(product, price, sellerRating, listingDetails) {
  if (typeof product !== "string" || !product.trim()) return "Enter a product name.";
  if (product.trim().length > 160) return "Product name must be 160 characters or fewer.";
  if (typeof price !== "number" || !Number.isFinite(price) || price < 0) return "Enter a valid non-negative price.";
  if (price > 10_000_000) return "Price is outside the supported range.";
  if (sellerRating != null && (typeof sellerRating !== "number" || !Number.isFinite(sellerRating) || sellerRating < 1 || sellerRating > 5)) {
    return "Seller rating must be between 1 and 5.";
  }
  if (listingDetails != null && (typeof listingDetails !== "object" || Array.isArray(listingDetails))) return "Listing details must be valid.";
  if (listingDetails?.condition != null && !["new", "used", "refurbished", "unknown"].includes(listingDetails.condition)) return "Choose a valid item condition.";
  if (listingDetails?.warranty != null && (typeof listingDetails.warranty !== "string" || listingDetails.warranty.length > 80)) return "Warranty details must be 80 characters or fewer.";
  if (listingDetails?.details != null && (typeof listingDetails.details !== "string" || listingDetails.details.length > 500)) return "Listing details must be 500 characters or fewer.";
  return null;
}

export default async function handler(req, res) {
  const startedAt = Date.now();
  let heartbeat;
  let requestController;
  let responseFinished = false;
  try {
    if (req.method === "GET") return res.status(200).json({ status: "ok", service: "fair-price" });
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    const { product, price, sellerRating: requestedSellerRating, listingDetails: requestedListingDetails } = req.body || {};
    const invalidMessage = validationError(product, price, requestedSellerRating, requestedListingDetails);
    if (invalidMessage) return res.status(400).json({ error: invalidMessage });

    const clientKey = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "anonymous").split(",")[0].trim();
    if (!allowRequest(clientKey)) return res.status(429).json({ error: "Too many trials. Please wait a minute and try again." });

    const cleanProduct = product.trim();
    const sellerRating = requestedSellerRating ?? null;
    const listingDetails = {
      condition: requestedListingDetails?.condition ?? "unknown",
      warranty: requestedListingDetails?.warranty?.trim() ?? "",
      details: requestedListingDetails?.details?.trim() ?? "",
    };
    let { benchmark, confidence } = matchBenchmark(cleanProduct);
    let sources = [];
    if (!benchmark) {
      try {
        const research = await researchComparables({ product: cleanProduct, signal: requestController?.signal });
        if (research) {
          benchmark = research.benchmark;
          confidence = "medium";
          sources = research.sources;
        }
      } catch (error) {
        logTrial("research_failed", { reason: error.message });
      }
    }
    const caseMetadata = { product: cleanProduct, price, sellerRating, listingDetails, benchmark, confidence, sources, liveResearch: Boolean(sources.length) };
    const cacheKey = JSON.stringify([ASSESSMENT_VERSION, cleanProduct.toLowerCase(), price, sellerRating, listingDetails]);
    const cached = getCachedTrial(cacheKey);

    writeSseHeaders(res);
    requestController = new AbortController();
    const stopWork = () => {
      if (!responseFinished) requestController.abort();
    };
    req.once("aborted", stopWork);
    res.once("close", stopWork);
    heartbeat = setInterval(() => {
      if (!res.writableEnded) res.write(": keep-alive\n\n");
    }, 15_000);
    writeEvent(res, "case", { ...caseMetadata, cached: Boolean(cached) });
    if (cached) {
      for (const [event, data] of cached) writeEvent(res, event, data);
      writeEvent(res, "done", {});
      responseFinished = true;
      res.end();
      logTrial("cache_hit", { durationMs: Date.now() - startedAt, confidence });
      return;
    }

    const caseContext = createCaseContext(cleanProduct, price, sellerRating, benchmark, confidence, listingDetails);
    const sharedInstructions = createSharedInstructions();
    const replay = [];
    const send = (event, data) => {
      if (requestController.signal.aborted) throw new Error("Client disconnected");
      replay.push([event, data]);
      writeEvent(res, event, data);
    };

    const prosecutorText = await streamAgent({
      systemPrompt: prosecutorPrompt(sharedInstructions),
      userPrompt: caseContext,
      onChunk: (chunk) => send("prosecutor", { chunk }),
      signal: requestController.signal,
    });
    send("prosecutor_done", {});

    const defenseText = await streamAgent({
      systemPrompt: defensePrompt(sharedInstructions),
      userPrompt: `${caseContext}\n\nProsecutor's completed argument:\n${prosecutorText}`,
      onChunk: (chunk) => send("defense", { chunk }),
      signal: requestController.signal,
    });
    send("defense_done", {});

    await streamAgent({
      systemPrompt: judgePrompt(sharedInstructions),
      userPrompt: `${caseContext}\n\nProsecutor's completed argument:\n${prosecutorText}\n\nDefense's completed argument:\n${defenseText}`,
      onChunk: (chunk) => send("judge", { chunk }),
      signal: requestController.signal,
    });

    const verdict = createEvidenceVerdict(price, benchmark, sellerRating, listingDetails);
    verdict.label = priceLabel(verdict.score);
    verdict.confidence = confidence;
    send("verdict", verdict);
    cacheTrial(cacheKey, replay);
    writeEvent(res, "done", {});
    responseFinished = true;
    res.end();
    logTrial("completed", { durationMs: Date.now() - startedAt, confidence, usedFallback: Boolean(verdict.fallback) });
  } catch (error) {
    if (requestController?.signal.aborted) {
      logTrial("cancelled", { durationMs: Date.now() - startedAt });
      return;
    }
    if (!res.headersSent) {
      writeSseHeaders(res);
    }
    writeEvent(res, "error", { message: "The court hit a snag. Try again." });
    responseFinished = true;
    res.end();
    logTrial("failed", { durationMs: Date.now() - startedAt, reason: error.message });
  } finally {
    if (heartbeat) clearInterval(heartbeat);
  }
}
