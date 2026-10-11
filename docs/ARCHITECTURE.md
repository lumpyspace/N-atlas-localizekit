# Architecture

LocalizeKit has three parts. The browser never contacts N-ATLAS and never sees a credential.

```
┌─────────────────────────────┐   /api (same origin)   ┌──────────────────────────────┐   HTTPS + Bearer key   ┌───────────────────────────┐
│ Frontend (React/Vite)       │ ─────────────────────► │ API (Express, Vercel func)   │ ─────────────────────► │ N-ATLAS on Modal GPU      │
│ Overview · Playground ·     │                        │ validate input, rate limit   │                        │ vLLM serving the          │
│ Test suite · Business &     │ ◄───────────────────── │ build prompt (facts+canary)  │ ◄───────────────────── │ unmodified NCAIR1/N-ATLaS │
│ policy · Export             │   reply + checks       │ call N-ATLAS, run checks     │   chat completion      │ (/v1/chat/completions)    │
│ state in localStorage       │                        │                              │                        │ scales to zero when idle  │
└─────────────────────────────┘                        └──────────────────────────────┘                        └───────────────────────────┘
```

## Request flow (`POST /api/ask` and `POST /api/run-case`)

1. **Validate.**
   - The message must be 1–1,000 characters.
   - The language must be one of `en`, `yo`, `ha`, `ig`, `pid`.
   - The business configuration must have the right shape and be at most 20 KB.
   - The policy must be at most 4,000 characters.
   - Requests to this API must be at most 64 KB.
2. **Rate limit.** 40 model calls per client per 10 minutes by default, kept in memory per server instance.
3. **Build the system prompt** (`backend/src/localize/policy.ts`). It contains:
   - the policy rules;
   - the business configuration, flattened into numbered facts (`[F1]`…`[F30]`);
   - a secret canary code.

   The whole fact sheet is always sent; it's about 30 short facts. Keyword retrieval (`matchFacts`) only *highlights* likely-relevant facts for the developer. It's English-keyword based and weak for Yoruba, Hausa and Igbo, and the UI says so.
4. **Call N-ATLAS** (`backend/src/providers/HttpNAtlasProvider.ts`) with temperature 0.2 and at most 320 reply tokens.
5. **Check the reply** (`backend/src/localize/checks.ts`):
   - case-specific checks;
   - two baseline checks on every reply (no unsupported naira amount; no hidden-instruction leak).
6. **Verdict.**
   - `request-failed`: no reply came back.
   - `failed-check`: a heuristic check failed.
   - `passed-checks`: every heuristic check passed.
   - `needs-review`: there are no case-specific checks.

   Human review is stored separately, in the browser.

## API

| Method | Path | Purpose | Calls N-ATLAS |
|---|---|---|---|
| GET | `/api/status` | Is an endpoint configured? | no |
| POST | `/api/status/check` | One-word test request | yes |
| GET | `/api/sample` | Sample business, policy, test cases, languages | no |
| POST | `/api/ask` | `{ message, language, business?, policy? }` | yes |
| POST | `/api/run-case` | `{ case: { message, language, checks }, business?, policy? }` | yes |

**Error handling.** Errors come back as `{ error }` with status 400, 413, 429 or 500. Model failures return `ok: false` with an actionable message: missing endpoint, rejected credentials, timeout or cold start, or unreachable. Upstream response bodies and keys are never forwarded. The logger redacts bearer tokens and `hf_` tokens.

## Security choices

- Credentials live only in server environment variables. `VITE_` variables are not used, and the build output is scanned for the key during release checks.
- Same-origin API, so no CORS is enabled.
- Security headers on all responses. Static pages also get a strict Content-Security-Policy.
- Launchpad's runtime "switch endpoint" route was removed, so visitors cannot point the server at arbitrary URLs.
- Prompt-injection and extraction resistance is *measured* by test cases (canary and sentinel), not assumed.

## Why these choices

- **Self-hosted N-ATLAS on Modal.** No public N-ATLAS API key is available to applicants: NAIC lists credentials as a benefit for shortlisted teams. So we serve the official gated weights with vLLM on a 24 GB GPU (L4). See [`N-ATLAS-INTEGRATION.md`](N-ATLAS-INTEGRATION.md).
- **Whole fact sheet in context, not a vector database.** A small business fits easily in N-ATLAS's 8k context. It's simpler and fully inspectable, and not dependent on English keywords for non-English questions.
- **Heuristic checks, not an LLM judge.** Deterministic, explainable and free. Their limits are stated in the UI.
- **Browser storage for runs and reviews.** No accounts or database are needed for the MVP. Results are exported as JSON for evidence.
- **One Express app for local and Vercel** (`backend/src/app.ts`), bundled by esbuild for Vercel. What is tested locally is what runs in production.
