# Voice Lab — realtime voice endpoint

The Voice Lab's **Try** button opens a real conversation over WebRTC: microphone
in, spoken reply out, and the Rive-traced path animates off the live audio in
both directions. That mirrors how Ash's own voice mode works — the app
negotiates WebRTC and streams Opus both ways against its gRPC service.

It is **not** Ash. Ash's service is gRPC behind Firebase auth, using the private
`ashley_protos_dart` contracts; a public page can hold neither the protos nor the
credentials, and pointing a portfolio at production would expose them. The far
end here is a realtime voice API, and the page says so on screen.

## Why a server at all

The browser cannot hold an API key — anyone can read a static page's source. This
Worker keeps the key and hands the browser a **short-lived token** (about a
minute, one session) instead.

## Setup

1. Deploy the Worker:

   ```bash
   cd voice-lab-server
   npx wrangler deploy
   npx wrangler secret put OPENAI_API_KEY
   ```

2. Put its URL in `public/voice-lab/index.html`:

   ```js
   const TOKEN_ENDPOINT = 'https://voice-lab-token.<you>.workers.dev';
   ```

3. Add wherever you host the page to `ALLOWED_ORIGINS` in `worker.js`, so only
   your sites can spend your credit. An origin that is not on this list is
   rejected, so the page will not connect until its origin is listed.

4. Set a monthly spend limit on the OpenAI account. See *Cost and limits*.

Until step 2, Try still opens voice mode and shows
"No voice endpoint configured" — nothing breaks.

## Cost and limits

Realtime audio is billed per minute of audio in and out, so an open token
endpoint is an open tab on your card. The Worker now refuses any request whose
`Origin` is not in `ALLOWED_ORIGINS` — including requests with no `Origin` at
all, which is every `curl` and script — and rate limits what gets through.

Be clear about what each layer actually buys:

| Layer | Stops | Does not stop |
|---|---|---|
| `Origin` allowlist | Another *website* using your endpoint (browsers set `Origin` honestly and won't let a page forge it) | A script, which can send any `Origin` header it likes |
| Per-IP rate limit | One client hammering the endpoint | A spread of IPs |
| Daily session cap | A sustained run-up over a day | — |
| **OpenAI spend limit** | **The bill, absolutely** | — |

The first three are in this Worker. The last one is not, and it is the only
hard ceiling: set a monthly budget on the OpenAI account itself
(Settings → Billing → Limits). Everything here is there to make you unlikely to
reach it.

Tunables at the top of `worker.js`: `PER_IP_PER_MINUTE` (3) and
`GLOBAL_SESSIONS_PER_DAY` (200). These are enforced per Worker isolate, so they
are a floor rather than an exact quota — the `RATE_LIMITER` binding in
`wrangler.toml` is the account-wide version and is used when present.

## The voice you hear is not Willow

Ash's voices (Willow, Spring, Cedar…) are ElevenLabs voices — their IDs are in
`voices-wav/results.json`. A realtime model speaks in its own voice and cannot be
made to speak in those.

If sounding like Ash matters more than latency, the alternative is:
browser speech-to-text → LLM → **ElevenLabs TTS with the real voice IDs**. That
loses barge-in and adds a second or two per turn, but it actually sounds like the
voice you designed the animation for. Say the word and I'll build that instead —
or alongside, as a toggle.
