<?php
/* ============================================================
   وسيط مساحتي الخاص — نسخة PHP (Hostinger وأي استضافة PHP)
   الطريق:  api/tg.php?url=https://t.me/s/channel
   يجلب صفحات تيليجرام وملفاتها ويعيدها إلى الموقع نفسه،
   فلا يحتاج الموقع إلى وسطاء عامّة قد تتعطّل.
   لا يسمح إلا بنطاقات تيليجرام ويوتيوب — ولا يمرّر أي شيء آخر.

   مهمّ: تيليجرام يرسل content-length للنسخة المضغوطة، و cURL يفكّ
   الضغط قبل أن يصل إلينا. فلو مرّرنا ذلك الطول لقُطِعت الصفحة عند
   سُدس حجمها ولضاعت المنشورات. لذلك نجمع الترويسات أوّلًا ثمّ نقرّر.
   ============================================================ */

$ALLOW = '~^https?://([a-z0-9-]+\.)*(t\.me|telegram\.me|telegram\.org|cdn-telegram\.org|telesco\.pe|youtube\.com|youtu\.be|googlevideo\.com)/~i';

header_remove('X-Powered-By');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: *');
header('Access-Control-Allow-Methods: GET, HEAD, OPTIONS');
header('Access-Control-Expose-Headers: Content-Length, Content-Range, Accept-Ranges, Content-Type');
header('X-Content-Type-Options: nosniff');

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method === 'OPTIONS') { http_response_code(204); exit; }
if ($method !== 'GET' && $method !== 'HEAD') {
    http_response_code(405); header('Content-Type: text/plain; charset=utf-8'); echo 'method not allowed'; exit;
}

$url = isset($_GET['url']) ? trim((string)$_GET['url']) : '';
if ($url === '')                 { http_response_code(400); header('Content-Type: text/plain; charset=utf-8'); echo 'missing url'; exit; }
if (!preg_match($ALLOW, $url))   { http_response_code(403); header('Content-Type: text/plain; charset=utf-8'); echo 'domain not allowed'; exit; }
if (!function_exists('curl_init')){ http_response_code(500); header('Content-Type: text/plain; charset=utf-8'); echo 'curl missing'; exit; }

@set_time_limit(0);
@ini_set('zlib.output_compression', '0');
while (ob_get_level() > 0) { ob_end_clean(); }

$UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';
$reqHeaders = [
    'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language: ar,en;q=0.8',
];
if (!empty($_SERVER['HTTP_RANGE'])) { $reqHeaders[] = 'Range: ' . $_SERVER['HTTP_RANGE']; }

/* الترويسات التي نمرّرها إلى المتصفّح */
$PASS = ['content-type', 'content-length', 'content-range', 'accept-ranges', 'last-modified', 'etag', 'content-disposition'];

$target = $url; $hops = 0; $sent = false;
$status = 0; $redirect = null; $got = [];

/* نجمع كل ترويسات الردّ، ولا نرسل شيئًا حتى ينتهي طور الترويسات،
   فترتيب وصولها لا يؤثّر على قرارنا */
$onHeader = function ($ch, $line) use (&$status, &$redirect, &$got) {
    $len = strlen($line);
    $t = trim($line);
    if ($t === '') return $len;
    if (stripos($t, 'HTTP/') === 0) {           /* ردّ جديد (أو بعد تحويل) — نبدأ من الصفر */
        $parts = explode(' ', $t);
        $status = isset($parts[1]) ? (int)$parts[1] : 0;
        $redirect = null; $got = [];
        return $len;
    }
    $p = strpos($t, ':'); if ($p === false) return $len;
    $name = strtolower(trim(substr($t, 0, $p)));
    $val  = trim(substr($t, $p + 1));
    if ($name === 'location') { $redirect = $val; return $len; }
    $got[$name] = $val;
    return $len;
};

$flush = function () use (&$sent, &$status, &$got, $PASS) {
    if ($sent) return;
    $sent = true;
    http_response_code($status ?: 200);
    /* cURL فكّ الضغط بنفسه، فطول المحتوى المعلن لم يعد صحيحًا — نُسقطه
       ويتولّى PHP الإرسال المقطّع. أمّا الملفّات (بلا ضغط) فطولها يمرّ كما هو
       ليعمل التقديم والتأخير في المشغّل. */
    $encoded = isset($got['content-encoding']) && strtolower($got['content-encoding']) !== 'identity';
    foreach ($PASS as $h) {
        if (!isset($got[$h])) continue;
        if ($h === 'content-length' && $encoded) continue;
        header($h . ': ' . $got[$h]);
    }
    header('Cache-Control: public, max-age=60');
};

$onBody = function ($ch, $data) use (&$status, &$redirect, $flush) {
    if ($status >= 300 && $status < 400 && $redirect) return strlen($data);  /* جسم التحويل يُهمَل */
    $flush();
    echo $data;
    flush();
    return strlen($data);
};

while ($hops < 6) {
    $ch = curl_init($target);
    curl_setopt_array($ch, [
        CURLOPT_FOLLOWLOCATION => false,          /* نتابع التحويلات بأنفسنا لنفحص كل وجهة */
        CURLOPT_CONNECTTIMEOUT => 12,
        CURLOPT_TIMEOUT        => 900,
        CURLOPT_USERAGENT      => $UA,
        CURLOPT_HTTPHEADER     => $reqHeaders,
        CURLOPT_HEADERFUNCTION => $onHeader,
        CURLOPT_WRITEFUNCTION  => $onBody,
        CURLOPT_NOBODY         => ($method === 'HEAD'),
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
        CURLOPT_ENCODING       => '',             /* نقبل الضغط ثم نفكّه — أسرع نقلًا */
        CURLOPT_PROTOCOLS      => CURLPROTO_HTTP | CURLPROTO_HTTPS,
    ]);
    $status = 0; $redirect = null; $got = [];
    $okExec = curl_exec($ch);
    $err = curl_error($ch);
    curl_close($ch);

    if ($status >= 300 && $status < 400 && $redirect) {
        if (!preg_match('~^https?://~i', $redirect)) {       /* تحويل نسبيّ */
            $u = parse_url($target);
            $base = $u['scheme'] . '://' . $u['host'] . (isset($u['port']) ? ':' . $u['port'] : '');
            if (strpos($redirect, '/') === 0) $redirect = $base . $redirect;
            else $redirect = $base . rtrim(dirname($u['path'] ?? '/'), '/') . '/' . $redirect;
        }
        if (!preg_match($ALLOW, $redirect)) {
            http_response_code(403); header('Content-Type: text/plain; charset=utf-8'); echo 'redirect not allowed'; exit;
        }
        $target = $redirect; $hops++;
        continue;
    }

    if ($okExec === false && !$sent) {
        http_response_code(502); header('Content-Type: text/plain; charset=utf-8');
        echo 'fetch failed: ' . $err; exit;
    }
    $flush();                 /* ردّ بلا جسم (HEAD أو 204) يخرج بترويساته */
    exit;
}

http_response_code(508); header('Content-Type: text/plain; charset=utf-8'); echo 'too many redirects';
