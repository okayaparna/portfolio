/**
 * Ephemeral-token endpoint for the Voice Lab's realtime voice demo.
 *
 * The browser cannot hold an API key, so it asks this Worker for a short-lived
 * client secret instead. The key stays here; the token the browser receives
 * expires in about a minute and is scoped to one realtime session.
 *
 * Every request that gets past this file costs real money — realtime audio is
 * billed per minute in and out — so the job here is not only to hide the key
 * but to bound how often anyone can mint a session.
 *
 * Deploy (Cloudflare Workers):
 *   npx wrangler deploy
 *   npx wrangler secret put OPENAI_API_KEY
 *
 * Then set TOKEN_ENDPOINT in public/voice-lab/index.html to this Worker's URL.
 */

const MODEL = 'gpt-4o-realtime-preview-2024-12-17';
const VOICE = 'shimmer';

// Allow only the sites that should be able to spend your credit.
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'https://okayaparna.github.io',
];

// Best-effort limits applied in this isolate. The RATE_LIMITER binding (see
// wrangler.toml) is the accurate, account-wide version; these are the floor
// that applies even before it is configured, so the endpoint is never
// completely unmetered.
const PER_IP_PER_MINUTE = 3;
const GLOBAL_SESSIONS_PER_DAY = 200;

// This demo sits on a portfolio page next to work for a mental-health product,
// so the model is told plainly what it is and what it must not do.
const INSTRUCTIONS = `
You are a friendly demo voice on a designer's portfolio page. You are NOT Ash,
and you are not a therapist or a source of mental-health support.

If asked who you are, say you are a demo voice standing in for Ash so the
animation has something real to react to, and that the real Ash lives in the
Ash app.

Keep replies short and conversational - one or two sentences - because every
reply is spoken aloud. Be warm and curious about what the person is building
or looking at.

If someone raises distress, self-harm, or a crisis, do not attempt to counsel
them. Say clearly that you are a demo and cannot help with this, and encourage
them to talk to a real person or a crisis line (in the US, 988). Then stop.
`.trim();

/**
 * CORS headers. An origin that is not on the list is never echoed back — the
 * browser then blocks the response, instead of us quietly handing it a header
 * naming somebody else's site.
 */
function corsHeaders(origin) {
  const headers = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
  if (ALLOWED_ORIGINS.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

function json(body, status, cors) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

// --- Best-effort in-isolate metering -----------------------------------------
// Workers run many isolates, so these counters see only a slice of traffic and
// reset when an isolate is recycled. They are a backstop, not a guarantee: the
// hard ceiling is the spend limit you set on the OpenAI account itself.

const hits = new Map();   // ip -> timestamps (ms) within the trailing minute
let day = '';             // UTC date the global counter belongs to
let dayCount = 0;

function overPerIpLimit(ip, now) {
  const cutoff = now - 60_000;
  const recent = (hits.get(ip) || []).filter(t => t > cutoff);

  // Keep the map from growing without bound across a long-lived isolate.
  if (hits.size > 5000) hits.clear();

  if (recent.length >= PER_IP_PER_MINUTE) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

function overDailyLimit(now) {
  const today = new Date(now).toISOString().slice(0, 10);
  if (today !== day) { day = today; dayCount = 0; }
  if (dayCount >= GLOBAL_SESSIONS_PER_DAY) return true;
  dayCount++;
  return false;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const cors = corsHeaders(origin);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }
    if (request.method !== 'POST') {
      return new Response('POST only', { status: 405, headers: cors });
    }

    // The origin must be present AND on the list. Checking only `origin &&
    // !allowed` let anything without an Origin header through, which is every
    // non-browser client -- a plain `curl -X POST` minted a billable session.
    //
    // Note what this does and does not buy: browsers set Origin honestly and
    // will not let another site forge it, so this stops other web pages using
    // the endpoint. A script can still send any Origin it likes, which is why
    // the rate limits below, not this check, are what bound the bill.
    if (!ALLOWED_ORIGINS.includes(origin)) {
      return new Response('Origin not allowed', { status: 403, headers: cors });
    }

    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const now = Date.now();

    // Account-wide limiter when configured; the in-isolate check always runs.
    if (env.RATE_LIMITER) {
      const { success } = await env.RATE_LIMITER.limit({ key: ip });
      if (!success) {
        return json({ error: 'Rate limited. Give it a minute.' }, 429, cors);
      }
    }
    if (overPerIpLimit(ip, now)) {
      return json({ error: 'Rate limited. Give it a minute.' }, 429, cors);
    }
    if (overDailyLimit(now)) {
      return json({ error: 'The demo has hit its daily limit. Try tomorrow.' }, 429, cors);
    }

    if (!env.OPENAI_API_KEY) {
      // Log the real reason; tell the caller only that it is unavailable.
      console.error('OPENAI_API_KEY is not set on the Worker');
      return json({ error: 'Voice demo unavailable' }, 503, cors);
    }

    const upstream = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        voice: VOICE,
        instructions: INSTRUCTIONS,
        modalities: ['audio', 'text'],
        turn_detection: { type: 'server_vad', threshold: 0.5, silence_duration_ms: 600 },
      }),
    });

    const body = await upstream.text();
    if (!upstream.ok) {
      // Upstream errors can quote the request back, key prefix and all, so the
      // detail goes to the Worker log and never to the browser.
      console.error('Upstream', upstream.status, body.slice(0, 500));
      return json({ error: 'Upstream error' }, 502, cors);
    }

    // { client_secret: { value, expires_at }, ... } -- pass through, plus the model
    const session = JSON.parse(body);
    return json({
      token: session.client_secret?.value,
      expires_at: session.client_secret?.expires_at,
      model: MODEL,
    }, 200, cors);
  },
};
