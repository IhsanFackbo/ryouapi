export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return new Response(JSON.stringify({ ok: true, uptime: process.uptime() }), {
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
}
