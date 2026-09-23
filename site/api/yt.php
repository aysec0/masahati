<?php
/* ============================================================
   منزِّل يوتيوب الخاصّ بمساحتي — PHP (Hostinger وأي استضافة PHP)

   api/yt.php?id=VIDEO_ID&info=1           معلومات الفيديو وصيغه (JSON)
   api/yt.php?id=VIDEO_ID&itag=18[&dl=1]   يمرّر الملف نفسه (يدعم Range)
   api/yt.php?id=VIDEO_ID&sub=ar[&fmt=vtt] الترجمة/النصّ

   روابط يوتيوب مربوطة بعنوان الخادم الذي طلبها، لذلك يستخرجها هذا الملف
   ثم يمرّر الملف بنفسه — ولا يُطلب من المتصفّح أن يلمس يوتيوب مباشرة.
   ============================================================ */

@ini_set('display_errors', '0');
header_remove('X-Powered-By');
header('X-Content-Type-Options: nosniff');

function fail($code, $msg) {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => false, 'error' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}

/* من يستعمل هذا الملفّ؟ موقعك نفسه ونسخة GitHub وما تضيفه هنا — لا مواقع الغير
   (يُمنع الطلب حين يأتي باسم موقعٍ آخر؛ الطلبات بلا مصدر تمرّ لأنّ التنزيل المباشر منها) */
$ORIGINS = [];   /* مثال: ['https://example.com'] */
function origin_ok($o) {
    global $ORIGINS;
    if ($o === '') return true;
    $h = strtolower((string)(parse_url($o, PHP_URL_HOST) ?? ''));
    if ($h === '') return false;
    $me = preg_replace('~:\d+$~', '', strtolower($_SERVER['HTTP_HOST'] ?? ''));
    if ($h === $me || $h === 'localhost' || $h === '127.0.0.1' || preg_match('~\.github\.io$~', $h)) return true;
    foreach ($ORIGINS as $x) if (strtolower((string)(parse_url($x, PHP_URL_HOST) ?? $x)) === $h) return true;
    return false;
}
$origin = $_SERVER['HTTP_ORIGIN'] ?? ''; $referer = $_SERVER['HTTP_REFERER'] ?? '';
if (!origin_ok($origin) || !origin_ok($referer)) fail(403, 'غير مسموح من هذا الموقع');
header('Access-Control-Allow-Origin: ' . ($origin !== '' ? $origin : '*'));
header('Vary: Origin');
header('Access-Control-Allow-Headers: Range, Content-Type');
header('Access-Control-Expose-Headers: Content-Length, Content-Range, Accept-Ranges, Content-Type, Content-Disposition');
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') { http_response_code(204); exit; }
if (!function_exists('curl_init')) fail(500, 'curl غير متاح في الاستضافة');

$id = $_GET['id'] ?? '';
if (!preg_match('~^[A-Za-z0-9_-]{11}$~', $id)) fail(400, 'معرّف الفيديو غير صالح');

/* العملاء الذين يعطون روابط مباشرة بلا تشفير — نجرّبهم بالترتيب */
$CLIENTS = [
    ['ANDROID_VR', '1.62.27', '28', 'com.google.android.apps.youtube.vr.oculus/1.62.27 (Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1) gzip',
        ['deviceMake' => 'Oculus', 'deviceModel' => 'Quest 3', 'androidSdkVersion' => 32, 'osName' => 'Android', 'osVersion' => '12L']],
    ['IOS', '20.10.4', '5', 'com.google.ios.youtube/20.10.4 (iPhone16,2; U; CPU iOS 18_3_2 like Mac OS X;)',
        ['deviceMake' => 'Apple', 'deviceModel' => 'iPhone16,2', 'osName' => 'iPhone', 'osVersion' => '18.3.2.22D82']],
];

function yt_player($id, $cl) {
    [$name, $ver, $num, $ua, $extra] = $cl;
    $client = array_merge(['clientName' => $name, 'clientVersion' => $ver, 'hl' => 'ar', 'gl' => 'SA'], $extra);
    $body = json_encode(['context' => ['client' => $client], 'videoId' => $id, 'contentCheckOk' => true, 'racyCheckOk' => true]);
    $ch = curl_init('https://www.youtube.com/youtubei/v1/player?prettyPrint=false');
    curl_setopt_array($ch, [
        CURLOPT_POST => true, CURLOPT_POSTFIELDS => $body, CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 10, CURLOPT_TIMEOUT => 25, CURLOPT_ENCODING => '',
        CURLOPT_HTTPHEADER => ['Content-Type: application/json', "User-Agent: $ua",
            "X-YouTube-Client-Name: $num", "X-YouTube-Client-Version: $ver", 'Origin: https://www.youtube.com'],
    ]);
    $r = curl_exec($ch);
    return $r ? json_decode($r, true) : null;
}

/* يستخرج أوّل ردّ صالح، ويحفظه في الذاكرة المؤقّتة دقائق قليلة */
function yt_get($id) {
    global $CLIENTS;
    $cache = sys_get_temp_dir() . '/mh_yt_' . $id . '.json';
    if (is_file($cache) && time() - filemtime($cache) < 1200) {
        $j = json_decode(@file_get_contents($cache), true);
        if ($j) return $j;
    }
    $why = 'تعذّر الوصول إلى يوتيوب';
    foreach ($CLIENTS as $cl) {
        $j = yt_player($id, $cl);
        if (!$j) continue;
        $st = $j['playabilityStatus']['status'] ?? '';
        if ($st !== 'OK') { $why = $j['playabilityStatus']['reason'] ?? $st; continue; }
        $sd = $j['streamingData'] ?? [];
        $f = array_merge($sd['formats'] ?? [], $sd['adaptiveFormats'] ?? []);
        $f = array_values(array_filter($f, fn($x) => isset($x['url'])));
        if (!$f) { $why = 'لا روابط مباشرة'; continue; }
        $j['_formats'] = $f; $j['_client'] = $cl[0]; $j['_ua'] = $cl[3];
        @file_put_contents($cache, json_encode($j));
        return $j;
    }
    fail(502, yt_why($why));
}
/* أسباب يوتيوب بالعربية */
function yt_why($w) {
    $l = strtolower($w);
    if (strpos($l, 'bot') !== false || strpos($l, 'sign in') !== false)
        return 'يوتيوب يطلب الآن التحقّق من خادمك — جرّب بعد قليل (' . $w . ')';
    if (strpos($l, 'private') !== false) return 'الفيديو خاصّ — لا يُنزَّل';
    if (strpos($l, 'age') !== false) return 'الفيديو مقيَّد بالعمر — لا يُنزَّل دون تسجيل دخول';
    if (strpos($l, 'unavailable') !== false || strpos($l, 'not available') !== false) return 'الفيديو غير متاح (محذوف أو محجوب في بلد الخادم)';
    if (strpos($l, 'live') !== false) return 'البثّ المباشر لا يُنزَّل حتى ينتهي';
    return $w;
}

/* بعض الصيغ (كـ 18) لا تذكر حجمها — نسأل عنه مرّة */
function yt_size(&$f, $ua) {
    if (isset($f['contentLength'])) return (int)$f['contentLength'];
    $ch = curl_init($f['url']);
    curl_setopt_array($ch, [CURLOPT_NOBODY => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT => 12, CURLOPT_USERAGENT => $ua]);
    curl_exec($ch);
    $n = (int)curl_getinfo($ch, CURLINFO_CONTENT_LENGTH_DOWNLOAD);
    if ($n > 0) $f['contentLength'] = (string)$n;
    return $n > 0 ? $n : 0;
}

function kind_of($m) { return strpos($m, 'audio/') === 0 ? 'a' : 'v'; }

$j = yt_get($id);
$vd = $j['videoDetails'] ?? [];

/* ---------- الترجمة ---------- */
if (isset($_GET['sub'])) {
    $tracks = $j['captions']['playerCaptionsTracklistRenderer']['captionTracks'] ?? [];
    $want = $_GET['sub']; $pick = null;
    foreach ($tracks as $t) if (($t['languageCode'] ?? '') === $want) { $pick = $t; break; }
    if (!$pick && $tracks) $pick = $tracks[0];
    if (!$pick) fail(404, 'لا ترجمة لهذا الفيديو');
    $fmt = ($_GET['fmt'] ?? 'vtt') === 'json' ? 'json3' : 'vtt';
    $u = preg_replace('~&fmt=[^&]*~', '', $pick['baseUrl']) . '&fmt=' . $fmt;
    $ch = curl_init($u);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 20, CURLOPT_ENCODING => '', CURLOPT_USERAGENT => $j['_ua']]);
    $out = curl_exec($ch);
    if (!$out) fail(502, 'تعذّر جلب الترجمة');
    header('Content-Type: ' . ($fmt === 'vtt' ? 'text/vtt' : 'application/json') . '; charset=utf-8');
    echo $out; exit;
}

/* ---------- المعلومات ---------- */
if (isset($_GET['info'])) {
    $out = [];
    foreach ($j['_formats'] as &$f) {
        if (strpos($f['mimeType'] ?? '', ',') !== false) yt_size($f, $j['_ua']);
        $m = $f['mimeType'] ?? '';
        $muxed = strpos($m, ',') !== false;       /* codecs="avc1…, mp4a…" = صورة وصوت */
        $k = $muxed ? 'av' : kind_of($m);
        preg_match('~^[a-z]+/([a-z0-9]+)~', $m, $mm);
        $out[] = [
            'itag' => $f['itag'], 'kind' => $k, 'mime' => $m, 'ext' => $mm[1] ?? '',
            'q' => $f['qualityLabel'] ?? ($f['audioQuality'] ?? ''), 'h' => $f['height'] ?? null, 'fps' => $f['fps'] ?? null,
            'br' => $f['bitrate'] ?? null, 'size' => isset($f['contentLength']) ? (int)$f['contentLength'] : null,
            'lang' => $f['audioTrack']['displayName'] ?? null, 'def' => $f['audioTrack']['audioIsDefault'] ?? true, 'drc' => !empty($f['isDrc']),
        ];
    }
    unset($f);
    $caps = [];
    foreach ($j['captions']['playerCaptionsTracklistRenderer']['captionTracks'] ?? [] as $t)
        $caps[] = ['lang' => $t['languageCode'] ?? '', 'name' => $t['name']['runs'][0]['text'] ?? ($t['name']['simpleText'] ?? ''), 'auto' => ($t['kind'] ?? '') === 'asr'];
    $th = $vd['thumbnail']['thumbnails'] ?? [];
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode(['ok' => true, 'id' => $id, 'title' => $vd['title'] ?? '', 'author' => $vd['author'] ?? '',
        'dur' => (int)($vd['lengthSeconds'] ?? 0), 'live' => !empty($vd['isLiveContent']) && empty($j['_formats']),
        'thumb' => 'https://i.ytimg.com/vi/' . $id . '/hqdefault.jpg', 'formats' => $out, 'captions' => $caps,
        'client' => $j['_client']], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/* ---------- الملف نفسه ---------- */
$itag = (int)($_GET['itag'] ?? 0);
$fmt = null;
foreach ($j['_formats'] as $f) if ((int)$f['itag'] === $itag) { $fmt = $f; break; }
if (!$fmt) fail(404, 'الصيغة غير موجودة');

/* نتأكّد أنّ الرابط ما زال صالحًا قبل إرسال الترويسات — وإلّا نستخرج من جديد */
$probe = curl_init($fmt['url'] . '&range=0-0');
curl_setopt_array($probe, [CURLOPT_NOBODY => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_TIMEOUT => 10, CURLOPT_USERAGENT => $j['_ua']]);
curl_exec($probe);
if ((int)curl_getinfo($probe, CURLINFO_RESPONSE_CODE) >= 400) {
    @unlink(sys_get_temp_dir() . '/mh_yt_' . $id . '.json');
    $j = yt_get($id); $fmt = null;
    foreach ($j['_formats'] as $f) if ((int)$f['itag'] === $itag) { $fmt = $f; break; }
    if (!$fmt) fail(404, 'الصيغة غير موجودة');
}
$url = $fmt['url'];
$total = yt_size($fmt, $j['_ua']);
$mime = explode(';', $fmt['mimeType'] ?? 'application/octet-stream')[0];

/* الطلب قد يحدّد مدى (للتقديم في المشغّل وللتنزيل المتقطّع) */
$from = 0; $to = $total ? $total - 1 : 0; $partial = false;
if (!empty($_SERVER['HTTP_RANGE']) && preg_match('~bytes=(\d*)-(\d*)~', $_SERVER['HTTP_RANGE'], $rm) && $total) {
    if ($rm[1] === '' && $rm[2] !== '') { $from = max(0, $total - (int)$rm[2]); }
    else { $from = (int)$rm[1]; if ($rm[2] !== '') $to = min((int)$rm[2], $total - 1); }
    if ($from > $to) { header("Content-Range: bytes */$total"); http_response_code(416); exit; }
    $partial = true;
}

@set_time_limit(0);
@ini_set('zlib.output_compression', '0');
while (ob_get_level() > 0) ob_end_clean();
ignore_user_abort(false);

header('Content-Type: ' . $mime);
header('Accept-Ranges: bytes');
header('Cache-Control: no-store');
if (!empty($_GET['dl'])) {
    $name = trim((string)($_GET['name'] ?? ($vd['title'] ?? $id)));
    $name = preg_replace('~[\\\\/:*?"<>|\r\n]+~u', ' ', $name) ?: $id;
    $ext = strpos($mime, 'audio/') === 0 ? ($mime === 'audio/mp4' ? 'm4a' : 'webm') : ($mime === 'video/mp4' ? 'mp4' : 'webm');
    header("Content-Disposition: attachment; filename=\"video.$ext\"; filename*=UTF-8''" . rawurlencode("$name.$ext"));
}
if ($total) {
    if ($partial) { http_response_code(206); header("Content-Range: bytes $from-$to/$total"); }
    header('Content-Length: ' . ($to - $from + 1));
}
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'HEAD') exit;

/* نجلب على دفعات من ٨ ميغابايت: يوتيوب يبطّئ الطلبات الكبيرة المفتوحة */
$CHUNK = 8 * 1024 * 1024;
$pos = $from; $end = $total ? $to : PHP_INT_MAX;
while ($pos <= $end) {
    $stop = min($pos + $CHUNK - 1, $end);
    $ch = curl_init($url . '&range=' . $pos . '-' . ($total ? $stop : ''));
    $got = 0; $code = 0;
    curl_setopt_array($ch, [
        CURLOPT_USERAGENT => $j['_ua'], CURLOPT_CONNECTTIMEOUT => 12, CURLOPT_TIMEOUT => 300,
        CURLOPT_FOLLOWLOCATION => true, CURLOPT_MAXREDIRS => 4,
        CURLOPT_HEADERFUNCTION => function ($c, $l) use (&$code) { if (preg_match('~^HTTP/\S+\s+(\d+)~', $l, $m)) $code = (int)$m[1]; return strlen($l); },
        CURLOPT_WRITEFUNCTION => function ($c, $data) use (&$got, &$code) {
            if ($code >= 400) return strlen($data);
            echo $data; flush(); $got += strlen($data);
            return connection_aborted() ? 0 : strlen($data);
        },
    ]);
    curl_exec($ch);
    if ($code >= 400 || $got === 0) {
        /* انتهت صلاحية الرابط؟ نمسح الذاكرة ليُستخرج من جديد في الطلب التالي */
        @unlink(sys_get_temp_dir() . '/mh_yt_' . $id . '.json');
        break;
    }
    if (!$total) break;
    $pos += $got;
    if (connection_aborted()) break;
}
