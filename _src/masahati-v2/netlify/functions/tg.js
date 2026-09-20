/* Netlify Function — وسيط مساحتي الخاص
   الطريق: /.netlify/functions/tg?url=https://t.me/s/channel
   ارفع المجلد netlify/ كما هو بجانب index.html. */
const OK = /^https?:\/\/([a-z0-9-]+\.)*(t\.me|telegram\.me|telegram\.org|cdn-telegram\.org|telesco\.pe|youtube\.com|youtu\.be|googlevideo\.com)\//i;

exports.handler = async (event) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Cache-Control': 'public, max-age=60'
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' };

  const url = (event.queryStringParameters || {}).url || '';
  if (!url) return { statusCode: 400, headers: cors, body: 'missing url' };
  if (!OK.test(url)) return { statusCode: 403, headers: cors, body: 'domain not allowed' };

  try {
    const r = await fetch(url, {
      redirect: 'follow',
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
        'accept-language': 'ar,en;q=0.8'
      }
    });
    const body = await r.text();
    return {
      statusCode: r.status,
      headers: Object.assign({ 'Content-Type': r.headers.get('content-type') || 'text/html; charset=utf-8' }, cors),
      body
    };
  } catch (e) {
    return { statusCode: 502, headers: cors, body: 'fetch failed: ' + e.message };
  }
};
