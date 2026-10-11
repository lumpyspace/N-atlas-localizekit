# Tests

```bash
cd backend
npm install
npm test
```

- `localize.test.ts`: the fact sheet, naira-amount extraction, every automated check (pass and fail cases), prompt building and canary masking, input validation, the rate limiter, and `ask()` using a fake provider. That covers success, needs-review and request-failed.
- `providers.test.ts`: the HTTP N-ATLAS provider against a local fake OpenAI-compatible server (request shape, auth header, errors, timeouts, streaming).

The fake providers exist only in tests. The app has no mock or demo mode: every reply shown in the UI comes from the configured N-ATLAS endpoint.
