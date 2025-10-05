# Downloader API (Next.js + Route Handlers) — Vercel Ready

A small, secure-ish set of API endpoints:
- `/api/health` — health check
- `/api/metadata?url=` — content-type/length probing (safe HEAD with fallback)
- `/api/download?url=&filename=` — proxy streaming with size limit + anti-SSRF
- `/api/ai/echo` — sample "AI" endpoint that echoes a prompt (no external keys)

## Deploy (Vercel)
1. **Fork/Upload** this repo to GitHub.
2. In Vercel, **New Project** → Import your repo.
3. Set **Environment Variables** (optional):
   - `MAX_BYTES` (default 104857600 = 100MB)
4. Deploy. Your base URL will be like `https://<project>.vercel.app`.

## Local Dev
```bash
pnpm i # or npm i / yarn
pnpm dev
```
Open `http://localhost:3000`

## Example calls
```bash
curl https://<base>/api/health
curl "https://<base>/api/metadata?url=https://example.com/file.mp4"
curl -OJ "https://<base>/api/download?url=https://example.com/file.mp4&filename=video.mp4"
curl -X POST "https://<base>/api/ai/echo" -H "content-type: application/json" -d '{"prompt":"Hello"}'
```

---

## Database & Memory

### Postgres (Neon) for Notes
- Set `DATABASE_URL` (contoh Neon): `postgres://<user>:<pass>@<host>/<db>?sslmode=require`
- Endpoint:
  - `GET /api/notes` — list catatan (tanpa auth)
  - `POST /api/notes` — buat catatan (perlu header `x-api-key`)
  - `GET /api/notes/:id` — ambil satu
  - `PUT /api/notes/:id` — edit (perlu `x-api-key`)
  - `DELETE /api/notes/:id` — hapus (perlu `x-api-key`)

### Memory Store (Upstash Redis)
- Set `UPSTASH_REDIS_REST_URL` dan `UPSTASH_REDIS_REST_TOKEN`.
- Endpoint:
  - `GET /api/memory?key=foo` — ambil
  - `POST /api/memory` — set `{ "key":"foo", "value": any, "ttl": 3600 }` (perlu `x-api-key`)
  - `DELETE /api/memory?key=foo` — hapus (perlu `x-api-key`)
- Jika env Upstash TIDAK diisi, fallback ke **in-memory Map** (hilang saat restart).

### API Key Auth
- Set `API_KEYS` sebagai daftar dipisah koma, contoh:
  ```
  API_KEYS=rahasia-1,rahasia-2
  ```
- Jika tidak di-set, write-ops terbuka (tanpa auth).

