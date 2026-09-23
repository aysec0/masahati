# -*- coding: utf-8 -*-
"""Builds site/index.html from the original _src/masahati/index.html.
Every replacement asserts its anchor exists exactly once, so the build is reproducible."""
import re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / '_src' / 'masahati' / 'index.html'
DST = ROOT / 'site' / 'index.html'
html = SRC.read_text(encoding='utf-8')

APP_VER = '3.3.1'

def rep(old, new, count=1):
    global html
    n = html.count(old)
    assert n == count, f'anchor found {n}x (expected {count}): {old[:80]!r}'
    html = html.replace(old, new)

# ---------------------------------------------------------------- head
old_head = html[html.index('<meta name="viewport"'):html.index('<script src="lib/pdf.min.js"></script>') + len('<script src="lib/pdf.min.js"></script>')]
new_head = '''<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content">
<meta name="color-scheme" content="light dark">
<meta name="theme-color" content="#0d6e5f">
<meta name="description" content="مساحتي — مكتبتك الشخصية: دروسك وملفاتك وفوائدك وجدولك في مكان واحد، تعمل على هاتفك وحاسوبك وتحفظ كل شيء في جهازك.">
<meta name="application-name" content="مساحتي">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="مساحتي">
<meta name="format-detection" content="telephone=no">
<meta property="og:title" content="مساحتي — مكتبتي الشخصية">
<meta property="og:description" content="دروسك وملفاتك وفوائدك وجدولك في مكان واحد.">
<meta property="og:type" content="website">
<meta property="og:image" content="icons/og.jpg">
<title>مساحتي</title>
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icons/favicon.svg" type="image/svg+xml">
<link rel="icon" href="icons/icon-192.png" sizes="192x192" type="image/png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link id="fontsCore" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Amiri:wght@400;700&family=Aref+Ruqaa:wght@400;700&display=swap" rel="stylesheet">
<script id="pdfjs" src="lib/pdf.min.js" defer></script>'''
html = html.replace(old_head, new_head, 1)

# keep the big designer font list available to JS (loaded lazily)
DESIGNER_FONTS_URL = re.search(r'https://fonts\.googleapis\.com/css2\?family=Amiri[^"]+', old_head).group(0)

# ---------------------------------------------------------------- css tokens
rep("""  --ui:'Tajawal','Segoe UI',Tahoma,system-ui,sans-serif;
  --serif:'Amiri','Traditional Arabic',serif;
  --disp:'Aref Ruqaa','Amiri',serif;""",
"""  --ui:'IBM Plex Sans Arabic','Tajawal','Segoe UI',Tahoma,system-ui,sans-serif;
  --serif:'Amiri','Noto Naskh Arabic','Traditional Arabic',serif;
  --disp:'Aref Ruqaa','Amiri',serif;
  --side:256px;""")

rep("header{position:sticky;top:env(safe-area-inset-top,0px);z-index:40;",
    "header{position:sticky;top:0;padding-top:env(safe-area-inset-top,0px);z-index:40;")

# ---------------------------------------------------------------- appended css
EXTRA_CSS = (ROOT / '_src' / 'extra.css').read_text(encoding='utf-8')
rep("\n</style>", "\n" + EXTRA_CSS + "\n</style>")

# ---------------------------------------------------------------- nav: icons in top nav + smarter active state
# (topnav icons now built by the source itself)
rep("""  document.querySelectorAll('[data-h]').forEach(a=>a.classList.toggle('on',a.dataset.h===h));""",
    """  const nk=navKey(h);
  document.body.dataset.route=nk;
  document.querySelectorAll('[data-h]').forEach(a=>a.classList.toggle('on',a.dataset.h===nk));""")
rep("""/* ================= router ================= */
function render(){""",
"""/* ================= router ================= */
/* أي صفحة فرعية تُضيء تبويب أصلها في الشريط */
function navKey(h){
  if(h.startsWith('#/i/')||h.startsWith('#/s/')||h==='#/lib') return '#/lib';
  if(h.startsWith('#/tg')) return '#/tg';
  if(h.startsWith('#/plan')) return '#/plan';
  if(h.startsWith('#/notes')) return '#/notes';
  if(h.startsWith('#/mind')) return '#/mind';
  if(h.startsWith('#/card')) return '#/cards';
  if(h.startsWith('#/search')) return '#/search';
  return h;
}
function render(){""")

# ---------------------------------------------------------------- proxy: Hostinger PHP first
rep("""      list.push(u=>'/api/tg?url='+encodeURIComponent(u));
      list.push(u=>'/.netlify/functions/tg?url='+encodeURIComponent(u));""",
"""      /* وسيط مساحتي على الاستضافة نفسها (Hostinger: api/tg.php) — الأسرع والأوثق */
      const base=location.pathname.replace(/[^/]*$/,'');
      list.push(u=>base+'api/tg.php?url='+encodeURIComponent(u));
      list.push(u=>base+'api/tg?url='+encodeURIComponent(u));
      list.push(u=>'/.netlify/functions/tg?url='+encodeURIComponent(u));""")


# ---------------------------------------------------------------- grabAny: a 200 page is not proof it is the right page
rep("""      const t=unwrapBody(await res.text());
      if(!t||t.length<200) throw new Error('رد فارغ');
      lastGrabLog.push('✓ '+host(target));""",
"""      const t=unwrapBody(await res.text());
      if(!t||t.length<200) throw new Error('رد فارغ');
      /* بعض الوسطاء يردّون صفحة خطأ برمز ٢٠٠، وبعض الاستضافات تردّ صفحة الموقع نفسه.
         فلا نقبل الردّ إلا إذا كان صفحة تيليجرام حقًّا — وإلا سبق الوسيط الفاسد الصحيحَ. */
      if(/(^|\\/\\/)(t|telegram)\\.me\\//i.test(url) && !/class=["'][^"']*tgme_/i.test(t))
        throw new Error('ليست صفحة تيليجرام');
      lastGrabLog.push('✓ '+host(target));""")


# ---------------------------------------------------------------- router: pages added by feature modules
rep("""  else if(h.startsWith('#/search')) html=vSearch();
  else html=vHome();""",
"""  else if(h.startsWith('#/search')) html=vSearch();
  else if((html=featRoute(h))!=null){}
  else html=vHome();""")

# ---------------------------------------------------------------- transcription: WebGPU returns garbage for these models -> always WASM
rep("""      await txAsk({ cmd: 'load', model, gpu: !!navigator.gpu }, null, 600000);""",
"""      await txAsk({ cmd: 'load', model, gpu: false }, null, 600000);   /* WebGPU يُخرج نصًّا فاسدًا لهذه النماذج */""")
rep("""  if (navigator.gpu) {
    try {""", """  if (false && navigator.gpu) {   /* WebGPU يُخرج نصًّا فاسدًا لهذه النماذج */
    try {""")
# ---------------------------------------------------------------- transcription: stream long audio instead of decoding it all at once
rep("""      const slice = new Float32Array(pcm.subarray(from, to));""",
"""      const slice = pcm.win ? await pcm.win(from, to) : new Float32Array(pcm.subarray(from, to));
      if (!slice || slice.length < 1600) break;                 /* انتهى الصوت الفعليّ */""")
rep("""          const s2 = new Float32Array(pcm.subarray(from, to));""",
"""          const s2 = pcm.win ? await pcm.win(from, to) : new Float32Array(pcm.subarray(from, to));""")

# ---------------------------------------------------------------- فوائدي: معجم + تسجيلات
rep("""  return `${head(\'فوائدي\', `${helpBtn(\'notes\')}${adv()?`<button class=\"chip\" id=\"copyAll\">نسخ الكل</button>`:\'\'}`)}
  ${writesPanel()}
  ${mindsPanel()}""",
"""  return `${head('فوائدي', `${helpBtn('notes')}${adv()?`<button class=\"chip\" id=\"copyAll\">نسخ الكل</button>`:''}`)}
  ${(typeof mhDictPanel===\'function\'?mhDictPanel():\'\')}
  ${(typeof mhRecsPanel===\'function\'?mhRecsPanel():\'\')}
  ${writesPanel()}
  ${mindsPanel()}""")

# ---------------------------------------------------------------- transcription: no false "network blocked" error while the phone screen is off
rep("""      if (Date.now() - dlT > 120000 && TXJOB.i === 0) {""",
"""      if (Date.now() - dlT > 240000 && TXJOB.i === 0 && document.visibilityState === 'visible') {""")
# ---------------------------------------------------------------- fonts system (inserted before NAV)
FONTS_JS = r'''
/* ================= الخطوط =================
   خطوط الواجهة والقراءة والعناوين تُختار من الإعدادات، وتُحمَّل عند الحاجة فقط. */
const GFAM={plex:'IBM+Plex+Sans+Arabic:wght@400;500;600;700',tajawal:'Tajawal:wght@400;500;700;800',
  almarai:'Almarai:wght@400;700;800',cairo:'Cairo:wght@400;600;700;800',readex:'Readex+Pro:wght@400;500;700',
  notokufi:'Noto+Kufi+Arabic:wght@400;500;700',alex:'Alexandria:wght@400;600;700',
  amiri:'Amiri:wght@400;700',naskh:'Noto+Naskh+Arabic:wght@400;500;600;700',sch:'Scheherazade+New:wght@400;700',
  markazi:'Markazi+Text:wght@400;500;700',lateef:'Lateef:wght@400;700',
  ruqaa:'Aref+Ruqaa:wght@400;700',kufi:'Reem+Kufi:wght@400;700',lalezar:'Lalezar',messiri:'El+Messiri:wght@400;700'};
const UIF={plex:['IBM Plex Sans Arabic','بلكس عربي'],tajawal:['Tajawal','تجوال'],almarai:['Almarai','المراعي'],
  cairo:['Cairo','القاهرة'],readex:['Readex Pro','ريدكس'],notokufi:['Noto Kufi Arabic','نوتو كوفي'],alex:['Alexandria','الإسكندرية']};
const RDF={amiri:['Amiri','أميري'],naskh:['Noto Naskh Arabic','نوتو نسخ'],sch:['Scheherazade New','شهرزاد'],
  markazi:['Markazi Text','مركزي'],lateef:['Lateef','لطيف'],ui:['','خط الواجهة نفسه']};
const DPF={ruqaa:['Aref Ruqaa','عارف رقعة'],kufi:['Reem Kufi','ريم كوفي'],lalezar:['Lalezar','لاليزار'],
  messiri:['El Messiri','المصيري'],amiri:['Amiri','أميري'],ui:['','خط الواجهة نفسه']};
const _gf=new Set(['plex','amiri','ruqaa']);
function gfLoad(keys){
  const need=(keys||[]).filter(k=>GFAM[k]&&!_gf.has(k)); if(!need.length) return;
  need.forEach(k=>_gf.add(k));
  const l=document.createElement('link'); l.rel='stylesheet';
  l.href='https://fonts.googleapis.com/css2?'+need.map(k=>'family='+GFAM[k]).join('&')+'&display=swap';
  document.head.appendChild(l);
}
/* خطوط مصمّم البطاقات كلّها — تُحمَّل حين تفتح المصمّم فقط */
function loadDesignerFonts(){
  if(document.getElementById('fontsAll')) return;
  const l=document.createElement('link'); l.id='fontsAll'; l.rel='stylesheet';
  l.href='__DESIGNER_FONTS_URL__'; document.head.appendChild(l);
  Object.keys(GFAM).forEach(k=>_gf.add(k));
}
function fontPrefs(){ return Object.assign({ui:'plex',rd:'amiri',dp:'ui'},S.get('fonts',{})||{}); }
function applyFonts(){
  const p=fontPrefs(); gfLoad([p.ui,p.rd,p.dp].filter(k=>k!=='ui'));
  const ui=(UIF[p.ui]||UIF.plex)[0];
  const rd=p.rd==='ui'? ui : (RDF[p.rd]||RDF.amiri)[0];
  const dp=p.dp==='ui'? ui : (DPF[p.dp]||DPF.ruqaa)[0];
  const r=document.documentElement.style;
  r.setProperty('--ui',`"${ui}","Tajawal","Segoe UI",Tahoma,system-ui,sans-serif`);
  r.setProperty('--serif',`"${rd}","Amiri","Traditional Arabic",serif`);
  r.setProperty('--disp',`"${dp}","Aref Ruqaa","Amiri",serif`);
}
function fontPickHTML(){
  const p=fontPrefs();
  const seg=(g,map)=>Object.entries(map).map(([k,[f,n]])=>
    `<button class="seg ${p[g]===k?'on':''}" data-font="${g}:${k}" ${f?`style="font-family:'${f}'"`:''}>${n}</button>`).join('');
  return `<div class="fieldset" style="margin-top:14px">
    <div class="field"><label>خط الواجهة</label><div class="segs fontpick">${seg('ui',UIF)}</div></div>
    <div class="field"><label>خط القراءة — النصوص والفوائد</label><div class="segs fontpick">${seg('rd',RDF)}</div></div>
    <div class="field"><label>خط العناوين</label><div class="segs fontpick">${seg('dp',DPF)}</div></div>
    <p class="hintp" style="margin:0">الخط يُحمَّل عند اختياره ويُحفظ في جهازك — وتظهر النماذج بخطّها الحقيقيّ.</p>
  </div>`;
}
document.addEventListener('click',ev=>{
  const b=ev.target.closest('[data-font]'); if(!b) return;
  const [g,k]=b.dataset.font.split(':'); const p=fontPrefs(); p[g]=k; S.set('fonts',p); applyFonts();
  b.parentElement.querySelectorAll('.seg').forEach(x=>x.classList.toggle('on',x===b));
  toast('حُفظ الخط');
});
'''.replace('__DESIGNER_FONTS_URL__', DESIGNER_FONTS_URL)
rep("\nconst NAV=[\n", FONTS_JS + "\nconst NAV=[\n")
rep("""function applyTheme(){
  document.documentElement.style.setProperty('--acc', site.acc||'#0d6e5f');""",
"""function applyTheme(){
  document.documentElement.style.setProperty('--acc', site.acc||'#0d6e5f');
  try{ applyFonts(); }catch(e){}""")
rep("""function ensureFonts(){
  if(fontsReady) return fontsReady;""",
"""function ensureFonts(){
  if(fontsReady) return fontsReady;
  try{ loadDesignerFonts(); }catch(e){}""")
# load designer fonts when entering the card pages
rep("""  if(h==='#/card'){ try{ c2Render(); c2Thumbs(); bindFreeDrag(); }catch(e){} }""",
    """  if(h==='#/card'||h==='#/cards'){ try{ loadDesignerFonts(); }catch(e){} }
  if(h==='#/card'){ try{ c2Render(); c2Thumbs(); bindFreeDrag(); }catch(e){} }
  if(h==='#/settings'){ try{ gfLoad(Object.keys(GFAM)); }catch(e){} }""")

# ---------------------------------------------------------------- pdf.js deferred: wait for it
rep("""  if(!window.pdfjsLib){
    const u=await fileURL(it.file);
    box.outerHTML=`<iframe class="viewer" src="${u}"></iframe>`; return;
  }""",
"""  if(!window.pdfjsLib) await pdfReady();
  if(!window.pdfjsLib){
    const u=await fileURL(it.file);
    box.outerHTML=`<iframe class="viewer" src="${u}"></iframe>`; return;
  }""")
rep("""async function mountPdf(box){""",
"""/* قارئ PDF يُحمَّل متأخّرًا حتى لا يعطّل فتح الموقع */
function pdfReady(){ return new Promise(r=>{
  if(window.pdfjsLib) return r();
  const s=document.getElementById('pdfjs'); if(!s) return r();
  s.addEventListener('load',()=>r(),{once:true}); s.addEventListener('error',()=>r(),{once:true});
  setTimeout(r,8000); }); }
async function mountPdf(box){""")

# ---------------------------------------------------------------- sheet: swipe to close on phone
rep("""  const born=Date.now();
  sheetEl.addEventListener('click',ev=>{ if(ev.target===sheetEl && Date.now()-born>350) closeSheet(); });
  if(wire) wire(sheetEl);
  return sheetEl;""",
"""  const born=Date.now();
  sheetEl.addEventListener('click',ev=>{ if(ev.target===sheetEl && Date.now()-born>350) closeSheet(); });
  /* على الهاتف: اسحب الورقة إلى الأسفل لتغلقها */
  try{ if(matchMedia('(max-width:819px)').matches){
    const card=sheetEl.firstElementChild; let y0=null, dy=0;
    card.addEventListener('touchstart',e=>{
      if(card.scrollTop>0 || e.target.closest('textarea,[contenteditable],input[type=range],canvas,.rich,.txlist,.mindwrap')){ y0=null; return; }
      y0=e.touches[0].clientY; dy=0; card.style.transition='none'; },{passive:true});
    card.addEventListener('touchmove',e=>{ if(y0==null) return; dy=e.touches[0].clientY-y0;
      card.style.transform = dy>0? `translateY(${dy}px)` : ''; },{passive:true});
    card.addEventListener('touchend',()=>{ if(y0==null) return; card.style.transition='';
      if(dy>90) closeSheet(); else card.style.transform=''; y0=null; },{passive:true});
  } }catch(e){}
  if(wire) wire(sheetEl);
  return sheetEl;""")

# ---------------------------------------------------------------- share (Web Share) on top of the source's own download code
rep("""function showImg(url,name){
  sheet(`<h3>احفظ الصورة</h3>
    <p style="margin:0 0 10px;font-size:12.5px;color:var(--muted)">اضغط مطوّلًا على الصورة ثم «حفظ الصورة» (أو بالزر الأيمن على الحاسوب).</p>
    <img src="${url}" style="width:100%;border-radius:14px">
    <div class="sheetrow"><button class="btn" onclick="closeSheet()">إغلاق</button></div>`);
}""",
"""function canShareFile(blob,name){
  try{ if(!navigator.share||!navigator.canShare) return false;
    return navigator.canShare({files:[new File([blob],name,{type:blob.type||'application/octet-stream'})]}); }catch(e){ return false; }
}
async function shareBlob(blob,name,title){
  try{ const f=new File([blob],name,{type:blob.type||'application/octet-stream'});
    await navigator.share({files:[f],title:title||name}); return true; }
  catch(e){ return e&&e.name==='AbortError'; }
}
function showImg(url,name,blob){
  const sh = blob && canShareFile(blob,name);
  sheet(`<h3>الصورة جاهزة</h3>
    <img src="${url}" alt="" style="width:100%;border-radius:14px;max-height:52vh;object-fit:contain;background:var(--bg2)">
    <p class="hintp" style="margin:10px 0 0">${sh?'شاركها إلى أي تطبيق، أو نزّلها، أو اضغطها مطوّلًا لحفظها في الصور.':'نزّلها، أو اضغطها مطوّلًا ثم «حفظ الصورة» (بالزر الأيمن على الحاسوب).'}</p>
    <div class="sheetrow">
      ${sh?`<button class="btn pri" id="shareImg">${ICON.ext} مشاركة</button>`:''}
      <a class="btn ${sh?'':'pri'}" href="${url}" download="${esc(name)}">${ICON.dl} تنزيل</a>
      <button class="btn" onclick="closeSheet()">إغلاق</button></div>`, el=>{
    const b=el.querySelector('#shareImg'); if(b) b.onclick=async()=>{ if(await shareBlob(blob,name)) closeSheet(); else toast('تعذّرت المشاركة — نزّلها بدلًا من ذلك'); };
  });
}""")
rep("""  if(isImg){ showImg(url,name); return; }
  /* رابط تنزيل باسمه الصحيح""",
"""  if(isImg){ showImg(url,name,blob); return; }
  /* رابط تنزيل باسمه الصحيح""")

# card designer: share button
rep("""      <button class="btn" data-c2="dl">${ICON.dl} تنزيل الصورة</button>""",
    """      <button class="btn" data-c2="dl">${ICON.dl} تنزيل الصورة</button>
      ${navigator.share?`<button class="btn" data-c2="share">${ICON.ext} مشاركة</button>`:''}""")
rep("""    off.toBlob(bl=>saveBlob(bl,'بطاقة.png',true),'image/png'); }""",
"""    off.toBlob(bl=>saveBlob(bl,'بطاقة.png',true),'image/png'); }
  else if(k==='share'){
    const {W,H}=c2Size(); const off=document.createElement('canvas'); off.width=W; off.height=H;
    const keep=C2.sel; C2.sel=null; await c2Draw(off,C2); C2.sel=keep;
    off.toBlob(async bl=>{ if(!bl) return; if(!(await shareBlob(bl,'بطاقة.png','بطاقة من مساحتي'))) saveBlob(bl,'بطاقة.png',true); },'image/png'); }""")

# ---------------------------------------------------------------- settings view: fonts, app, host check, full backup
rep("""    <div class="field"><label>وسيط الجلب من تيليجرام (اختياري)</label>
      <input type="text" id="setProxy" dir="ltr" value="${esc(site.proxy||'')}" placeholder="https://your-proxy/?url={url}">
      <p style="font-size:11.5px;color:var(--muted);line-height:1.8;margin:6px 0 0">
        يُستعمل لقراءة منشور تيليجرام وتنزيل ملفه. اتركه فارغًا لاستعمال وسطاء عامة جاهزة.</p></div>""",
"""    <div class="field"><label>وسيط الجلب من تيليجرام (اختياري)</label>
      <input type="text" id="setProxy" dir="ltr" value="${esc(site.proxy||'')}" placeholder="https://your-proxy/?url={url}">
      <p style="font-size:11.5px;color:var(--muted);line-height:1.8;margin:6px 0 0">
        على استضافتك يعمل وسيط مساحتي الخاص تلقائيًا (الملف api/tg.php) وهو الأوثق. اترك هذا فارغًا إلا إن كان لك وسيط آخر.</p></div>""")

rep("""  <div class="fieldset" style="margin-top:14px">
    <div class="field"><label>نسخة احتياطية</label>""",
"""  ${fontPickHTML()}
  <div class="fieldset" style="margin-top:14px">
    <div class="field"><label>مساحتي كتطبيق على جهازك</label>
      <p class="hintp" style="margin:0 0 10px">ثبّته على شاشة هاتفك ليفتح كتطبيق بلا شريط عناوين، ويعمل حتى بلا إنترنت.</p>
      <div class="sheetrow" style="margin:0">
        <button class="btn pri" data-pwa="install">${ICON.plus} ثبّت على الجهاز</button>
        <button class="btn" data-pwa="check">${ICON.info} فحص الاستضافة والتطبيق</button>
      </div>
      <div id="hostOut" style="font-size:12.5px;color:var(--muted);line-height:1.9;margin-top:10px"></div></div>
  </div>
  <div class="fieldset" style="margin-top:14px">
    <div class="field"><label>نسخة احتياطية</label>""")
rep("""      <div id="diagOut" style="font-size:12.5px;color:var(--muted);line-height:1.9;margin-top:10px"></div></div>
  </div>`;
}

/* ================= item view ================= */""",
"""      <div id="diagOut" style="font-size:12.5px;color:var(--muted);line-height:1.9;margin-top:10px"></div></div>
  </div>
  <p class="hintp" style="text-align:center;margin:18px 0 0">مساحتي — الإصدار __APP_VER__</p>`;
}

/* ================= item view ================= */""".replace('__APP_VER__', APP_VER))

# ---------------------------------------------------------------- home: install strip
rep("""    ${lastRow&&uiOn('cont')?`<a class="contbtn" href="#/i/${lastRow.it.id}" ${lastRow.it.type==='audio'?`data-cont="${lastRow.it.id}"`:''}>
      ${lastRow.it.type==='audio'?ICON.play:ICON.back} تابع: ${esc(lastRow.it.name)}</a>`:''}
  </section>
""",
"""    ${lastRow&&uiOn('cont')?`<a class="contbtn" href="#/i/${lastRow.it.id}" ${lastRow.it.type==='audio'?`data-cont="${lastRow.it.id}"`:''}>
      ${lastRow.it.type==='audio'?ICON.play:ICON.back} تابع: ${esc(lastRow.it.name)}</a>`:''}
  </section>
  ${installStrip()}
""")

# ask for persistent storage the first time a file is stored
rep("""async function ingest(files, target){
  const list=bucket(target); if(!list){ toast('اختر قسمًا أولًا'); return; }""",
"""async function ingest(files, target){
  const list=bucket(target); if(!list){ toast('اختر قسمًا أولًا'); return; }
  try{ if(navigator.storage&&navigator.storage.persist&&!S.get('persistAsked',false)){ S.set('persistAsked',true); navigator.storage.persist().catch(()=>{}); } }catch(e){}""")

# ---------------------------------------------------------------- PWA + host check + online/offline (before init)
PWA_JS = r'''
/* ================= التطبيق: تثبيت وتحديث وعمل بلا إنترنت ================= */
const APP_VER='__APP_VER__';
let pwaPrompt=null;
const isStandalone=()=>{ try{ return matchMedia('(display-mode: standalone)').matches || navigator.standalone===true; }catch(e){ return false; } };
const isIOS=()=>/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);
addEventListener('beforeinstallprompt',e=>{ e.preventDefault(); pwaPrompt=e;
  try{ if((location.hash||'#/')==='#/' && !document.querySelector('.pwastrip') && !document.querySelector('.sheet')) render(); }catch(_){} });
addEventListener('appinstalled',()=>{ pwaPrompt=null; S.set('pwaHide',true); toast('ثُبّت مساحتي على جهازك'); });
function installStrip(){
  try{
    if(S.get('pwaHide',false) || isStandalone() || !matchMedia('(max-width:819px)').matches) return '';
    if(!pwaPrompt && !isIOS()) return '';
    return `<div class="pwastrip"><span class="ic">${ICON.pin}</span>
      <div><b>ثبّت مساحتي على هاتفك</b><small>يفتح كتطبيق، ويعمل حتى بلا إنترنت</small></div>
      <button class="btn pri" style="min-height:34px;padding:6px 11px;font-size:12px" data-pwa="install">تثبيت</button>
      <button class="x" data-pwa="hide" aria-label="إخفاء">✕</button></div>`;
  }catch(e){ return ''; }
}
function iosInstallSheet(){
  sheet(`<h3>ثبّت مساحتي على آيفون</h3>
    <div class="helplist">
      <div class="helprow"><b>١ — افتح الموقع في سفاري</b><span>التثبيت لا يعمل من متصفح آخر على آيفون.</span></div>
      <div class="helprow"><b>٢ — اضغط زرّ المشاركة</b><span>المربّع الذي يخرج منه سهم، أسفل الشاشة.</span></div>
      <div class="helprow"><b>٣ — «إضافة إلى الشاشة الرئيسية»</b><span>ثم «إضافة» في الأعلى — وستجد أيقونة مساحتي بين تطبيقاتك.</span></div>
    </div>
    <div class="sheetrow"><button class="btn" onclick="closeSheet()">فهمت</button></div>`);
}
document.addEventListener('click',async ev=>{
  const b=ev.target.closest('[data-pwa]'); if(!b) return;
  const k=b.dataset.pwa;
  if(k==='hide'){ S.set('pwaHide',true); const s=b.closest('.pwastrip'); if(s) s.remove(); return; }
  if(k==='install'){
    if(isStandalone()){ toast('مساحتي مثبّت بالفعل على هذا الجهاز'); return; }
    if(pwaPrompt){ try{ pwaPrompt.prompt(); const r=await pwaPrompt.userChoice; if(r&&r.outcome==='accepted') pwaPrompt=null; }catch(e){} return; }
    if(isIOS()){ iosInstallSheet(); return; }
    sheet(`<h3>التثبيت على الجهاز</h3>
      <p class="mkempty">افتح الموقع في كروم أو إدج، ثم من قائمة المتصفح (⋮) اختر <b>«تثبيت التطبيق»</b> أو <b>«إضافة إلى الشاشة الرئيسية»</b>.
      ${/^https?:$/.test(location.protocol)?'':'<br><br>التثبيت يحتاج أن يكون الموقع مرفوعًا على عنوان إنترنت (https).'}</p>
      <div class="sheetrow"><button class="btn" onclick="closeSheet()">فهمت</button></div>`);
    return;
  }
  if(k==='check') hostCheck();
});
async function hostCheck(){
  const out=document.getElementById('hostOut'); if(!out) return;
  const rows=[]; const ok=(t,g,d)=>rows.push(`<div style="display:flex;gap:8px;align-items:flex-start"><span style="flex:none">${g?'✅':'⚠️'}</span><span><b>${t}</b>${d?' — '+d:''}</span></div>`);
  out.innerHTML='جارٍ الفحص…';
  const https=location.protocol==='https:';
  ok('عنوان آمن (https)', https, https? location.host : (location.protocol==='http:'?'الموقع يُفتح بلا تشفير — فعّل شهادة SSL من لوحة الاستضافة':'الموقع مفتوح كملف من الجهاز — التثبيت والتطبيق يحتاجان رفعه على استضافة'));
  let sw=false; try{ sw=!!(navigator.serviceWorker&&await navigator.serviceWorker.getRegistration()); }catch(e){}
  ok('العمل بلا إنترنت', sw, sw?'مفعّل — الموقع يفتح ولو انقطع الاتصال':'غير مفعّل بعد — أعد تحميل الصفحة مرّة');
  ok('مثبّت كتطبيق', isStandalone(), isStandalone()?'':'اضغط «ثبّت على الجهاز»');
  let px=false, pxMsg='';
  if(/^https?:$/.test(location.protocol)){
    try{ const ctl=new AbortController(); const to=setTimeout(()=>ctl.abort(),12000);
      const base=location.pathname.replace(/[^/]*$/,'');
      const r=await fetch(base+'api/tg.php?url='+encodeURIComponent('https://t.me/s/telegram'),{signal:ctl.signal}); clearTimeout(to);
      const t=await r.text(); px=r.ok&&/tgme/.test(t); pxMsg=px?'يعمل من استضافتك — جلب تيليجرام سريع وموثوق':('الردّ: '+r.status+' — تأكّد أن مجلد api مرفوع وأن PHP مفعّل');
    }catch(e){ pxMsg='لم يردّ — تأكّد أن مجلد api مرفوع بجانب index.html'; }
  } else pxMsg='يعمل بعد الرفع على الاستضافة';
  ok('وسيط تيليجرام الخاص', px, pxMsg);
  let fonts=false; try{ await document.fonts.ready; fonts=document.fonts.check('16px "IBM Plex Sans Arabic"')||document.fonts.check('16px "Amiri"'); }catch(e){}
  ok('الخطوط العربية', fonts, fonts?'محمَّلة':'لم تُحمَّل — تحقّق من الاتصال بالإنترنت');
  let persist=null; try{ if(navigator.storage&&navigator.storage.persisted) persist=await navigator.storage.persisted(); }catch(e){}
  ok('تخزين دائم للملفات', persist!==false, persist===null?'المتصفح لا يفصح':(persist?'المتصفح لن يحذف ملفاتك تلقائيًا':'قد يحذف المتصفح الملفات عند ضيق المساحة — ثبّت التطبيق أو أنشئ نسخة كاملة'));
  let est=''; try{ if(navigator.storage&&navigator.storage.estimate){ const e=await navigator.storage.estimate(); est=mb(e.usage||0)+' من '+mb(e.quota||0); } }catch(e){}
  if(est) ok('المساحة المستعملة', true, est);
  out.innerHTML=rows.join('');
}
/* عامل الخدمة: يجعل الموقع يفتح بلا إنترنت ويحدّث نفسه بهدوء */
if('serviceWorker' in navigator && /^https?:$/.test(location.protocol)){
  addEventListener('load',()=>{
    navigator.serviceWorker.register('sw.js').then(reg=>{
      reg.addEventListener('updatefound',()=>{ const nw=reg.installing; if(!nw) return;
        nw.addEventListener('statechange',()=>{ if(nw.state==='installed'&&navigator.serviceWorker.controller) updToast(); }); });
    }).catch(()=>{});
  });
}
function updToast(){
  if(document.querySelector('.updtoast.upd')) return;
  const t=document.createElement('div'); t.className='updtoast upd';
  t.innerHTML=`<span>نسخة جديدة من مساحتي جاهزة</span><button>حدّث الآن</button><button class="x" aria-label="لاحقًا">✕</button>`;
  t.querySelector('button').onclick=()=>location.reload();
  t.querySelector('.x').onclick=()=>t.remove();
  document.body.appendChild(t);
}
addEventListener('offline',()=>toast('انقطع الإنترنت — مكتبتك وملفاتك تعمل كما هي'));
addEventListener('online',()=>toast('عاد الاتصال'));
'''.replace('__APP_VER__', APP_VER)
# feature modules: every _src/feat/*.js is injected (sorted) before the app boots
FEAT_DIR = ROOT / '_src' / 'feat'
FEAT_JS = ''.join('\n/* ==== feat: %s ==== */\n' % f.name + f.read_text(encoding='utf-8') for f in sorted(FEAT_DIR.glob('*.js'))) if FEAT_DIR.exists() else ''
FEAT_CSS = ''.join('\n/* ==== feat: %s ==== */\n' % f.name + f.read_text(encoding='utf-8') for f in sorted(FEAT_DIR.glob('*.css'))) if FEAT_DIR.exists() else ''
if FEAT_CSS: rep("\n</style>", "\n" + FEAT_CSS + "\n</style>")
rep("""
try{quranEnsure();}catch(e){}
applyTheme();""", PWA_JS + FEAT_JS + """
try{quranEnsure();}catch(e){}
applyTheme();""")

# ---------------------------------------------------------------- simpler home (one-time default)
rep("""const saveUI=()=>S.set('ui',UI);""",
"""const saveUI=()=>S.set('ui',UI);
/* الصفحة الأولى أهدأ: شبكة «كل الأقسام» تُطفأ افتراضيًا (الأقسام كلّها في الشريط وقائمة «المزيد») — مرّة واحدة فقط */
if(!S.get('simpleHome',false)){ UI.bits.quick=false; S.set('simpleHome',true); saveUI(); }""")

# ---------------------------------------------------------------- التفريغ السحابيّ يُوصف كالآليّ
rep("${d.how === 'auto' ? 'فُرِّغ آليًّا (' + esc(d.model || '') + ')", "${(d.how === 'auto' || d.how === 'cloud') ? 'فُرِّغ آليًّا (' + esc(d.model || '') + ')")

# ---------------------------------------------------------------- التنبيه فوق النوافذ والأوراق كلّها
rep("inset-inline:0;margin:auto;z-index:140;width:max-content", "inset-inline:0;margin:auto;z-index:300;width:max-content")

DST.write_text(html, encoding='utf-8')
print('built', DST, len(html), 'bytes')
