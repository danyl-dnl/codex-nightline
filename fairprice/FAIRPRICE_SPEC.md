# Fair Price — Full Build Spec

## What to build

**Fair Price** — paste a product and its asking price, and a live "courtroom"
of three chained AI agents argues whether it's fair, streaming token-by-token
in real time: Prosecutor (price too high) → Defense (price justified) → Judge
(final Reasonability Score + one-line verdict). A "Prove It" mode lets anyone
type their own live case with no pre-loaded script, proving the system is real.

Pitch line: *"Don't take our word for it that the price is fair — put it on
trial. Type your own case in right now."*

---

## Tech stack

- **Frontend:** React + Vite, Tailwind CSS
- **AI:** OpenAI API, model `gpt-4.1-mini` — cheap and fast, correct choice
  given a fixed $ budget and a live-streaming demo where latency matters
- **Backend:** One Vercel serverless function, streaming via Server-Sent
  Events (SSE), API key stays server-side only
- **Deployment:** Vercel

**Cost note:** with `gpt-4.1-mini` and short prompts, a full 3-agent run costs
a fraction of a cent. Set a hard spend cap in the OpenAI dashboard (Settings →
Limits) around $10–15 as insurance against a bug looping calls — don't rely
on manual attention alone during a hackathon.

---

## Architecture: strict sequential streaming

Agents run **in order, not concurrently**: Prosecutor fully argues, then
Defense responds (and can reference what Prosecutor said), then Judge weighs
both. This is both narratively correct (a real courtroom works this way) and
technically simpler than interleaving two concurrent streams into two UI
bubbles at once.

All three run inside **one** serverless function call over **one** SSE
connection, so the frontend never needs to sequence multiple fetches or
sync ordering itself — the backend guarantees ordering, the frontend just
listens.

---

## Folder structure

```
fairprice/
  api/
    trial.js               # single SSE streaming endpoint, runs all 3 agents in order
  src/
    data/
      benchmarks.js          # 15-20 hardcoded product/price/rating dataset
    components/
      CaseInput.jsx
      Courtroom.jsx           # renders the 3 bubbles + verdict banner, consumes the stream
      ProveIt.jsx
    App.jsx
    main.jsx
    index.css
  .env.local                 # OPENAI_API_KEY=sk-... (gitignored)
  .gitignore
  package.json
  vite.config.js
  tailwind.config.js
```

---

## 1. Benchmark dataset (`src/data/benchmarks.js`)

15–20 hardcoded products judges can reasonably recognize. Each entry:

```js
export const benchmarks = [
  {
    category: "wireless earbuds",
    typicalPriceRange: [1200, 3500],   // INR
    avgRating: 4.0,
    notes: "Budget-to-mid tier includes ANC at the top end of this range"
  },
  // ...14-19 more, spanning a few categories:
  // electronics, home goods, freelance services (e.g. "logo design"),
  // secondhand/resale items, so the courtroom has range to work with
];
```

This is **context fed into the LLM prompts**, not something the LLM looks up
live — it goes straight into the Prosecutor/Defense prompt text as a small
reference table. If the judge types a product with no matching category,
agents should reason from the closest category or general market knowledge,
and say so ("no exact benchmark, reasoning from comparable products") rather
than fail.

---

## 2. Streaming API route (`api/trial.js`)

**This is the core engineering piece.** One POST endpoint, Server-Sent Events
response, three sequential OpenAI streaming calls piped through in order.

**Contract:**

Request: `POST /api/trial`
```json
{ "product": "Wireless earbuds", "price": 2499, "sellerRating": 4.1 }
```
`sellerRating` is optional — omit or `null` if not provided.

Response: `text/event-stream`. Each SSE event has a `event:` field naming
which speaker it belongs to, and `data:` containing either a text token chunk
or a control payload. Exact event types:

```
event: prosecutor
data: {"chunk": "This price is "}

event: prosecutor
data: {"chunk": "significantly above "}

...(more prosecutor chunks)...

event: prosecutor_done
data: {}

event: defense
data: {"chunk": "While the benchmark "}

...(more defense chunks)...

event: defense_done
data: {}

event: judge
data: {"chunk": "Weighing both sides, "}

...(more judge chunks)...

event: verdict
data: {"score": 62, "verdict": "Slightly overpriced, but within reason given seller rating."}

event: done
data: {}
```

The `verdict` event is separate from the `judge` streaming text — the judge
streams natural-language reasoning as flowing text like the other two agents,
but at the end emits one final structured event with a clean numeric score
(0–100 scale) and a one-line verdict string, so the frontend can render the
big banner without having to parse it out of prose.

**Implementation approach:**

```js
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { product, price, sellerRating } = req.body;
  if (!product || price == null) {
    return res.status(400).json({ error: "Missing product or price" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const benchmarkContext = JSON.stringify(benchmarks); // imported at top

  try {
    // --- PROSECUTOR ---
    const prosecutorText = await streamAgent({
      systemPrompt: PROSECUTOR_PROMPT(benchmarkContext),
      userPrompt: `Product: ${product}, Price: ₹${price}, Seller rating: ${sellerRating ?? "unknown"}`,
      onChunk: (chunk) => send("prosecutor", { chunk }),
    });
    send("prosecutor_done", {});

    // --- DEFENSE (sees Prosecutor's argument) ---
    const defenseText = await streamAgent({
      systemPrompt: DEFENSE_PROMPT(benchmarkContext),
      userPrompt: `Product: ${product}, Price: ₹${price}, Seller rating: ${sellerRating ?? "unknown"}\n\nProsecutor argued:\n${prosecutorText}`,
      onChunk: (chunk) => send("defense", { chunk }),
    });
    send("defense_done", {});

    // --- JUDGE (sees both) ---
    let judgeText = "";
    await streamAgent({
      systemPrompt: JUDGE_PROMPT(benchmarkContext),
      userPrompt: `Product: ${product}, Price: ₹${price}, Seller rating: ${sellerRating ?? "unknown"}\n\nProsecutor:\n${prosecutorText}\n\nDefense:\n${defenseText}`,
      onChunk: (chunk) => { judgeText += chunk; send("judge", { chunk }); },
    });

    // Ask the judge to close with a final structured line, parsed out here.
    // Simplest robust approach: a SEPARATE short non-streaming call asking
    // ONLY for {"score": number, "verdict": string} JSON, after the judge's
    // prose has streamed — avoids fragile mid-stream JSON parsing.
    const verdict = await getStructuredVerdict(judgeText, product, price);
    send("verdict", verdict);

    send("done", {});
    res.end();
  } catch (err) {
    console.error("trial.js error:", err.message);
    send("error", { message: "The court hit a snag. Try again." });
    res.end();
  }
}
```

**Why the verdict is a separate final call, not parsed mid-stream:** asking a
model to stream flowing prose AND emit valid structured JSON in the same
generation is fragile — you'd be regex-parsing partial JSON out of a token
stream live, which breaks easily under demo pressure. Instead: let the judge
speak naturally (good for the UI bubble), then make one small fast
non-streaming call that reads the judge's own reasoning and asks only for
`{"score": number, "verdict": string}`. This is a few hundred extra ms, which
is invisible after 3 agents have already been streaming for several seconds.

**Prompt content guidance (fill in `PROSECUTOR_PROMPT`, `DEFENSE_PROMPT`,
`JUDGE_PROMPT` as functions returning system prompt strings):**

- **Prosecutor:** given the benchmark context, argue the price is too high.
  Reference specific numbers from the benchmark data when relevant. Keep it
  to 3-5 sentences — long monologues kill demo pacing. Tone: confident,
  slightly adversarial, not hostile.
- **Defense:** given the same benchmark context AND the Prosecutor's actual
  argument, respond directly to it — concede fair points if the Prosecutor
  raised something valid, but argue for justification via seller rating,
  quality signals, or market conditions. Also 3-5 sentences.
- **Judge:** given both arguments, weigh them evenhandedly, explain the
  reasoning in 2-4 sentences, and explicitly state that a final score
  will follow. Must handle the no-benchmark-match case explicitly: if the
  product has no close category match, say so plainly rather than inventing
  false precision.
- **Structured verdict call:** short system prompt, temperature 0, strict:
  "Return ONLY JSON: {"score": number 0-100, "verdict": string under 15
  words}. Base this strictly on the judge's reasoning below, do not
  re-argue." Include the judge's full text as input.

**Streaming helper (`streamAgent`)** wraps the OpenAI streaming chat
completions call (`stream: true`), iterates the SSE chunks OpenAI itself
sends back, extracts `delta.content` from each, calls `onChunk` per token/
chunk, and returns the full accumulated text at the end for the next agent
to reference.

**Fallback behavior:** if the OpenAI call fails at any stage, send an `error`
event with a plain message and end the stream cleanly — never leave the
connection hanging or the frontend spinning forever. Given you're not
relying on a cheap fallback score here (unlike RetroGrade's weight fallback),
a clear "the court hit a snag, try again" message is the right move — retrying
the whole request is cheap and fast at this token count.

---

## 3. Frontend

### `CaseInput.jsx`
- Text input for product name, number input for price, optional number input
  for seller rating (1.0–5.0).
- "Put It on Trial" button.
- On submit, opens an `EventSource`-style connection to `/api/trial` (note:
  `EventSource` only supports GET natively — since this is a POST with a
  body, use `fetch` with a `ReadableStream` reader instead, manually parsing
  the `event:`/`data:` SSE format from the response body chunks).

### `Courtroom.jsx`
- Three bubbles: Prosecutor (left, red/warm accent), Defense (right, blue/cool
  accent), Judge (center, neutral, appears after both finish).
- Each bubble fills in incrementally as `prosecutor`/`defense`/`judge` chunk
  events arrive — literally append each chunk's text to that bubble's
  content as it streams, no batching, so it visibly types out live.
- Show a subtle "speaking" indicator on the active bubble (e.g. pulsing dot)
  while its chunks are still arriving, cleared on that speaker's `_done` event.
- After `verdict` event arrives, show a large banner below the three bubbles:
  the numeric score (styled prominently — big number, maybe a simple colored
  gauge/bar for 0-100) and the one-line verdict text.
- On an `error` event, show a clear inline message and reset to allow retry.

### `ProveIt.jsx`
- Visually distinguished from the initial preloaded-case flow (e.g. a
  slightly different border/label like "Live Mode") so it's clear to an
  audience this is the unscripted portion.
- Same input shape as `CaseInput.jsx`, feeds the same `/api/trial` endpoint —
  no special backend handling needed, "Prove It" is a frontend framing
  choice, not a different code path.

### `App.jsx`
- Holds one preloaded example case as a "Run Demo Case" button (e.g. the
  wireless earbuds example from the pitch) for the opening beat of the demo.
- Below that, the `ProveIt` free-input section for the live audience-input beat.
- Single page, no router.

---

## Demo flow

1. Click "Run Demo Case" (preloaded: wireless earbuds, ₹2,499, rating 4.1) —
   court plays out live, ends in a score + verdict.
2. Hand the keyboard to a judge: "Type any product and price you think is sketchy."
3. Same court runs on their real input, live, unscripted.
4. Close: *"Don't take our word for it that the price is fair — put it on
   trial. Type your own case in right now."*

---

## Key target — demo success checklist

- [ ] Preloaded case runs end-to-end: all 3 bubbles stream, verdict banner appears
- [ ] Prove It mode accepts arbitrary judge-typed input and completes without crashing
- [ ] Tested against at least 2 deliberately weird/adversarial inputs (nonsense
      product, absurd price) — agents still produce coherent output or the
      Judge explicitly notes insufficient data, never a raw crash
- [ ] Streaming is visibly incremental (text appears token-by-token, not as
      one dumped block) — this is the entire point of choosing streaming,
      confirm it actually reads as "live" and not just "eventually appears"
- [ ] Verdict score is consistently 0-100 with a one-line string, every run
- [ ] OpenAI failure mid-run shows a clear error, not a hung UI
- [ ] Deployed on Vercel, key not exposed in browser devtools
- [ ] OpenAI spend cap set in dashboard before demo day

---

## 2-hour build plan

| Time | Task |
|---|---|
| 0:00–0:15 | Benchmark dataset (`benchmarks.js`) |
| 0:15–0:45 | `api/trial.js` — streaming route, all 3 agents chained, verdict call |
| 0:45–1:05 | `CaseInput.jsx` + SSE-consuming fetch logic in `Courtroom.jsx` |
| 1:05–1:30 | Courtroom UI — bubbles, streaming text render, verdict banner |
| 1:30–1:45 | `ProveIt.jsx` + wiring into `App.jsx` |
| 1:45–2:00 | Test weird inputs, rehearse the handoff moment, deploy |
