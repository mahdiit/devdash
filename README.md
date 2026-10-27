# DevDash

Daily dashboard for a self-hosted **GitLab** (review requests, MRs, todos) and **Jira** (tasks), with quick actions. Available in English and Persian (فارسی).

Two ways to run it, same UI:

| | Folder | Needs |
|---|---|---|
| Chrome extension (MV3) | `devdash-extension/` | Chrome/Edge |
| Local web app | `local-run/` | Node 18+ |

## Chrome extension

1. Open `chrome://extensions`, enable **Developer mode**.
2. **Load unpacked** → select `devdash-extension/`.
3. The settings page opens on first install. Enter the GitLab/Jira URLs, usernames and tokens, then press **Test**. Chrome will ask permission for each host.
4. Click the toolbar icon to open the dashboard.

Settings (language, refresh interval, queries) are stored in `chrome.storage.local`.

## Local web app

```bash
cd local-run
cp config.example.json config.json   # then edit it
node server.js            # or: node server.js path/to/config.json
```

Open http://localhost:8787. `config.json` is re-read on every request, so edits apply without a restart.

Config keys:

- `port`, `verify_ssl` (set `false` for self-signed certificates)
- `gitlab`: `url`, `token` (personal access token), `username`, `queries`
- `jira`: `url`, `auth` (`bearer` or `basic`), `token`, `username`, `api`, `queries`

**Never commit real tokens.** `config.json` is gitignored; copy `config.example.json` to create it.

## Queries

- GitLab queries are API paths. Placeholders: `{user}`, `{since24h}`.
- Jira queries are JQL strings.

Add, remove or rename them in settings (extension) or `config.json` (local app).
