import { ensureSchema, getDb } from '../../../lib/db';
import { requireApiKey } from '../../../lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await ensureSchema();
    const db = getDb();
    const rows = await db.execute(`SELECT id, title, content, created_at, updated_at FROM notes ORDER BY id DESC LIMIT 100`);
    return Response.json({ ok: true, items: rows.rows });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok:false, error: e?.message || 'DB error' }), { status: 500, headers:{'content-type':'application/json; charset=utf-8'}});
  }
}

export async function POST(req: Request) {
  const check = requireApiKey(req);
  if (!check.ok) return check.res!;
  try {
    await ensureSchema();
    const body = await req.json().catch(() => ({}));
    const title = String(body?.title || '').trim();
    const content = String(body?.content || '').trim();
    if (!title || !content) return new Response(JSON.stringify({ ok:false, error:'title & content wajib' }), { status:400, headers:{'content-type':'application/json; charset=utf-8'}});
    const db = getDb();
    const row = await db.execute({
      sql: `INSERT INTO notes (title, content) VALUES ($1, $2) RETURNING id, title, content, created_at, updated_at`,
      args: [title, content]
    });
    return Response.json({ ok: true, item: row.rows[0] });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok:false, error: e?.message || 'DB error' }), { status: 500, headers:{'content-type':'application/json; charset=utf-8'}});
  }
}
