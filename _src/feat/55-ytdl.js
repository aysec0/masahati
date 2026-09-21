/* ================================================================
   منزِّل يوتيوب الخاصّ بالموقع
   الخادم: api/yt.php (في استضافتك) يستخرج الروابط ويمرّر الملفّ.
   المتصفّح: يختار الجودة، ينزّل مع شريط تقدّم ويستأنف إن انقطع،
   ويدمج الصورة بالصوت أو يقصّ أو يحوّل إلى MP3 بـ ffmpeg داخل جهازك،
   ثم يحفظ في المكتبة و/أو في الجهاز. والترجمة تُحفظ تفريغًا أو SRT.
   ================================================================ */
const YT_IC = {
  dl: '<svg viewBox="0 0 24 24"><path d="M12 4v11"/><path d="m8 12 4 4 4-4"/><path d="M5 20h14"/></svg>',
  vid: '<svg viewBox="0 0 24 24"><rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3z"/></svg>',
  aud: '<svg viewBox="0 0 24 24"><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></svg>',
  cc: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10 10.5a2 2 0 1 0 0 3M16 10.5a2 2 0 1 0 0 3"/></svg>',
  srv: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 7.5h.01M7 16.5h.01"/></svg>'
};

/* عنوان الخادم: الذي ضبطته، أو ملفّ الموقع نفسه على الاستضافة */
function ytApi() {
  const c = (S.get('ytApi', '') || '').trim();
  if (c) return /\.php$|\/api\/yt\/?$/.test(c) ? c : c.replace(/\/+$/, '') + '/api/yt.php';
  try {
    if (/^https?:$/.test(location.protocol) && !/\.github\.io$/i.test(location.hostname))
      return new URL('api/yt.php', location.href.split('#')[0]).href;
  } catch (e) {}
  return '';
}
const ytQ = (id, q) => ytApi() + (ytApi().includes('?') ? '&' : '?') + 'id=' + id + '&' + q;

async function ytInfo(yid) {
  const api = ytApi(); if (!api) throw new Error('noserver');
  let r;
  try { r = await fetch(ytQ(yid, 'info=1'), { cache: 'no-store' }); } catch (e) { throw new Error('تعذّر الاتصال بخادم التنزيل'); }
  let j = null; try { j = await r.json(); } catch (e) {}
  if (!j) throw new Error(r.status === 404 ? 'لم أجد api/yt.php على الخادم — ارفع ملفات الموقع كاملة' : 'ردّ غير مفهوم من الخادم (' + r.status + ')');
  if (!j.ok) throw new Error(j.error || 'تعذّر');
  return j;
}

/* ---------- تنزيل بتقدّم واستئناف ---------- */
async function ytFetch(url, total, onp, signal) {
  const parts = []; let got = 0, tries = 0, t0 = Date.now();
  for (;;) {
    try {
      const r = await fetch(url, { signal, cache: 'no-store', headers: got ? { Range: 'bytes=' + got + '-' } : {} });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      if (got && r.status !== 206) { parts.length = 0; got = 0; }
      if (!total) total = +r.headers.get('content-length') || 0;
      const rd = r.body.getReader();
      for (;;) {
        const { done, value } = await rd.read(); if (done) break;
        parts.push(value); got += value.length;
        onp(got, total, got / Math.max(0.5, (Date.now() - t0) / 1000));
      }
      if (!total || got >= total) break;
      throw new Error('انقطع الاتصال');
    } catch (e) {
      if (signal && signal.aborted) throw new Error('أُلغي');
      if (++tries > 5) throw e;
      onp(got, total, 0, 'انقطع — أستأنف من حيث توقّف…');
      await new Promise(r => setTimeout(r, 1200 * tries));
    }
  }
  return new Blob(parts);
}

/* ---------- ffmpeg داخل المتصفّح (يُحمَّل مرّة عند الحاجة) ---------- */
let YTFF = null;
/* نسخة الوحدات (ESM): العامل يُنشأ من رابط محلّي يستورد ملفّ الشبكة،
   لأنّ المتصفّح لا يشغّل عاملًا من نطاق آخر مباشرة */
async function ytFF(onp) {
  if (YTFF) return YTFF;
  const FV = 'https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.15/dist/esm', CV = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm';
  let mod;
  try { mod = await import(FV + '/index.js'); } catch (e) { throw new Error('تعذّر تحميل أداة الدمج — تحقّق من الاتصال'); }
  const r = await fetch(CV + '/ffmpeg-core.wasm'); if (!r.ok) throw new Error('تعذّر تحميل أداة الدمج');
  const n = 32232419, rd = r.body.getReader(), ch = []; let g = 0;
  for (;;) { const { done, value } = await rd.read(); if (done) break; ch.push(value); g += value.length; if (onp) onp(Math.min(g, n), n); }
  const wasmURL = URL.createObjectURL(new Blob(ch, { type: 'application/wasm' }));
  const classWorkerURL = URL.createObjectURL(new Blob([`import "${FV}/worker.js";`], { type: 'text/javascript' }));
  const ff = new mod.FFmpeg();
  await ff.load({ classWorkerURL, coreURL: CV + '/ffmpeg-core.js', wasmURL });
  YTFF = ff; return ff;
}
async function ytRun(inputs, args, outName, mime, onp) {
  const ff = await ytFF();
  for (const [n, b] of inputs) await ff.writeFile(n, new Uint8Array(await b.arrayBuffer()));
  const h = ({ progress }) => onp && onp(Math.max(0, Math.min(1, progress || 0)));
  ff.on('progress', h);
  try { const rc = await ff.exec(args); if (rc !== 0) throw new Error('فشلت المعالجة'); }
  finally { ff.off('progress', h); }
  const data = await ff.readFile(outName);
  for (const [n] of inputs) { try { await ff.deleteFile(n); } catch (e) {} }
  try { await ff.deleteFile(outName); } catch (e) {}
  return new Blob([data.buffer], { type: mime });
}

/* ---------- اختيار الصيغ ---------- */
function ytPlan(info) {
  const F = info.formats || [];
  const aM4a = F.filter(f => f.kind === 'a' && f.ext === 'mp4' && !f.drc).sort((a, b) => (b.br || 0) - (a.br || 0));
  const aWeb = F.filter(f => f.kind === 'a' && f.ext === 'webm' && !f.drc).sort((a, b) => (b.br || 0) - (a.br || 0));
  const best = { m4a: aM4a[0], webm: aWeb[0] || aM4a[0] };
  const vids = [];
  const av = F.filter(f => f.kind === 'av').sort((a, b) => (b.h || 0) - (a.h || 0));
  av.forEach(f => vids.push({ key: 'av' + f.itag, h: f.h, q: f.q, size: f.size, v: f, fast: true }));
  const hs = [...new Set(F.filter(f => f.kind === 'v' && f.h).map(f => f.h))].sort((a, b) => b - a);
  hs.forEach(h => {
    const cand = F.filter(f => f.kind === 'v' && f.h === h);
    /* الأنسب للتشغيل في كل الأجهزة: H.264 ثم AV1 (mp4) ثم VP9 (webm) */
    const v = cand.find(f => /avc1/.test(f.mime)) || cand.find(f => f.ext === 'mp4') || cand[0];
    const a = v.ext === 'mp4' ? best.m4a : best.webm;
    if (!a) return;
    if (vids.some(x => x.fast && x.h === h)) return;
    vids.push({ key: 'v' + v.itag, h, q: v.q || h + 'p', size: (v.size || 0) + (a.size || 0), v, a, ext: v.ext });
  });
  vids.sort((a, b) => (b.h || 0) - (a.h || 0));
  const auds = [];
  aM4a.forEach(f => auds.push({ key: 'a' + f.itag, a: f, label: 'M4A ' + Math.round((f.br || 0) / 1000) + ' ك.ب/ث', size: f.size }));
  if (aWeb[0]) auds.push({ key: 'a' + aWeb[0].itag, a: aWeb[0], label: 'Opus ' + Math.round((aWeb[0].br || 0) / 1000) + ' ك.ب/ث (webm)', size: aWeb[0].size });
  if (best.m4a) auds.push({ key: 'mp3', a: best.m4a, label: 'MP3 — يُحوَّل في جهازك', size: best.m4a.size, mp3: true });
  return { vids, auds };
}

/* ---------- الواجهة ---------- */
function ytSecOptions(pref) {
  const opts = [];
  tree.forEach(sec => {
    opts.push(`<option value="${sec.id}" ${pref === sec.id ? 'selected' : ''}>${esc(sec.name)}</option>`);
    (sec.subs || []).forEach(sub => opts.push(`<option value="${sec.id}:${sub.id}" ${pref === sec.id + ':' + sub.id ? 'selected' : ''}>— ${esc(sub.name)}</option>`));
  });
  opts.push(`<option value="new" ${!pref || pref === 'new' ? 'selected' : ''}>تنزيلات يوتيوب${findSec('secYtDl') ? '' : ' (قسم جديد)'}</option>`);
  return opts.join('');
}
function ytPanelHTML(info, ctx) {
  const P = ytPlan(info); ctx.plan = P;
  const c = ctx.clip || {};
  const row = (name, x, sub, on) => `<label class="ytopt"><input type="radio" name="${name}" value="${x.key}" ${on ? 'checked' : ''}>
      <span class="ytq">${x.q || x.label}</span><span class="yts">${sub}</span><span class="ytsz">${x.size ? mb(x.size) : ''}</span></label>`;
  const vDef = (P.vids.find(x => x.h === 720) || P.vids.find(x => x.fast) || P.vids[0] || {}).key;
  return `<div class="ytcard">
      <img src="${esc(info.thumb)}" alt="" loading="lazy">
      <div><b>${esc(info.title)}</b><small>${esc(info.author)} · ${mmss(info.dur)}</small></div></div>
    <div class="segs yttabs"><button class="chip on" data-ytt="v">${YT_IC.vid} فيديو</button>
      <button class="chip" data-ytt="a">${YT_IC.aud} صوت فقط</button>
      <button class="chip" data-ytt="c">${YT_IC.cc} النصّ والترجمة${info.captions.length ? ' (' + AR(info.captions.length) + ')' : ''}</button></div>
    <div class="ytpane" data-ytp="v">
      <div class="ytlist">${P.vids.map(x => row('ytv', x, x.fast ? 'جاهز بصوته — الأسرع' : 'يُدمج بالصوت في جهازك', x.key === vDef)).join('') || '<p class="mkempty">لا صيغ فيديو.</p>'}</div>
    </div>
    <div class="ytpane" data-ytp="a" hidden>
      <div class="ytlist">${P.auds.map((x, i) => row('yta', x, x.mp3 ? 'يعمل في كل مكان' : (i === 0 ? 'الأنسب للمحاضرات' : ''), i === 0)).join('') || '<p class="mkempty">لا صيغ صوت.</p>'}</div>
    </div>
    <div class="ytpane" data-ytp="c" hidden>
      ${info.captions.length ? `<div class="ytlist">${info.captions.map((t, i) => `<label class="ytopt"><input type="radio" name="ytc" value="${esc(t.lang)}" ${i === 0 ? 'checked' : ''}>
          <span class="ytq">${esc(t.name || t.lang)}</span><span class="yts">${t.auto ? 'آليّة' : 'مكتوبة'}</span></label>`).join('')}</div>
        <div class="sheetrow ytcbtns">
          ${ctx.itemId ? `<button class="btn pri" data-ytc="tx">${ICON.text} احفظه تفريغًا للمقرَّر</button>` : ''}
          <button class="btn" data-ytc="srt">${YT_IC.dl} ملف SRT</button>
          <button class="btn" data-ytc="txt">${YT_IC.dl} نصّ خالص</button>
          <button class="btn" data-ytc="copy">${MHI.copy} نسخ</button></div>`
        : '<p class="mkempty">لا توجد ترجمة ولا نصّ لهذا الفيديو. جرّب «التفريغ الآليّ» بعد تنزيل الصوت إلى مكتبتك.</p>'}
    </div>
    <div class="ytopts" data-ytgo>
      <label class="ytchk"><input type="checkbox" id="ytCut" ${c.a != null && c.b > c.a ? 'checked' : ''}> جزء فقط</label>
      <div class="ytcut" ${c.a != null && c.b > c.a ? '' : 'hidden'}>
        <input type="text" id="ytA" dir="ltr" inputmode="numeric" value="${c.a != null ? mmss(c.a) : '0:00'}" aria-label="من">
        <span>إلى</span>
        <input type="text" id="ytB" dir="ltr" inputmode="numeric" value="${c.b != null ? mmss(c.b) : mmss(info.dur)}" aria-label="إلى"></div>
      <label class="ytchk"><input type="checkbox" id="ytLib" checked> احفظ في مكتبتي</label>
      <select id="ytSec" class="ytsel">${ytSecOptions(ctx.sec)}</select>
      <label class="ytchk"><input type="checkbox" id="ytDev"> نزّله إلى جهازي أيضًا</label>
    </div>
    <div class="ytprog" hidden><div class="ytbar"><i></i></div><div class="ytmsg"></div>
      <button class="lnk danger" data-ytx="1">إلغاء</button></div>
    <div class="sheetrow" data-ytgo><button class="btn pri ytstart" data-ytstart="1">${YT_IC.dl} ابدأ التنزيل</button></div>`;
}

function ytWire(root, info, ctx) {
  const $ = s => root.querySelector(s);
  root.addEventListener('click', ev => {
    const t = ev.target.closest('[data-ytt]');
    if (t) {
      root.querySelectorAll('[data-ytt]').forEach(b => b.classList.toggle('on', b === t));
      root.querySelectorAll('[data-ytp]').forEach(p => p.hidden = p.dataset.ytp !== t.dataset.ytt);
      root.querySelectorAll('[data-ytgo]').forEach(p => p.hidden = t.dataset.ytt === 'c');
      return;
    }
    const c = ev.target.closest('[data-ytc]'); if (c) { ytCaptions(root, info, ctx, c.dataset.ytc); return; }
    if (ev.target.closest('[data-ytx]')) { if (ctx.ac) ctx.ac.abort(); return; }
    if (ev.target.closest('[data-ytstart]')) ytStart(root, info, ctx);
  });
  $('#ytCut').onchange = e => { $('.ytcut').hidden = !e.target.checked; };
  $('#ytLib').onchange = e => { $('#ytSec').disabled = !e.target.checked; };
}

function ytProg(root, frac, msg) {
  const p = root.querySelector('.ytprog'); p.hidden = false;
  p.querySelector('i').style.width = (frac == null ? 100 : Math.round(frac * 100)) + '%';
  p.querySelector('.ytbar').classList.toggle('ind', frac == null);
  if (msg != null) p.querySelector('.ytmsg').textContent = msg;
}
const ytSpeed = bps => bps ? ' — ' + mb(bps) + '/ث' : '';
const ytSafe = s => (s || 'يوتيوب').replace(/[\\/:*?"<>|\n\r]+/g, ' ').trim().slice(0, 120);

async function ytStart(root, info, ctx) {
  const tab = root.querySelector('[data-ytt].on').dataset.ytt;
  const P = ctx.plan;
  const pick = tab === 'v' ? P.vids.find(x => x.key === (root.querySelector('input[name=ytv]:checked') || {}).value)
    : P.auds.find(x => x.key === (root.querySelector('input[name=yta]:checked') || {}).value);
  if (!pick) { toast('اختر صيغة'); return; }
  const toLib = root.querySelector('#ytLib').checked, toDev = root.querySelector('#ytDev').checked;
  if (!toLib && !toDev) { toast('اختر: المكتبة أو الجهاز'); return; }
  let cut = null;
  if (root.querySelector('#ytCut').checked) {
    const a = toSec(root.querySelector('#ytA').value), b = toSec(root.querySelector('#ytB').value);
    if (a == null || b == null || b <= a) { toast('اكتب البداية والنهاية صحيحتين (دقيقة:ثانية)'); return; }
    cut = { a, b: Math.min(b, info.dur || b) };
  }
  const isAud = tab === 'a';
  const needFF = !!(cut || pick.mp3 || (!isAud && !pick.fast));
  const ext = isAud ? (pick.mp3 ? 'mp3' : pick.a.ext === 'mp4' ? 'm4a' : 'webm') : (pick.fast ? 'mp4' : pick.ext);
  const name = ytSafe(info.title) + (cut ? ` [${mmss(cut.a).replace(/:/g, '.')}-${mmss(cut.b).replace(/:/g, '.')}]` : '');

  /* إلى الجهاز فقط بلا معالجة: يتولّاه مدير التنزيل في المتصفّح مباشرة */
  if (!toLib && !needFF) {
    const f = isAud ? pick.a : pick.v;
    const a = document.createElement('a');
    a.href = ytQ(info.id, 'itag=' + f.itag + '&dl=1&name=' + encodeURIComponent(name));
    a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove();
    ytProg(root, 1, 'بدأ التنزيل في متصفّحك — تابعه من قائمة التنزيلات.');
    return;
  }

  const btn = root.querySelector('[data-ytstart]'); btn.disabled = true;
  root.querySelectorAll('.ytopts input,.ytopts select,.ytlist input,[data-ytt]').forEach(x => x.disabled = true);
  ctx.ac = new AbortController();
  const sig = ctx.ac.signal;
  try {
    const get = async (f, label) => ytFetch(ytQ(info.id, 'itag=' + f.itag), f.size, (g, t, bps, note) =>
      ytProg(root, t ? g / t : null, note || `${label}: ${mb(g)}${t ? ' من ' + mb(t) : ''}${ytSpeed(bps)}`), sig);
    let out;
    if (isAud) {
      const src = await get(pick.a, 'تنزيل الصوت');
      if (!needFF) out = src;
      else {
        await ytFF((g, n) => ytProg(root, g / n, 'تحميل أداة المعالجة (مرّة واحدة): ' + mb(g) + ' من ' + mb(n)));
        const inN = 'in.' + (pick.a.ext === 'mp4' ? 'm4a' : 'webm'), outN = 'out.' + ext;
        const args = [...(cut ? ['-ss', String(cut.a), '-to', String(cut.b)] : []), '-i', inN, '-vn',
          ...(pick.mp3 ? ['-c:a', 'libmp3lame', '-b:a', '128k'] : ['-c', 'copy']), outN];
        out = await ytRun([[inN, src]], args, outN, pick.mp3 ? 'audio/mpeg' : (ext === 'm4a' ? 'audio/mp4' : 'audio/webm'),
          f => ytProg(root, f, (pick.mp3 ? 'التحويل إلى MP3' : 'القصّ') + '… ' + AR(Math.round(f * 100)) + '٪'));
      }
    } else if (pick.fast && !cut) {
      out = await get(pick.v, 'تنزيل الفيديو');
    } else {
      const vb = await get(pick.v, 'تنزيل الصورة');
      const ab = pick.fast ? null : await get(pick.a, 'تنزيل الصوت');
      await ytFF((g, n) => ytProg(root, g / n, 'تحميل أداة الدمج (مرّة واحدة): ' + mb(g) + ' من ' + mb(n)));
      const vN = 'v.' + (pick.fast ? 'mp4' : pick.v.ext), aN = ab ? 'a.' + (pick.a.ext === 'mp4' ? 'm4a' : 'webm') : null, outN = 'out.' + ext;
      const ss = cut ? ['-ss', String(cut.a), '-to', String(cut.b)] : [];
      const args = [...ss, '-i', vN, ...(ab ? [...ss, '-i', aN, '-map', '0:v:0', '-map', '1:a:0'] : []), '-c', 'copy',
        ...(ext === 'mp4' ? ['-movflags', '+faststart'] : []), outN];
      out = await ytRun(ab ? [[vN, vb], [aN, ab]] : [[vN, vb]], args, outN, ext === 'mp4' ? 'video/mp4' : 'video/webm',
        f => ytProg(root, f, (ab ? 'الدمج' : 'القصّ') + '… ' + AR(Math.round(f * 100)) + '٪'));
    }
    if (!out || out.size < 1000) throw new Error('الملف الناتج فارغ');
    ytProg(root, null, 'أحفظ…');
    let newId = null;
    if (toLib) {
      let target = root.querySelector('#ytSec').value;
      if (target === 'new') { mhSecEnsure('secYtDl', 'تنزيلات يوتيوب'); target = 'secYtDl'; }
      const list = bucket(target) || mhSecEnsure('secYtDl', 'تنزيلات يوتيوب').items;
      const key = uid('f'); await putFile(key, out);
      const it = { id: uid('i'), type: isAud ? 'audio' : 'video', name, file: key, size: out.size, mime: out.type,
        dur: Math.round(cut ? cut.b - cut.a : info.dur) || undefined, src: 'https://youtu.be/' + info.id + (cut ? '?t=' + Math.floor(cut.a) : ''), ts: Date.now() };
      list.push(it); saveTree(); newId = it.id;
      /* التفريغ المحفوظ للفيديو يرافق نسخته المنزَّلة (إن لم تُقصّ) */
      if (ctx.itemId && !cut) { const d = txOf(ctx.itemId); if (d) saveTx(it.id, JSON.parse(JSON.stringify(d))); }
    }
    if (toDev) await saveBlob(out, name + '.' + ext);
    ytProg(root, 1, 'تمّ ✓ ' + mb(out.size) + (toLib ? ' — في مكتبتك' : ''));
    if (newId) {
      const g = document.createElement('a'); g.className = 'btn pri'; g.href = '#/i/' + newId; g.innerHTML = `${ICON.play || ''} افتحه`;
      root.querySelector('.ytprog').appendChild(g);
      g.onclick = () => { const m = root.closest('.mhmodal'); if (m && m.close) m.close(); };
    }
    root.querySelector('[data-ytx]').hidden = true;
  } catch (e) {
    ytProg(root, 0, (e.message === 'أُلغي' ? 'أُلغي التنزيل.' : 'تعذّر: ' + (e.message || e)));
  } finally {
    btn.disabled = false; ctx.ac = null;
    root.querySelectorAll('.ytopts input,.ytopts select,.ytlist input,[data-ytt]').forEach(x => x.disabled = false);
    root.querySelector('#ytSec').disabled = !root.querySelector('#ytLib').checked;
  }
}

/* ---------- الترجمة والنصّ ---------- */
async function ytCaptionSegs(yid, lang) {
  const r = await fetch(ytQ(yid, 'sub=' + encodeURIComponent(lang) + '&fmt=json'));
  const j = await r.json(); if (!j || !j.events) throw new Error((j && j.error) || 'تعذّر جلب النصّ');
  const segs = [];
  j.events.forEach(ev => {
    if (!ev.segs) return;
    const t = ev.segs.map(s => s.utf8 || '').join('').replace(/\s+/g, ' ').trim();
    if (!t) return;
    const s = (ev.tStartMs || 0) / 1000, e = s + (ev.dDurationMs || 0) / 1000;
    const last = segs[segs.length - 1];
    if (last && last.t === t) { last.e = e; return; }
    segs.push({ s: Math.round(s * 100) / 100, e: Math.round(e * 100) / 100, t });
  });
  /* النصّ الآليّ يأتي كلمات قصيرة متتابعة — نجمعها جملًا معقولة */
  const out = [];
  segs.forEach(g => {
    const l = out[out.length - 1];
    if (l && l.t.length < 90 && g.s - l.e < 1.2 && !/[.!?؟。]$/.test(l.t)) { l.t += ' ' + g.t; l.e = g.e; }
    else out.push({ ...g });
  });
  return out;
}
function ytSrt(segs) {
  const ts = x => { const ms = Math.round(x * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60;
    return [h, m, s].map(v => String(v).padStart(2, '0')).join(':') + ',' + String(ms % 1000).padStart(3, '0'); };
  return segs.map((g, i) => `${i + 1}\n${ts(g.s)} --> ${ts(g.e || g.s + 2)}\n${g.t}\n`).join('\n');
}
async function ytCaptions(root, info, ctx, what) {
  const lang = (root.querySelector('input[name=ytc]:checked') || {}).value; if (!lang) return;
  const cap = info.captions.find(c => c.lang === lang) || {};
  toast('أجلب النصّ…');
  try {
    const segs = await ytCaptionSegs(info.id, lang);
    if (!segs.length) { toast('النصّ فارغ'); return; }
    const name = ytSafe(info.title) + ' — ' + (cap.name || lang);
    if (what === 'tx') {
      if (txOf(ctx.itemId) && !confirm('للمقرَّر تفريغ محفوظ — أستبدله بهذا النصّ؟')) return;
      saveTx(ctx.itemId, { segs: segs.map(g => ({ s: g.s, t: g.t })), how: 'auto', model: 'نصّ يوتيوب — ' + (cap.name || lang), done: true, at: Date.now() });
      toast('حُفظ تفريغًا — ' + AR(segs.length) + ' مقطع');
      const m = root.closest('.mhmodal'); if (m && m.close) m.close();
      if (location.hash === '#/i/' + ctx.itemId) render();
    } else if (what === 'srt') await saveBlob(new Blob([ytSrt(segs)], { type: 'application/x-subrip' }), name + '.srt');
    else if (what === 'txt') await saveBlob(new Blob([segs.map(g => g.t).join('\n')], { type: 'text/plain;charset=utf-8' }), name + '.txt');
    else if (what === 'copy') mhCopy(segs.map(g => g.t).join('\n'), 'نُسخ النصّ');
  } catch (e) { toast('تعذّر: ' + (e.message || e)); }
}

/* ---------- ما يظهر حين لا يوجد خادم ---------- */
function ytServerHTML(err) {
  const gh = /\.github\.io$/i.test(location.hostname);
  return `<div class="ytsrv">
    <p class="mkempty">${err === 'noserver'
      ? (gh ? 'هذه نسخة GitHub، ولا تشغّل خوادم. التنزيل يعمل من موقعك على Hostinger — ضع عنوانه هنا مرّة واحدة وستنزّل من هنا أيضًا.'
            : 'افتح الموقع من استضافتك (لا كملفّ من الجهاز) ليعمل التنزيل.')
      : esc(err)}</p>
    <div class="field"><label>${YT_IC.srv} عنوان خادم التنزيل</label>
      <input type="url" id="ytApiIn" dir="ltr" placeholder="https://موقعك.com" value="${esc(S.get('ytApi', ''))}"></div>
    <div class="sheetrow"><button class="btn pri" data-ytapi="1">احفظ وجرّب</button></div></div>`;
}

/* نافذة التنزيل لفيديو بعينه */
async function ytOpen(yid, ctx) {
  ctx = ctx || {};
  const m = mhModal(`<div class="mhvhead"><b>${YT_IC.dl} تنزيل من يوتيوب</b><span style="flex:1"></span><button class="lnk" data-mhx="1">إغلاق</button></div>
    <div class="ytbody"><div class="ytload"><div class="ytbar ind"><i></i></div><p class="mkempty">أسأل يوتيوب عن الصيغ المتاحة…</p></div></div>`);
  const body = m.querySelector('.ytbody');
  const load = async () => {
    try {
      const info = await ytInfo(yid);
      body.innerHTML = ytPanelHTML(info, ctx); ytWire(body, info, ctx);
    } catch (e) {
      body.innerHTML = ytServerHTML(e.message);
      body.querySelector('[data-ytapi]').onclick = () => { S.set('ytApi', body.querySelector('#ytApiIn').value.trim()); body.innerHTML = '<p class="mkempty">أحاول…</p>'; load(); };
    }
  };
  load();
  return m;
}

/* زرّ «تنزيل» في صفحة فيديو يوتيوب */
mhAfter(h => {
  const mm = /^#\/i\/(.+)$/.exec(h); if (!mm) return;
  const r = findItem(mm[1]); if (!r || r.it.type !== 'youtube') return;
  const acts = document.querySelector('.panel .acts'); if (!acts || acts.querySelector('[data-ytdl]')) return;
  const b = document.createElement('button'); b.className = 'btn pri'; b.dataset.ytdl = r.it.id;
  b.innerHTML = `${YT_IC.dl} تنزيل`; acts.prepend(b);
});
document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-ytdl]'); if (!b) return;
  const r = findItem(b.dataset.ytdl); if (!r) return;
  const yid = ytId(r.it.url); if (!yid) { toast('رابط يوتيوب غير صالح'); return; }
  ytOpen(yid, { itemId: r.it.id, sec: r.sub ? r.sec.id + ':' + r.sub.id : r.sec.id, clip: (typeof mhClip !== 'undefined' && mhClip[r.it.id]) || null });
});

/* صفحة مستقلّة: الصق أيّ رابط */
mhRoute(h => h === '#/ytdl', () => `<a class="back" href="#/lib">${ICON.back} المكتبة</a>
  <div class="panel ytpage">
    <div class="phead"><div class="kind">أداة</div><h1>منزِّل يوتيوب</h1>
      <p>الصق رابط فيديو، واختر الجودة أو الصوت أو النصّ. يُحفظ في مكتبتك ليعمل بلا إنترنت، أو في جهازك.</p></div>
    <div class="ytpaste"><input type="url" id="ytUrl" dir="ltr" placeholder="https://youtube.com/watch?v=…">
      <button class="btn pri" data-ytgo2="1">${YT_IC.dl} افحص</button></div>
    <div class="ytbody" id="ytPageBody"></div>
    <details class="ytsrvd"><summary>${YT_IC.srv} الخادم</summary>
      <p class="mkempty">يعمل التنزيل عبر api/yt.php في استضافتك. في نسخة GitHub ضع عنوان موقعك على Hostinger.</p>
      <div class="ytpaste"><input type="url" id="ytApiIn2" dir="ltr" placeholder="${esc(ytApi() || 'https://موقعك.com')}" value="${esc(S.get('ytApi', ''))}">
        <button class="btn" data-ytapi2="1">احفظ</button></div>
      <p class="mkempty" id="ytSrvSt">${ytApi() ? 'الحاليّ: ' + esc(ytApi()) : 'لا خادم مضبوط بعد.'}</p></details>
  </div>`, () => {
  const inp = document.getElementById('ytUrl'), body = document.getElementById('ytPageBody');
  const go = async () => {
    const yid = ytId(inp.value.trim()) || (/^[A-Za-z0-9_-]{11}$/.test(inp.value.trim()) ? inp.value.trim() : '');
    if (!yid) { toast('الصق رابط يوتيوب صحيحًا'); return; }
    body.innerHTML = '<div class="ytload"><div class="ytbar ind"><i></i></div><p class="mkempty">أسأل يوتيوب عن الصيغ المتاحة…</p></div>';
    try { const info = await ytInfo(yid); const ctx = {}; body.innerHTML = ytPanelHTML(info, ctx); ytWire(body, info, ctx); }
    catch (e) { body.innerHTML = `<p class="mkempty">${e.message === 'noserver' ? 'لا خادم تنزيل — اضبطه من «الخادم» أدناه.' : esc(e.message)}</p>`; }
  };
  document.querySelector('[data-ytgo2]').onclick = go;
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
  inp.addEventListener('paste', () => setTimeout(go, 50));
  document.querySelector('[data-ytapi2]').onclick = () => {
    S.set('ytApi', document.getElementById('ytApiIn2').value.trim());
    document.getElementById('ytSrvSt').textContent = ytApi() ? 'الحاليّ: ' + ytApi() : 'لا خادم مضبوط بعد.'; toast('حُفظ');
  };
});

/* بطاقة في المكتبة */
mhAfter(h => {
  if (h !== '#/lib') return;
  setTimeout(() => {                   /* بعد أن تُرسم بطاقات المكتبة */
  const tiles = document.querySelector('.libtiles'); if (!tiles || tiles.querySelector('[href="#/ytdl"]')) return;
  const a = document.createElement('a'); a.className = 'tile libtile'; a.href = '#/ytdl';
  a.innerHTML = `<div class="ic">${YT_IC.dl}</div><div><b>منزِّل يوتيوب</b><small>فيديو بالجودة التي تريد، أو صوت، أو النصّ</small></div>`;
  tiles.appendChild(a);
  }, 0);
});
