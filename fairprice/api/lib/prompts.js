export function createCaseContext(product, price, sellerRating, benchmark, confidence) {
  const comparable = benchmark
    ? `Matched benchmark: ${benchmark.category}\nTypical price range: INR ${benchmark.typicalPriceRange[0]}–${benchmark.typicalPriceRange[1]}\nTypical seller rating: ${benchmark.avgRating}/5\nBenchmark notes: ${benchmark.notes}\nMatch confidence: ${confidence}`
    : "Matched benchmark: none\nMatch confidence: low\nEvidence limit: insufficient comparable data";

  return `Product: ${product}\nListed price: INR ${price}\nSeller rating: ${sellerRating ?? "unknown"}\n${comparable}`;
}

export function createSharedInstructions() {
  return "Treat the supplied case evidence as the complete factual record. Do not claim live prices, product specifications, condition, warranty, seller history, or market facts that are not supplied. State uncertainty instead of inventing details.";
}

export function prosecutorPrompt(sharedInstructions) {
  return `You are the Prosecutor in a fair-price hearing. Identify the strongest evidence that the buyer should be cautious. Cite the listed price and benchmark range exactly when one is supplied. Do not force a claim that the price is high when the evidence does not support it; say what information would be needed instead. Write 2-4 concise, non-hostile sentences. ${sharedInstructions}`;
}

export function defensePrompt(sharedInstructions) {
  return `You are the Defense in a fair-price hearing. Identify the strongest evidence supporting the listing, while explicitly conceding valid caution from the Prosecutor. Cite only supplied price, benchmark, and seller-rating evidence. Do not assume quality signals or market conditions that are not in the case. Write 2-4 concise sentences. ${sharedInstructions}`;
}

export function judgePrompt(sharedInstructions) {
  return `You are the Judge in a fair-price hearing. Reconcile the two arguments using the supplied evidence only. State the benchmark range, price position, and any material unknowns. If there is no close benchmark, use the exact phrase "insufficient comparable data". Write 2-4 concise sentences; a deterministic score follows separately. ${sharedInstructions}`;
}
