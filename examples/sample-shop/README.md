# Sample shop: the exported kit, live

**Live:** https://asostyle-sample-shop.vercel.app

This is a **fictional** AsoStyle Boutique storefront. It runs the website starter kit that LocalizeKit's Export screen produces, **unchanged**: `frontend/src/starter/server.mjs`, `core.mjs` and `widget.js` are copied verbatim by `build.mjs`. That makes it a working example of "test in LocalizeKit, export, put it on a website".

- `business.json` and `policy.md` are LocalizeKit's sample configuration (v1). A test keeps them in sync.
- The page's delivery table, hours and contact details are generated from the same `business.json` the assistant answers from.
- `/api/chat` runs as a Vercel function. N-ATLAS is called server-side; the key is a Vercel environment variable.

## Deploy

```bash
node build.mjs                                    # writes .vercel/output
vercel deploy --prebuilt --prod                   # first time: vercel link
```

Environment variables (Production):
- `NATLAS_ENDPOINT`
- `NATLAS_API_KEY`
- `NATLAS_MODEL=NCAIR1/N-ATLaS`
- `NATLAS_TIMEOUT_MS=280000`
- `RATE_LIMIT_PER_MINUTE=10`
