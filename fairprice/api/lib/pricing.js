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

export function createEvidenceVerdict(price, benchmark, sellerRating = null) {
  if (!benchmark) {
    return { score: 50, verdict: "Insufficient comparable data; treat this assessment as low confidence." };
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

  return { score, verdict };
}

export function priceLabel(score) {
  if (score >= 80) return "Great value";
  if (score >= 60) return "Fair price";
  if (score >= 40) return "Borderline";
  return "Overpriced";
}
