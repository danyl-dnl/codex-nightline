const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const RESPONSES_URL = "https://api.openai.com/v1/responses";
const MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const REQUEST_TIMEOUT_MS = Number(process.env.OPENAI_TIMEOUT_MS) || 25_000;

async function createChatCompletion({ messages, stream, signal, maxTokens }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

  let lastError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const abortFromCaller = () => controller.abort();
    signal?.addEventListener("abort", abortFromCaller, { once: true });
    try {
      const response = await fetch(OPENAI_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: MODEL, messages, stream, temperature: stream ? 0.7 : 0, max_tokens: maxTokens }),
        signal: controller.signal,
      });
      if (response.ok) return response;
      lastError = new Error(`OpenAI request failed (${response.status})`);
      if (response.status < 500 && response.status !== 429) throw lastError;
    } catch (error) {
      lastError = error;
      if (signal?.aborted) throw error;
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", abortFromCaller);
    }
  }
  throw lastError || new Error("OpenAI request failed");
}

/** Stream a chat completion and return the complete generated text. */
export async function streamAgent({ systemPrompt, userPrompt, onChunk, signal }) {
  const response = await createChatCompletion({
    stream: true,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    signal,
    maxTokens: 320,
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

export async function researchComparables({ product, signal }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
  const response = await fetch(RESPONSES_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_RESEARCH_MODEL || "gpt-5.4",
      tools: [{ type: "web_search" }],
      tool_choice: "required",
      max_output_tokens: 300,
      input: `Research current Indian-market price comparables for this exact product: ${product}. Do not substitute another model, generation, or variant. Return ONLY JSON: {"category":"exact comparable description","typicalPriceRange":[lowINR,highINR],"notes":"brief evidence-based qualification"}. Use a range only when at least two close public comparables support it; otherwise return {"category":"","typicalPriceRange":null,"notes":"insufficient comparable data"}.`,
    }),
    signal,
  });
  if (!response.ok) throw new Error(`Live research failed (${response.status})`);
  const body = await response.json();
  const content = body.output?.find((item) => item.type === "message")?.content?.find((item) => item.type === "output_text");
  const text = content?.text;
  const json = typeof text === "string" ? text.match(/\{[\s\S]*\}/)?.[0] : null;
  const parsed = json ? JSON.parse(json) : null;
  const range = parsed?.typicalPriceRange;
  const sources = (content?.annotations || []).filter((item) => item.type === "url_citation").map((item) => ({ title: item.title, url: item.url }));
  if (!Array.isArray(range) || range.length !== 2 || !range.every((value) => Number.isFinite(Number(value))) || Number(range[0]) >= Number(range[1]) || sources.length < 2) return null;
  return { benchmark: { category: String(parsed.category || product), typicalPriceRange: range.map(Number), avgRating: null, notes: String(parsed.notes || "Live public comparables") }, sources };
}
