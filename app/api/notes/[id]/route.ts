import { ensureSchema, getDb } from '../../../lib/db';
import { requireApiKey } from '../../../lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_: Request, { params }: { params: { id: string }}) {
  try {
    await ensureSchema();
    const id = Number(params.id);
    const db = getDb();
    const row = await db.execute({ sql:`SELECT id, title, content, created_at, updated_at FROM notes WHERE id=$1`, args:[id]});
    return row.rows[0] ? Response.json({ ok:true, item: row.rows[0] }) : new Response(JSON.stringify({ ok:false, error:'not found' }), { status:404, headers:{'content-type':'application/json; charset=utf-8'}});
  } catch (e: any) {
    return new Response(JSON.stringify({ ok:false, error: e?.message || 'DB error' }), { status: 500, headers:{'content-type':'application/json; charset=utf-8'}});
  }
}

export async function PUT(req: Request, { params }: { params: { id: string }}) {
  const check = requireApiKey(req);
  if (!check.ok) return check.res!;
  try {
    await ensureSchema();
    const id = Number(params.id);
    const body = await req.json().catch(() => ({}));
    const title = typeof body?.title === 'string' ? body.title : undefined;
    const content = typeof body?.content === 'string' ? body.content : undefined;
    if (!title && !content) return new Response(JSON.stringify({ ok:false, error:'title atau content harus ada' }), { status:400, headers:{'content-type':'application/json; charset=utf-8'}});
    const db = getDb();
    const row = await db.execute({
      sql: `UPDATE notes SET title = COALESCE($1, title), content = COALESCE($2, content), updated_at = NOW() WHERE id = $3 RETURNING id, title, content, created_at, updated_at`,
      args: [title ?? null, content ?? null, id]
    });
    return row.rows[0] ? Response.json({ ok:true, item: row.rows[0] }) : new Response(JSON.stringify({ ok:false, error:'not found' }), { status:404, headers:{'content-type':'application/json; charset=utf-8'}});
  } catch (e: any) {
    return new Response(JSON.stringify({ ok:false, error: e?.message || 'DB error' }), { status: 500, headers:{'content-type':'application/json; charset=utf-8'}});
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string }}) {
  const check = requireApiKey(req);
  if (!check.ok) return check.res!;
  try {
    await ensureSchema();
    const id = Number(params.id);
    const db = getDb();
    await db.execute({ sql:`DELETE FROM notes WHERE id=$1`, args:[id]});
    return Response.json({ ok:true });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok:false, error: e?.message || 'DB error' }), { status: 500, headers:{'content-type':'application/json; charset=utf-8'}});
  }
}
