import { kvGet, kvSet, kvDel } from '@/lib/kv';
import { requireApiKey } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get('key');
  if (!key) return new Response(JSON.stringify({ ok:false, error:'key wajib' }), { status:400, headers:{'content-type':'application/json; charset=utf-8'}});
  const r = await kvGet(key);
  return new Response(JSON.stringify(r), { status: r.ok ? 200 : 400, headers:{'content-type':'application/json; charset=utf-8'}});
}

export async function POST(req: Request) {
  const check = requireApiKey(req);
  if (!check.ok) return check.res!;
  const body = await req.json().catch(() => ({}));
  const { key, value, ttl } = body || {};
  if (!key) return new Response(JSON.stringify({ ok:false, error:'key wajib' }), { status:400, headers:{'content-type':'application/json; charset=utf-8'}});
  const ttlNum = typeof ttl === 'number' ? ttl : undefined;
  const r = await kvSet(key, value, ttlNum);
  return new Response(JSON.stringify(r), { status: r.ok ? 200 : 400, headers:{'content-type':'application/json; charset=utf-8'}});
}

export async function DELETE(req: Request) {
  const check = requireApiKey(req);
  if (!check.ok) return check.res!;
  const { searchParams } = new URL(req.url);
  const key = searchParams.get('key');
  if (!key) return new Response(JSON.stringify({ ok:false, error:'key wajib' }), { status:400, headers:{'content-type':'application/json; charset=utf-8'}});
  const r = await kvDel(key);
  return new Response(JSON.stringify(r), { status: r.ok ? 200 : 400, headers:{'content-type':'application/json; charset=utf-8'}});
}
