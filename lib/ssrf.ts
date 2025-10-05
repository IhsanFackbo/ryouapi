import dns from 'node:dns/promises';
import net from 'node:net';
import { URL } from 'node:url';

export function isPrivateIPv4(ip: string): boolean {
  if (!net.isIP(ip)) return false;
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4) return false;
  if (parts[0] === 10) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 127) return true; // loopback
  if (parts[0] === 169 && parts[1] === 254) return true; // link-local
  return false;
}

export async function assertPublicHTTP(input: string): Promise<URL> {
  let url: URL;
  try { url = new URL(input); } catch { throw new Error('URL tidak valid'); }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Hanya http/https yang diizinkan');
  }
  const addrs = await dns.lookup(url.hostname, { all: true });
  for (const a of addrs) {
    if (a.family === 4 && isPrivateIPv4(a.address)) {
      throw new Error('Akses ke IP privat diblokir');
    }
  }
  return url;
}
