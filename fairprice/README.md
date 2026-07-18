# Fair Price

Fair Price puts a product listing on trial. Three AI roles stream a sequential debate—Prosecutor, Defense, and Judge—then return a 0–100 price-reasonability score.

## Project structure

```text
fairprice/
├── api/                    # Vercel serverless API
│   ├── data/               # Curated comparison benchmarks
│   ├── lib/                # OpenAI client and prompt builders
│   └── trial.js            # SSE trial endpoint orchestration
├── frontend/               # React + Vite application
│   └── src/
│       ├── components/     # Interface components
│       ├── hooks/          # Streaming state management
│       └── assets/         # Static UI assets
├── server.js               # Local API development server only
├── vercel.json             # Production build configuration
└── .env.local.example      # Required environment variable template
```

## Requirements

- Node.js 20+
- An OpenAI API key with access to `gpt-4.1-mini`

## Local development

Install the API and web dependencies:

```sh
cd fairprice
npm install
npm --prefix frontend install
cp .env.local.example .env.local
```

Add your `OPENAI_API_KEY` to `.env.local`, then use two terminals:

```sh
npm run dev:api
```

```sh
npm run dev:web
```

The web app runs at `http://localhost:5173`; Vite proxies `/api` traffic to the local API at `http://127.0.0.1:3000`.

`GET /api/trial` is a lightweight health check for local and deployment monitoring.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev:api` | Start the local Express adapter for the serverless API |
| `npm run dev:web` | Start the Vite frontend |
| `npm run build` | Produce the production frontend bundle |
| `npm run lint` | Lint the frontend |
| `npm start` | Start the local API in production mode |

## API contract

`POST /api/trial` accepts:

```json
{ "product": "Wireless earbuds", "price": 2499, "sellerRating": 4.1 }
```

It responds as an SSE stream. Events arrive in this order: `case`, `prosecutor`, `prosecutor_done`, `defense`, `defense_done`, `judge`, `verdict`, and `done`. The `case` payload includes the closest benchmark and match confidence. The `verdict` payload includes `{ "score": number, "verdict": string, "label": string, "confidence": string }`.

The endpoint validates inputs, applies an in-memory per-client rate limit, times out and retries transient upstream calls, caches completed identical trials for five minutes, and uses a benchmark-based fallback if the structured verdict call fails.

## Deployment

Import the `fairprice` directory into Vercel. Configure `OPENAI_API_KEY` in the Vercel project environment variables; never commit it. Vercel serves `api/trial.js` as the serverless endpoint and publishes the Vite bundle from `frontend/dist`.
