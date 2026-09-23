# FDS STORY BOOK DISCOVERY

Verified with legitimate HTTP Basic Auth (2026-09-23).

## Framework

**Storybook 8.2.9** static build (`@storybook/react-vite`, builder Vite).

- Bukan REST CMS custom — ini deployment **Storybook design system** (FUNDS-WEB / Amartha UI).
- Judul halaman: `storybook - Storybook`.

## Authentication

| Layer | Mekanisme |
|--------|-----------|
| Edge (Vercel) | **HTTP Basic Auth** — `Authorization: Basic base64(user:pass)` |
| App Storybook | Tidak ada login terpisah setelah Basic Auth |

## Authentication flow

1. Setiap request ke host memakai header Basic Auth.
2. MCP `STORYBOOK_AUTH_TYPE=basic` + username/password.
3. Tidak ada refresh token; rotasi password lewat Vercel jika perlu.

## Session

Stateless per request (Basic Auth).

## API endpoints (data)

Tidak ada `/api/stories`. Sumber data Storybook static:

| Path | Status | Isi |
|------|--------|-----|
| `/index.json` | 200 | Indeks 232 entry (47 docs MDX, 185 story CSF) |
| `/project.json` | 200 | Metadata build Storybook |
| `/iframe.html` | 200 | Preview shell + referensi bundle iframe |
| `/assets/iframe-*.js` | 200 | Peta `importPath` → chunk MDX/stories |
| `/assets/<chunk>.js` | 200 | Konten MDX/story ter-compile |

## Story endpoint

Logical story id = **`entries[id]`** dari `/index.json` (contoh: `welcome-introduction--overview`).

## Search

Tidak ada endpoint search server-side. MCP melakukan pencarian di metadata + teks hasil ekstraksi chunk (docs di-prioritaskan).

## Story schema (index entry)

```json
{
  "id": "welcome-introduction--overview",
  "title": "Welcome/Introduction",
  "name": "Overview",
  "importPath": "./src/welcome/introduction.mdx",
  "type": "docs",
  "tags": ["dev", "test", "unattached-mdx"]
}
```

Story CSF tambahan field `componentPath`, `type: "story"`.

## Section schema

Section di MCP = heading **h2** hasil parse chunk MDX (`id` + `title`) atau fallback `content`.

## Pagination

`list_stories` memakai `limit` / `offset` di atas daftar `index.json` (client-side).

## Required headers

- `Authorization: Basic …`

## Required cookies

Tidak ada.

## Token/session expiration

N/A (Basic Auth).

## Refresh mechanism

N/A.

## MCP configuration

```env
STORYBOOK_BASE_URL=https://amt-fds-prod.vercel.app
STORYBOOK_AUTH_TYPE=basic
STORYBOOK_BASIC_AUTH_USERNAME=...
STORYBOOK_BASIC_AUTH_PASSWORD=...
STORYBOOK_DATA_SOURCE=auto
```

`auto` mendeteksi `/index.json` v5 dan memakai adapter Storybook static.
