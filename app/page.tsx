'use client';

import { useMemo, useState } from 'react';

type ApiItem = {
  title: string;
  path: string;
  desc: string;
  method: 'GET' | 'POST';
  tags: string[];
};

const catalog: ApiItem[] = [
  {
    "title": "Health",
    "path": "/api/health",
    "desc": "Cek status server API.",
    "method": "GET",
    "tags": [
      "all"
    ]
  },
  {
    "title": "Metadata",
    "path": "/api/metadata?url=",
    "desc": "Ambil content-type & size dari URL publik.",
    "method": "GET",
    "tags": [
      "all",
      "download"
    ]
  },
  {
    "title": "Download",
    "path": "/api/download?url=&filename=",
    "desc": "Proxy streaming file publik dengan batas ukuran & anti-SSRF.",
    "method": "GET",
    "tags": [
      "all",
      "download"
    ]
  },
  {
    "title": "AI Echo (demo)",
    "path": "/api/ai/echo",
    "desc": "Contoh endpoint AI (tanpa provider), hanya meng-echo prompt.",
    "method": "POST",
    "tags": [
      "all",
      "ai"
    ]
  },
  {
    "title": "Auth Check",
    "path": "/api/auth/me",
    "desc": "Cek status auth/API key.",
    "method": "GET",
    "tags": [
      "all",
      "auth"
    ]
  },
  {
    "title": "Memory GET",
    "path": "/api/memory?key=",
    "desc": "Ambil nilai memory (Upstash Redis atau fallback in-memory).",
    "method": "GET",
    "tags": [
      "all",
      "memory"
    ]
  },
  {
    "title": "Memory SET",
    "path": "/api/memory",
    "desc": "Set nilai memory (JSON: key, value, ttl).",
    "method": "POST",
    "tags": [
      "all",
      "memory",
      "auth"
    ]
  },
  {
    "title": "Notes List",
    "path": "/api/notes",
    "desc": "List catatan dari Postgres (Neon).",
    "method": "GET",
    "tags": [
      "all",
      "database"
    ]
  },
  {
    "title": "Notes Create",
    "path": "/api/notes",
    "desc": "Buat catatan (butuh API key).",
    "method": "POST",
    "tags": [
      "all",
      "database",
      "auth"
    ]
  },
  {
    "title": "Notes Detail",
    "path": "/api/notes/:id",
    "desc": "Ambil satu catatan.",
    "method": "GET",
    "tags": [
      "all",
      "database"
    ]
  },
  {
    "title": "Notes Update",
    "path": "/api/notes/:id",
    "desc": "Update catatan (butuh API key).",
    "method": "PUT",
    "tags": [
      "all",
      "database",
      "auth"
    ]
  },
  {
    "title": "Notes Delete",
    "path": "/api/notes/:id",
    "desc": "Hapus catatan (butuh API key).",
    "method": "DELETE",
    "tags": [
      "all",
      "database",
      "auth"
    ]
  }
];

const TAGS = ['all', 'ai', 'download', 'database', 'memory', 'auth'] as const;

export default function Page() {
  const [tag, setTag] = useState<typeof TAGS[number]>('all');
  const items = useMemo(() => tag === 'all' ? catalog : catalog.filter(c => c.tags.includes(tag)), [tag]);

  return (
    <main>
      <header style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, letterSpacing: .2 }}>Neko Downloader API</h1>
        <a href="https://vercel.com/new" target="_blank" rel="noreferrer" style={{ fontSize: 14, opacity:.9 }}>Deploy ke Vercel →</a>
      </header>

      <p style={{ opacity:.85, marginBottom: 16 }}>
        API kecil siap pakai untuk metadata & download, plus contoh endpoint AI.
      </p>

      <div style={{ display:'flex', gap: 8, margin: '16px 0 24px' }}>
        {TAGS.map(t => (
          <button key={t}
            onClick={() => setTag(t)}
            style={{ padding:'8px 12px', borderRadius: 999, border: '1px solid #233047', background: tag===t? '#233047' : 'transparent', color:'#e2e8f0', cursor:'pointer' }}>
            #{t}
          </button>
        ))}
      </div>

      <section style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
        {items.map(item => (
          <article key={item.path} style={{ background:'#0f1623', border:'1px solid #22314b', borderRadius: 16, padding: 16 }}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:12}}>
              <h3 style={{ margin:0, fontSize: 18 }}>{item.title}</h3>
              <code style={{ fontSize:12, opacity:.8 }}>{item.method}</code>
            </div>
            <p style={{ opacity:.85, minHeight:40 }}>{item.desc}</p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:12 }}>
              {item.tags.map(t => (
                <span key={t} style={{ fontSize:10, padding:'4px 8px', border:'1px solid #2b3a56', borderRadius: 999, opacity:.9 }}>#{t}</span>
              ))}
            </div>
            <div style={{ fontSize:12, wordBreak:'break-all', background:'#0b0f17', border:'1px solid #22314b', padding:8, borderRadius:8 }}>
              {item.path}
            </div>
          </article>
        ))}
      </section>

      <footer style={{ marginTop: 32, opacity:.7, fontSize: 12 }}>
        Pastikan hanya mengunduh konten publik dan patuhi ToS situs sumber.
      </footer>
    </main>
  );
}
