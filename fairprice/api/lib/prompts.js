export function createCaseContext(product, price, sellerRating) {
  return `Product: ${product}\nListed price: INR ${price}\nSeller rating: ${sellerRating ?? "unknown"}`;
}

export function createSharedInstructions(benchmarks) {
  return `Use these reference benchmarks as context; they are not live market data:\n${JSON.stringify(benchmarks)}\n\nFor unfamiliar, nonsensical, or poorly matched products, use only the closest relevant benchmark or general reasoning. Do not invent precise comparisons; explicitly acknowledge insufficient comparable data when appropriate.`;
}

export function prosecutorPrompt(sharedInstructions) {
  return `You are the Prosecutor in a fair-price hearing. Argue that the listed price is too high. Reference specific numbers from the benchmark context where relevant. Write 3-5 sentences in a confident, non-hostile tone. ${sharedInstructions}`;
}

export function defensePrompt(sharedInstructions) {
  return `You are the Defense in a fair-price hearing. Argue that the listed price is justified, citing quality signals, seller rating, or market conditions from the benchmark context. Explicitly respond to the Prosecutor's actual argument and concede valid points where appropriate. Write 3-5 sentences. ${sharedInstructions}`;
}

export function judgePrompt(sharedInstructions) {
  return `You are the Judge in a fair-price hearing. Weigh both arguments evenhandedly. Explain your reasoning in 2-4 sentences and explicitly say that a final score follows. If there is no close benchmark match, say so plainly rather than fabricating false precision, and flag low confidence with the phrase "insufficient comparable data" when appropriate. ${sharedInstructions}`;
}
