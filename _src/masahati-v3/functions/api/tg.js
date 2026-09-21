/* Cloudflare Pages Function — وسيط مساحتي الخاص
   الطريق: /api/tg?url=https://t.me/s/channel
   ارفع المجلد functions/ كما هو بجانب index.html ولا تحتاج شيئًا آخر. */
const OK = /^https?:\/\/([a-z0-9-]+\.)*(t\.me|telegram\.me|telegram\.org|cdn-telegram\.org|telesco\.pe|youtube\.com|youtu\.be|googlevideo\.com)\//i;

export async function onRequest(context) {
  const { request } = context;
  const cors = {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': '*',
    'cache-control': 'public, max-age=60'
  };
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

  const url = new URL(request.url).searchParams.get('url') || '';
  if (!url) return new Response('missing url', { status: 400, headers: cors });
  if (!OK.test(url)) return new Response('domain not allowed', { status: 403, headers: cors });

  try {
    const r = await fetch(url, {
      redirect: 'follow',
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
        'accept-language': 'ar,en;q=0.8'
      }
    });
    const h = new Headers(cors);
    const ct = r.headers.get('content-type');
    if (ct) h.set('content-type', ct);
    return new Response(r.body, { status: r.status, headers: h });
  } catch (e) {
    return new Response('fetch failed: ' + e.message, { status: 502, headers: cors });
  }
}
