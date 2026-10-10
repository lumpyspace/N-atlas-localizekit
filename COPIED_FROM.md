# Provenance: N-ATLAS LocalizeKit

N-ATLAS LocalizeKit started as an independent copy of N-ATLAS Launchpad.

| | |
|---|---|
| Copied on | 2026-10-11 |
| Source path | `C:\Users\ameer\n-atlas-forge` |
| Source remote | `https://github.com/lumpyspace/N-atlas-launchpad.git` |
| Source branch | `master` |
| Source commit | `8ba443e6b7ef136bb7b66efd74676eff6ec70c87` ("feat: secure by default; exports are apps you can open") |
| Method | `git clone --no-hardlinks` from the local path, then `git remote remove origin` |

## What was copied

All 146 Git-tracked files at the source commit, plus the full commit history.

## What was not copied

Gitignored or untracked items in the Launchpad folder were left behind:

- `backend/.env` (local config). `backend/.env` here is a fresh copy of `backend/.env.example`.
- `node_modules/`, `frontend/node_modules/`, `backend/node_modules/` (run `npm install` again)
- `frontend/dist/`, `frontend/tsconfig.tsbuildinfo` (build output)
- `*.log` files
- `pw-*.mjs`, root `package.json` / `package-lock.json`, `screenshots/` (local Playwright checks)
- `inference/Modelfile.local`
- `scripts/.translate-cache/`
- `.claude/settings.local.json`

## Independence

- This copy has no Git remote. A new GitHub repository will be added as `origin` separately.
- No deployment configuration existed in the source.
- Launchpad uses ports 8787 (backend) and 5173 (frontend). LocalizeKit uses 8788 and 5174, so both can run at once.
- Launchpad branding remains in the source and has not been renamed yet.
