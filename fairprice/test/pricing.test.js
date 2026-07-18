import test from "node:test";
import assert from "node:assert/strict";
import { createEvidenceVerdict, createFallbackVerdict, matchBenchmark, priceLabel } from "../api/lib/pricing.js";
import { createRateLimiter, createTtlCache } from "../api/lib/runtime.js";

test("matches a recognizable product category", () => {
  const match = matchBenchmark("Wireless earbuds with ANC");
  assert.equal(match.benchmark.category, "wireless earbuds");
  assert.equal(match.confidence, "high");
});

test("marks unmatched products as low confidence", () => {
  assert.equal(matchBenchmark("Moon rock sculpture").confidence, "low");
});

test("does not use an older phone generation as a benchmark", () => {
  const match = matchBenchmark("iPhone 17");
  assert.equal(match.benchmark, null);
  assert.equal(match.confidence, "low");
});

test("fallback verdict flags prices above a benchmark range", () => {
  const benchmark = matchBenchmark("wireless earbuds").benchmark;
  const verdict = createFallbackVerdict(6000, benchmark);
  assert.ok(verdict.score < 60);
  assert.equal(priceLabel(verdict.score), "Overpriced");
});

test("evidence verdict gets stricter as a listing moves above its benchmark", () => {
  const benchmark = matchBenchmark("wireless earbuds").benchmark;
  const withinRange = createEvidenceVerdict(2499, benchmark, 4.0);
  const aboveRange = createEvidenceVerdict(6000, benchmark, 4.0);
  assert.ok(withinRange.score > aboveRange.score);
  assert.equal(aboveRange.verdict, "Priced above the typical range; ask what justifies the premium.");
  assert.equal(aboveRange.breakdown[1].impact, "Above the typical range");
  assert.equal(aboveRange.targetPrice, 3500);
  assert.match(aboveRange.actions[0], /₹3,500/);
});

test("evidence verdict reports uncertainty without a close benchmark", () => {
  const verdict = createEvidenceVerdict(5000, null);
  assert.equal(verdict.score, 50);
  assert.match(verdict.verdict, /Insufficient comparable data/);
  assert.equal(verdict.breakdown[0].impact, "unknown");
  assert.equal(verdict.targetPrice, null);
});

test("rate limiter resets after its time window", () => {
  let now = 0;
  const allow = createRateLimiter({ windowMs: 100, maxRequests: 2, now: () => now });
  assert.equal(allow("client"), true);
  assert.equal(allow("client"), true);
  assert.equal(allow("client"), false);
  now = 101;
  assert.equal(allow("client"), true);
});

test("cache entries expire and honour its size limit", () => {
  let now = 0;
  const cache = createTtlCache({ ttlMs: 100, maxEntries: 1, now: () => now });
  cache.set("a", 1);
  cache.set("b", 2);
  assert.equal(cache.get("a"), null);
  assert.equal(cache.get("b"), 2);
  now = 101;
  assert.equal(cache.get("b"), null);
});
