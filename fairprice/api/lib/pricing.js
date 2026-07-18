import { benchmarks } from "../data/benchmarks.js";

const normalize = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export function matchBenchmark(product) {
  const productWords = new Set(normalize(product).split(" ").filter((word) => word.length > 2 || /^\d+$/.test(word)));
  let best = null;
  let bestScore = 0;

  for (const benchmark of benchmarks) {
    const categoryWords = normalize(benchmark.category).split(" ").filter((word) => word.length > 2 || /^\d+$/.test(word));
    const benchmarkModelNumbers = categoryWords.filter((word) => /^\d+$/.test(word));
    const productModelNumbers = [...productWords].filter((word) => /^\d+$/.test(word));

    // A different model generation is not a valid comparable. For example,
    // an iPhone 17 must not inherit a used iPhone 12 benchmark.
    if (benchmarkModelNumbers.length && productModelNumbers.length && !benchmarkModelNumbers.some((number) => productModelNumbers.includes(number))) {
      continue;
    }
    const score = categoryWords.reduce((total, word) => total + (productWords.has(word) ? 1 : 0), 0);
    if (score > bestScore) {
      best = benchmark;
      bestScore = score;
    }
  }

  if (!bestScore) return { benchmark: null, confidence: "low" };
  return {
    benchmark: best,
    confidence: bestScore >= 2 || normalize(product).includes(normalize(best.category)) ? "high" : "medium",
  };
}

export function createFallbackVerdict(price, benchmark) {
  return { ...createEvidenceVerdict(price, benchmark), fallback: true };
}

function fairPriceGuidance(price, benchmark, sellerRating, listingDetails) {
  if (!benchmark) {
    return {
      targetPrice: null,
      targetMessage: "Add two or more close comparable listings before relying on a price target.",
      actions: ["Confirm the exact model, condition, and included accessories.", "Compare at least two recent listings for the same variant."],
    };
  }

  const [low, high] = benchmark.typicalPriceRange;
  const actions = [];
  if (price > high) {
    actions.push(`A price at or below ₹${high.toLocaleString("en-IN")} aligns with the current comparable range.`);
    if (listingDetails?.condition === "unknown") actions.push("Document the condition with clear photos or inspection details to support a premium.");
    if (!listingDetails?.warranty) actions.push("Confirm remaining warranty or return protection before paying above-range pricing.");
    if (sellerRating == null || sellerRating < benchmark.avgRating) actions.push("Ask for stronger seller history, proof of purchase, or buyer protection.");
    return { targetPrice: high, targetMessage: "Comparable-range target", actions: actions.slice(0, 3) };
  }
  if (price < low) {
    return {
      targetPrice: low,
      targetMessage: "Lower edge of the typical range",
      actions: ["Check condition and completeness carefully—an unusually low price can reflect missing details.", "Verify that the exact model and included accessories match the listing."],
    };
  }
  return {
    targetPrice: high,
    targetMessage: "Upper edge of the typical range",
    actions: ["The price already sits within the comparable range.", "Verify condition and warranty before paying closer to the upper edge."],
  };
}

export function createEvidenceVerdict(price, benchmark, sellerRating = null, listingDetails = {}) {
  if (!benchmark) {
    return {
      score: 50,
      verdict: "Insufficient comparable data; treat this assessment as low confidence.",
      breakdown: [
        { label: "Comparable evidence", detail: "No close price range found", impact: "unknown" },
        { label: "Seller rating", detail: sellerRating == null ? "Not supplied" : `${sellerRating}/5`, impact: "neutral" },
      ],
      ...fairPriceGuidance(price, benchmark, sellerRating, listingDetails),
    };
  }

  const [low, high] = benchmark.typicalPriceRange;
  const midpoint = (low + high) / 2;
  const priceScore = price < low
    ? 90
    : price > high
      ? 72 - ((price - high) / midpoint) * 65
      : 88 - ((price - low) / (high - low)) * 16;
  const ratingAdjustment = sellerRating == null || !Number.isFinite(benchmark.avgRating)
    ? 0
    : Math.max(-6, Math.min(6, (sellerRating - benchmark.avgRating) * 8));
  const score = Math.max(10, Math.min(95, Math.round(priceScore + ratingAdjustment)));
  const verdict = price < low
    ? "Priced below the typical range; check condition before buying."
    : price > high
      ? "Priced above the typical range; ask what justifies the premium."
      : "Within the typical range for comparable listings.";

  const pricePosition = price < low
    ? "Below the typical range"
    : price > high
      ? "Above the typical range"
      : "Within the typical range";
  const ratingDetail = sellerRating == null
    ? "Not supplied; no adjustment"
    : `${sellerRating}/5 vs typical ${benchmark.avgRating}/5 (${ratingAdjustment >= 0 ? "+" : ""}${ratingAdjustment} points)`;

  return {
    score,
    verdict,
    breakdown: [
      { label: "Comparable price range", detail: `₹${low.toLocaleString("en-IN")}–₹${high.toLocaleString("en-IN")}`, impact: pricePosition },
      { label: "Listed price", detail: `₹${price.toLocaleString("en-IN")}`, impact: pricePosition },
      { label: "Seller rating", detail: ratingDetail, impact: ratingAdjustment > 0 ? "positive" : ratingAdjustment < 0 ? "negative" : "neutral" },
    ],
    ...fairPriceGuidance(price, benchmark, sellerRating, listingDetails),
  };
}

export function priceLabel(score) {
  if (score >= 80) return "Great value";
  if (score >= 60) return "Fair price";
  if (score >= 40) return "Borderline";
  return "Overpriced";
}
