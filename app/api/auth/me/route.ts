import { requireApiKey } from '../../../../lib/auth';
import { env } from '../../../../lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const check = requireApiKey(req);
  if (!check.ok) return check.res!;
  return Response.json({
    ok: true,
    authRequired: env.API_KEYS.length > 0,
  });
}
