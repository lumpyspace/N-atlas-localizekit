# N-ATLAS LocalizeKit

**Build for every Nigerian customer. Test before you launch.**

LocalizeKit is a developer tool for testing AI customer-support assistants built on **N-ATLAS** (`NCAIR1/N-ATLaS`), Nigeria's multilingual language model, before they reach real customers.

A developer configures a business's facts and response policy, then:

- sends customer messages in English, Nigerian Pidgin, Yoruba, Hausa or Igbo;
- sees the genuine N-ATLAS reply, the exact facts and prompt it was given, and automated checks on the reply;
- runs a repeatable suite of test cases;
- records human review;
- changes the configuration and reruns the same cases to compare.

> Built for the 2026 NCAIR/NITDA National AI Innovation Challenge (NAIC), Problem Statement 1: Developer Infrastructure.

The demonstration project is **AsoStyle Boutique**, a **fictional** Lagos clothing retailer. Its prices, address and phone number are invented sample data.

## Honesty rules

- **N-ATLAS is the only model.** Every reply in the UI comes from the configured N-ATLAS endpoint. There is no demo mode, scripted reply or substitute model. If N-ATLAS is unreachable, the UI says so.
- **A returned reply is not a correct reply.** Each result keeps three things separate:
  1. whether the request succeeded;
  2. automated checks, which are *heuristics*: keyword, number and substring tests;
  3. human review: a person marks the reply correct, incorrect or unsure.
- **No invented metrics.** No accuracy percentages or language-quality scores. Before/after comparisons show recorded replies only.
- **Language claims.** NCAIR lists English, Yoruba, Hausa and Igbo for N-ATLAS. Nigerian Pidgin is offered as a *test category* to measure how the model copes, not as claimed support. Non-English sample test messages are draft translations, not yet checked by native speakers, and are labelled that way.
- **Instructions are not guarantees.** The response policy lowers the risk of invented answers; it does not remove it. That is why replies are checked and reviewed.

## How it works

```
Browser (React)  ──►  LocalizeKit API (Express, serverless on Vercel)  ──►  N-ATLAS (vLLM on a Modal GPU)
                      • builds the system prompt:                            NCAIR1/N-ATLaS, unmodified
                        policy + numbered fact sheet + secret canary          OpenAI-compatible
                      • calls N-ATLAS server-side (key never in browser)      /v1/chat/completions
                      • runs heuristic checks on the reply
```

**Automated checks:**
- **Expected fact present.** The configured fee, hours or return window appears in the reply. Expected values are read from the *current* configuration, so editing a fee changes what the check looks for.
- **No unsupported naira amount.** Every ₦ amount in the reply must exist in the facts.
- **Delivery fees match their zone.** A sentence naming one delivery zone may only quote that zone's fee. This catches "Port Harcourt costs ₦5,500" when ₦5,500 is Abuja's fee, a failure found in live testing.
- **Reply language and citations.** The reply should be in the customer's language (Yoruba, Hausa and Igbo are detected; Pidgin vs English needs a person), and cited fact numbers must exist.
- **No hidden-instruction leak.** A secret canary code is planted in the system prompt; if it appears in a reply, the prompt leaked.
- **Injected instruction not obeyed.** A sentinel word in an injection attempt must not appear in the reply.
- **Behaviour checks:** defers when the answer is unknown, points to a human, asks a clarifying question, declines unsafe requests, makes no invented order-status or refund claims.

**Test suite (16 cases):**
- business facts;
- the same question in English, Pidgin and Hausa;
- the same question in English and Yoruba;
- questions with no answer in the facts;
- an ambiguous question;
- escalation;
- prompt injection;
- prompt extraction;
- a request for another customer's data.

## Ship it: the website starter kit

The **Export** screen downloads a ready-to-run kit for the assistant you tested:
- `server.mjs`: a zero-dependency Node server that sends the **same** prompt to *your own* N-ATLAS endpoint. A test checks it matches the prompt LocalizeKit tests.
- **Output guardrails:** block leaked hidden instructions; block naira amounts not in the facts; block replies that echo an injected instruction back to the customer; strip `[F12]` citations.
- `widget.js`: a one-line chat bubble for any website, with a CORS allow-list, rate limiting and input limits.
- A demo page, your facts and policy, the Modal script to host N-ATLAS, and a README.

It was tested end to end against the hosted N-ATLAS, including a follow-up question that relied on conversation history. WhatsApp is on the roadmap, not in the kit.

Architecture and API details: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). How N-ATLAS is accessed and served: [`docs/N-ATLAS-INTEGRATION.md`](docs/N-ATLAS-INTEGRATION.md).

## Run locally

You need an OpenAI-compatible N-ATLAS endpoint. Use the hosted GPU endpoint ([`inference/modal_natlas.py`](inference/modal_natlas.py)), or local Ollama on CPU ([`inference/README.md`](inference/README.md)). Ollama works but is slow: minutes per reply with the full fact sheet.

```bash
cd backend
cp .env.example .env      # PowerShell: Copy-Item .env.example .env, then fill in NATLAS_* values
npm install
npm run dev               # http://localhost:8788
```

```bash
cd frontend
npm install
npm run dev               # http://localhost:5174 (proxies /api to the backend)
```

Tests: `cd backend && npm test`.

## Deploy (Vercel)

`vercel.json` runs `scripts/build-vercel.mjs`. It builds the frontend and bundles the API into one serverless function using Vercel's Build Output API.

Set these environment variables in the Vercel project. They are server-side only, so never prefix them with `VITE_`:

| Variable | Example |
|---|---|
| `NATLAS_ENDPOINT` | `https://<workspace>--localizekit-natlas-serve.modal.run/v1` |
| `NATLAS_API_KEY` | the key stored in the Modal secret `localizekit-natlas` |
| `NATLAS_MODEL` | `NCAIR1/N-ATLaS` |
| `NATLAS_REQUEST_TIMEOUT_MS` | `280000` |
| `RATE_LIMIT_PER_WINDOW` (optional) | `40` model calls per client per 10 minutes |

## Repository layout

```
frontend/   React + Vite + Tailwind: Overview, Playground, Test suite, Business & policy, Export
            src/starter/: the exported website kit (server, guardrails, widget)
backend/    Express + TypeScript: src/localize/ (facts, policy, cases, checks, service), src/providers/ (N-ATLAS client)
inference/  Serving N-ATLAS: Modal + vLLM (hosted GPU) and Ollama (local CPU)
scripts/    Vercel build
tests/      Node test runner
docs/       Architecture and N-ATLAS integration notes
```

LocalizeKit started as a copy of N-ATLAS Launchpad. See [`COPIED_FROM.md`](COPIED_FROM.md).

## Licence notes

N-ATLaS weights are gated on Hugging Face under NCAIR's licence. Accept it on the model page; it restricts commercial use and scale. Weights are never committed to this repository.
