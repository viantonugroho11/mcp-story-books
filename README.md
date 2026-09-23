# fds-storybook-mcp

MCP server **read-only** untuk Story Book FDS di `https://amt-fds-prod.vercel.app/`.

Membaca dan mencari konten **Storybook 8 static** (FUNDS-WEB design system) memakai autentikasi sah yang **Anda** konfigurasi (tanpa bypass MFA/SSO/CAPTCHA).

Data diambil dari `/index.json` + chunk MDX/stories di `/assets/*` (bukan REST `/api/stories`).

## Autentikasi

Saat ini deployment memakai **HTTP Basic Auth** (Vercel). Lihat [DISCOVERY.md](./DISCOVERY.md).

```env
STORYBOOK_BASE_URL=https://amt-fds-prod.vercel.app
STORYBOOK_AUTH_TYPE=basic
STORYBOOK_BASIC_AUTH_USERNAME=
STORYBOOK_BASIC_AUTH_PASSWORD=
```

Setelah login edge berhasil, jalankan discovery API:

```bash
npm run discover
export STORYBOOK_DISCOVERY_PATH=./discovery-output.json
```

Override manual endpoint (hanya jika sudah diverifikasi):

```env
STORYBOOK_API_LIST_STORIES=/api/stories
STORYBOOK_API_GET_STORY=/api/stories/{storyId}
STORYBOOK_API_SEARCH=/api/stories/search
```

## Instalasi

```bash
npm install
cp .env.example .env
```

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
npm start
```

## Test

```bash
npm run typecheck
npm test
```

## Konfigurasi MCP (Cursor / Claude Desktop)

```json
{
  "mcpServers": {
    "fds-storybook": {
      "command": "node",
      "args": [
        "/absolute/path/to/mcpstorybook/dist/index.js"
      ],
      "env": {
        "STORYBOOK_BASE_URL": "https://amt-fds-prod.vercel.app",
        "STORYBOOK_AUTH_TYPE": "basic",
        "STORYBOOK_BASIC_AUTH_USERNAME": "${env:FDS_STORYBOOK_USER}",
        "STORYBOOK_BASIC_AUTH_PASSWORD": "${env:FDS_STORYBOOK_PASS}",
        "STORYBOOK_DISCOVERY_PATH": "/absolute/path/to/mcpstorybook/discovery-output.json"
      }
    }
  }
}
```

Jangan commit kredensial. Prefer secret manager atau env lokal.

## Tools

| Tool | Fungsi |
|------|--------|
| `list_stories` | Daftar story (metadata saja) |
| `search_stories` | Pencarian full-text (upstream atau lokal) |
| `get_story` | Story lengkap (+ `maxContentLength`) |
| `get_story_section` | Satu section |
| `get_story_metadata` | Metadata tanpa body penuh |
| `get_story_context` | Konteks ringkas untuk pertanyaan NL |
| `list_components` | Daftar komponen UI (Alert, Button, …) — grouped |
| `get_component` | Detail satu komponen + docs + id variant story |
| `get_component_config` | argTypes (variant, size, …) + daftar style preset + args |

## Resources

- `storybook://stories`
- `storybook://story/{storyId}`
- `storybook://story/{storyId}/section/{sectionId}`

## Docker

```bash
docker build -t fds-storybook-mcp .
docker run --rm -i --env-file .env fds-storybook-mcp
```

MCP stdio: `-i` wajib.
