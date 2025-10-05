import { env } from './env';

export function requireApiKey(req: Request) {
  if (env.API_KEYS.length === 0) return { ok: true }; // no auth configured
  const provided = req.headers.get('x-api-key') || '';
  const ok = env.API_KEYS.includes(provided);
  return ok ? { ok: true } : { ok: false, res: new Response(JSON.stringify({ ok:false, error:'Unauthorized' }), { status: 401, headers: { 'content-type': 'application/json; charset=utf-8' }}) };
}
