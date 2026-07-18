import { benchmarks } from "../src/data/benchmarks.js";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-4.1-mini";

function writeEvent(res, event, data) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function productContext(product, price, sellerRating) {
  return `Product: ${product}\nListed price: INR ${price}\nSeller rating: ${sellerRating ?? "unknown"}`;
}

async function openAIChat({ messages, stream }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: MODEL, messages, stream, temperature: stream ? 0.7 : 0 }),
  });

  if (!response.ok) throw new Error(`OpenAI request failed (${response.status})`);
  return response;
}

// Streams OpenAI's SSE response, forwarding each content delta and retaining its full text.
async function streamAgent({ systemPrompt, userPrompt, onChunk }) {
  const response = await openAIChat({
    stream: true,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  if (!response.body) throw new Error("OpenAI returned no stream");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";

  const processEvent = (rawEvent) => {
    const data = rawEvent
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");

    if (!data || data === "[DONE]") return;
    const chunk = JSON.parse(data);
    const text = chunk.choices?.[0]?.delta?.content;
    if (typeof text === "string" && text) {
      fullText += text;
      onChunk(text);
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done }).replace(/\r\n/g, "\n");

    let boundary;
    while ((boundary = buffer.indexOf("\n\n")) !== -1) {
      processEvent(buffer.slice(0, boundary));
      buffer = buffer.slice(boundary + 2);
    }

    if (done) break;
  }

  if (buffer.trim()) processEvent(buffer);
  return fullText;
}

async function createVerdict(judgeText) {
  const response = await openAIChat({
    stream: false,
    messages: [
      {
        role: "system",
        content: "You convert judicial reasoning into a concise price-reasonability verdict.",
      },
      {
        role: "user",
        content: `Return ONLY valid JSON, no markdown, no explanation.\nSchema: {"score": number, "verdict": string}\nscore: 0-100 integer, reasonability of the price.\nverdict: one sentence, under 15 words, plain language.\nBase this strictly on the following judge reasoning, do not re-argue the case:\n\n${judgeText}`,
      },
    ],
  });

  const body = await response.json();
  const content = body.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("OpenAI returned no verdict content");

  const parsed = JSON.parse(content);
  const rawScore = Number(parsed.score);
  if (!Number.isFinite(rawScore)) throw new Error("Invalid verdict score");

  const score = Math.min(100, Math.max(0, Math.round(rawScore)));
  const verdict = String(parsed.verdict ?? "")
    .trim()
    .split(/\s+/)
    .slice(0, 14)
    .join(" ");
  if (!verdict) throw new Error("Invalid verdict text");

  return { score, verdict };
}

export default async function handler(req, res) {
  try {
    const { product, price, sellerRating: requestedSellerRating } = req.body || {};
    if (typeof product !== "string" || !product.trim() || typeof price !== "number" || !Number.isFinite(price)) {
      return res.status(400).json({ error: "Missing product or price" });
    }

    const sellerRating =
      typeof requestedSellerRating === "number" && Number.isFinite(requestedSellerRating)
        ? requestedSellerRating
        : null;
    const benchmarkContext = JSON.stringify(benchmarks);
    const caseContext = productContext(product.trim(), price, sellerRating);
    const sharedInstructions = `Use these reference benchmarks as context; they are not live market data:\n${benchmarkContext}\n\nFor unfamiliar, nonsensical, or poorly matched products, use only the closest relevant benchmark or general reasoning. Do not invent precise comparisons; explicitly acknowledge insufficient comparable data when appropriate.`;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const prosecutorText = await streamAgent({
      systemPrompt: `You are the Prosecutor in a fair-price hearing. Argue that the listed price is too high. Reference specific numbers from the benchmark context where relevant. Write 3-5 sentences in a confident, non-hostile tone. ${sharedInstructions}`,
      userPrompt: caseContext,
      onChunk: (chunk) => writeEvent(res, "prosecutor", { chunk }),
    });
    writeEvent(res, "prosecutor_done", {});

    const defenseText = await streamAgent({
      systemPrompt: `You are the Defense in a fair-price hearing. Argue that the listed price is justified, citing quality signals, seller rating, or market conditions from the benchmark context. Explicitly respond to the Prosecutor's actual argument and concede valid points where appropriate. Write 3-5 sentences. ${sharedInstructions}`,
      userPrompt: `${caseContext}\n\nProsecutor's completed argument:\n${prosecutorText}`,
      onChunk: (chunk) => writeEvent(res, "defense", { chunk }),
    });
    writeEvent(res, "defense_done", {});

    const judgeText = await streamAgent({
      systemPrompt: `You are the Judge in a fair-price hearing. Weigh both arguments evenhandedly. Explain your reasoning in 2-4 sentences and explicitly say that a final score follows. If there is no close benchmark match, say so plainly rather than fabricating false precision, and flag low confidence with the phrase "insufficient comparable data" when appropriate. ${sharedInstructions}`,
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
