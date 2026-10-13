import { gunzipSync } from 'node:zlib';
import { mergeHistory2025 } from '../../history-import.js';

const DOCUMENT = 'https://firestore.googleapis.com/v1/projects/mariners-point-roi-tracker/databases/(default)/documents/trackers/amit';
const headers = { 'Cache-Control': 'private, no-store', 'Content-Type': 'application/json' };
const reply = (status, error) => new Response(JSON.stringify({ error }), { status, headers });

function readPackage() {
  // The existing private site setting is populated before this function deploys.
  // Node Functions receive injected settings through process.env; the Netlify
  // runtime API can omit Functions-scoped values on this deployed runtime.
  const encoded = Netlify.env.get('ROI_HISTORY_2025_PACKET_V3') || process.env.ROI_HISTORY_2025_PACKET_V3;
  if (!encoded) throw new Error('History package unavailable');
  const packet = JSON.parse(gunzipSync(Buffer.from(encoded, 'base64'), { maxOutputLength: 64000 }).toString('utf8'));
  mergeHistory2025({ years: {} }, packet);
  return packet;
}

export default async request => {
  // Public readiness check exposes no dates, counts, financial values or settings.
  if (request.method === 'GET') {
    try { readPackage(); return new Response('{"ready":true}', { status: 200, headers }); }
    catch (error) { return reply(503, error.message === 'History package unavailable' ? error.message : 'History package validation failed'); }
  }
  if (request.method !== 'POST') return reply(405, 'Use POST');
  const authorization = request.headers.get('Authorization') || '';
  if (!/^Bearer [A-Za-z0-9._-]{20,8192}$/.test(authorization)) return reply(401, 'Sign in required');
  try {
    // Firestore verifies the token and the existing owner-only rules. No admin key,
    // decoded-but-unverified JWT, or credential bypass is used here.
    const verified = await fetch(DOCUMENT, { headers: { Authorization: authorization },
      signal: AbortSignal.timeout(12000), redirect: 'error' });
    if (verified.body) await verified.body.cancel();
    if (!verified.ok) return reply([401, 403].includes(verified.status) ? 403 : 503, 'Owner verification unavailable');
    const packet = readPackage();
    return new Response(JSON.stringify(packet), { status: 200, headers });
  } catch {
    return reply(503, 'History import temporarily unavailable');
  }
};
