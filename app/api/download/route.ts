import { assertPublicHTTP } from '../../../../lib/ssrf';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BYTES = Number(process.env.MAX_BYTES || 100 * 1024 * 1024); // 100MB

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url');
    const filename = searchParams.get('filename') || undefined;
    if (!url) throw new Error('Parameter ?url= wajib');

    const safeUrl = await assertPublicHTTP(url);

    // Pre-check size with HEAD
    let contentLength = 0;
    try {
      const head = await fetch(safeUrl, {
        method: 'HEAD', redirect: 'follow',
        headers: { 'user-agent': 'Downloader-API/1.0 (+info)' },
        signal: AbortSignal.timeout(15000)
      });
      const len = Number(head.headers.get('content-length') || '0');
      if (Number.isFinite(len)) contentLength = len;
    } catch {}

    if (contentLength && contentLength > MAX_BYTES) {
      throw new Error(`Ukuran file melebihi batas (${MAX_BYTES} bytes)`);
    }

    const upstream = await fetch(safeUrl, {
      method: 'GET', redirect: 'follow',
      headers: { 'user-agent': 'Downloader-API/1.0 (+info)' },
      signal: AbortSignal.timeout(30000)
    });

    if (!upstream.ok || !upstream.body) {
      return new Response(JSON.stringify({ ok: false, error: 'Sumber tidak bisa diunduh' }), {
        status: 502, headers: { 'content-type': 'application/json; charset=utf-8' }
      });
    }

    const type = upstream.headers.get('content-type') || 'application/octet-stream';
    const len = upstream.headers.get('content-length') || undefined;
    const name = filename || safeUrl.pathname.split('/').pop() || 'download';

    const headers = new Headers();
    headers.set('content-type', type);
    if (len) headers.set('content-length', len);
    headers.set('content-disposition', `attachment; filename="${encodeURIComponent(name)}"`);

    // Enforce runtime size limit while streaming
    const reader = upstream.body.getReader();
    let sent = 0;
    const stream = new ReadableStream({
      async pull(controller) {
        const { value, done } = await reader.read();
        if (done) { controller.close(); return; }
        sent += value.byteLength;
        if (sent > MAX_BYTES) {
          controller.error(new Error('Batas ukuran tercapai'));
          return;
        }
        controller.enqueue(value);
      },
      cancel(reason) {
        reader.cancel(reason);
      }
    });

    return new Response(stream, { headers });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message || 'Gagal mengunduh' }), {
      status: 400,
      headers: { 'content-type': 'application/json; charset=utf-8' }
    });
  }
}
