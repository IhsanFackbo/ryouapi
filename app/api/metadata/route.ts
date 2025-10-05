import { assertPublicHTTP } from '@/lib/ssrf';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url');
    if (!url) throw new Error('Parameter ?url= wajib');

    const safeUrl = await assertPublicHTTP(url);

    // Try HEAD first
    let headRes: Response | null = null;
    try {
      headRes = await fetch(safeUrl, {
        method: 'HEAD',
        redirect: 'follow',
        signal: AbortSignal.timeout(15000),
        headers: { 'user-agent': 'Downloader-API/1.0 (+info)' }
      });
    } catch {}

    let headers: Headers;
    if (headRes && headRes.ok) {
      headers = headRes.headers;
    } else {
      // fallback: range GET 0-0
      const rangeRes = await fetch(safeUrl, {
        method: 'GET',
        redirect: 'follow',
        headers: {
          'user-agent': 'Downloader-API/1.0 (+info)',
          'range': 'bytes=0-0'
        },
        signal: AbortSignal.timeout(15000)
      });
      headers = rangeRes.headers;
      if (rangeRes.body) { rangeRes.body.cancel(); }
    }

    const type = headers.get('content-type') || 'application/octet-stream';
    const lenRaw = headers.get('content-length') || headers.get('x-file-size') || '0';
    const len = Number(lenRaw);
    const acceptsRanges = !!headers.get('accept-ranges');

    return Response.json({
      ok: true,
      url: safeUrl.toString(),
      contentType: type,
      contentLength: Number.isFinite(len) ? len : null,
      acceptsRanges
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message || 'Gagal mengambil metadata' }), {
      status: 400,
      headers: { 'content-type': 'application/json; charset=utf-8' }
    });
  }
}
