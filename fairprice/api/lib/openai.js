const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-4.1-mini";

async function createChatCompletion({ messages, stream }) {
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

/** Stream a chat completion and return the complete generated text. */
export async function streamAgent({ systemPrompt, userPrompt, onChunk }) {
  const response = await createChatCompletion({
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

export async function createVerdict(judgeText) {
  const response = await createChatCompletion({
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
