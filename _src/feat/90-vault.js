/* ================================================================
   خزنتي: داخل «بوح» قسمٌ اختياريّ للمعلومات والملفّات الشخصية.
   الاسم ورقم الجواز والهاتف، وصور الجواز والرخصة والفيزة، والإيميلات،
   وكلمات المرور (اسم الموقع والإيميل وكلمة السرّ). كلّه في جهازك وحده،
   خلف قفلٍ إن أردت.  — تنبيه: احفظه في «نسخة شاملة» فهو لا يُرفع لأحد.
   ================================================================ */
let mhVault = S.get('vault', null) || { fields: [], files: [], pw: [], lock: '' };
const saveVault = () => S.set('vault', mhVault);
let mhVaultOpen = false;
function mhVaultLocked() { return !!mhVault.lock && !mhVaultOpen; }
function mhHash(s) { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return '' + h; }

mhRoute(h => h === '#/vault', () => {
  if (mhVaultLocked()) {
    return `${head('خزنتي', `<a class="chip" href="#/boh">${ICON.back} بوح</a>`)}
      <div class="pcardx" style="text-align:center;margin:0 16px">
        <div style="margin:6px 0">${MHI.lock}</div>
        <p class="mhnote">هذه الخزنة مقفلة. اكتب كلمة السرّ لفتحها في هذه الجلسة.</p>
        <div class="field"><input type="password" id="vPw" placeholder="كلمة السرّ"></div>
        <div class="sheetrow" style="justify-content:center"><button class="btn pri" data-vlk="open">${ICON.chk} افتح</button></div>
      </div>`;
  }
  const V = mhVault;
  return `${head('خزنتي', `<a class="chip" href="#/boh">${ICON.back} بوح</a>`)}
    <div class="mhwarn" style="margin:0 16px 14px">${MHI.lock} كلّ ما هنا في جهازك وحده، لا يُرفع ولا يُشارك. احرص على «نسخة شاملة» من الإعدادات حتى لا يضيع لو مُسحت بيانات المتصفّح.</div>
    <div class="vsec"><div class="vsec-h"><b>${MHI.id} معلوماتي</b><button class="mhico" data-vadd="field">${ICON.plus}</button></div>
      ${V.fields.length ? V.fields.map((f, i) => `<div class="vrow"><span class="vlbl">${esc(f.k)}</span>
        <span class="vval" data-vcopy="${esc(f.v)}">${f.secret ? '••••••' : esc(f.v)}</span>
        ${f.secret ? `<button class="lnk" data-vreveal="${i}">${MHI.eye}</button>` : ''}
        <button class="lnk" data-vcopyb="${esc(f.v)}">${MHI.copy}</button>
        <button class="lnk danger" data-vdel="field:${i}">${MHI.trash}</button></div>`).join('')
      : '<p class="mhnote">أضِف الاسم ورقم الجواز والهاتف… اضغط +</p>'}
    </div>
    <div class="vsec"><div class="vsec-h"><b>${MHI.key} كلمات المرور</b><button class="mhico" data-vadd="pw">${ICON.plus}</button></div>
      ${V.pw.length ? V.pw.map((p, i) => `<div class="vpw"><div class="vpw-t"><b>${esc(p.site || 'موقع')}</b>
        <button class="lnk danger" data-vdel="pw:${i}">${MHI.trash}</button></div>
        <div class="vrow"><span class="vlbl">الإيميل</span><span class="vval">${esc(p.email || '—')}</span><button class="lnk" data-vcopyb="${esc(p.email || '')}">${MHI.copy}</button></div>
        <div class="vrow"><span class="vlbl">كلمة السرّ</span><span class="vval" id="vp${i}">••••••••</span>
          <button class="lnk" data-vpwreveal="${i}">${MHI.eye}</button><button class="lnk" data-vcopyb="${esc(p.pass || '')}">${MHI.copy}</button></div>
        ${p.note ? `<div class="mhnote" style="margin:2px 0 0">${esc(p.note)}</div>` : ''}</div>`).join('')
      : '<p class="mhnote">اسم الموقع والإيميل وكلمة السرّ — اضغط +</p>'}
    </div>
    <div class="vsec"><div class="vsec-h"><b>${MHI.id} ملفّاتي</b><button class="mhico" data-vadd="file">${ICON.plus}</button></div>
      <p class="mhnote" style="margin:0 0 8px">صورة الجواز والرخصة والفيزة… تُحفظ مشفّرة الوصول في جهازك.</p>
      ${V.files.length ? `<div class="vfiles">${V.files.map((f, i) => `<figure class="vfile" data-vfopen="${i}">
        ${/^image/.test(f.mime) ? `<img data-vimg="${esc(f.key)}" alt="">` : `<span class="vfico">${ICON.pdf}</span>`}
        <figcaption>${esc(f.name)}<button class="lnk danger" data-vdel="file:${i}">×</button></figcaption></figure>`).join('')}</div>` : ''}
    </div>
    <div class="sheetrow" style="margin:0 16px">
      <button class="btn" data-vlk="set">${MHI.lock} ${V.lock ? 'تغيير القفل أو إزالته' : 'اقفل الخزنة بكلمة سرّ'}</button>
    </div>`;
}, () => {
  document.querySelectorAll('[data-vimg]').forEach(async im => { const u = await fileURL(im.dataset.vimg); if (u) im.src = u; });
});
document.addEventListener('click', async ev => {
  if (ev.target.closest('[data-vaultopen]')) { location.hash = '#/vault'; return; }
  const lk = ev.target.closest('[data-vlk]');
  if (lk) {
    if (lk.dataset.vlk === 'open') { const v = document.getElementById('vPw').value;
      if (mhHash(v) === mhVault.lock) { mhVaultOpen = true; render(); } else toast('كلمة السرّ غير صحيحة'); return; }
    if (lk.dataset.vlk === 'set') { mhVaultLockSheet(); return; }
  }
  const add = ev.target.closest('[data-vadd]');
  if (add) { mhVaultAdd(add.dataset.vadd); return; }
  const cp = ev.target.closest('[data-vcopyb]'); if (cp) { mhCopy(cp.dataset.vcopyb, 'نُسخ'); return; }
  const rv = ev.target.closest('[data-vreveal]'); if (rv) { const f = mhVault.fields[+rv.dataset.vreveal];
    const vv = rv.parentElement.querySelector('.vval'); if (vv) vv.textContent = f.v; rv.remove(); return; }
  const pr = ev.target.closest('[data-vpwreveal]'); if (pr) { const el = document.getElementById('vp' + pr.dataset.vpwreveal);
    el.textContent = mhVault.pw[+pr.dataset.vpwreveal].pass || '—'; return; }
  const dl = ev.target.closest('[data-vdel]');
  if (dl) { const [t, i] = dl.dataset.vdel.split(':');
    confirmSheet('يُحذف هذا العنصر من خزنتك.', () => {
      if (t === 'file') { const f = mhVault.files[+i]; if (f) dropFile(f.key); mhVault.files.splice(+i, 1); }
      else if (t === 'pw') mhVault.pw.splice(+i, 1); else mhVault.fields.splice(+i, 1);
      saveVault();
    }); return; }
  const fo = ev.target.closest('[data-vfopen]');
  if (fo && !ev.target.closest('[data-vdel]')) { const f = mhVault.files[+fo.dataset.vfopen]; const u = await fileURL(f.key);
    if (/^image/.test(f.mime)) showImg(u, f.name); else window.open(u, '_blank'); return; }
});
function mhVaultAdd(kind) {
  if (kind === 'field') {
    const preset = ['الاسم الكامل', 'رقم الجواز', 'رقم الهوية', 'رقم الهاتف', 'تاريخ الميلاد', 'رقم الآيبان'];
    mhModal(`<div class="mhvhead"><b>معلومة</b><span style="flex:1"></span><button class="lnk" data-mhx="1">إغلاق</button></div>
      <div class="chips">${preset.map(p => `<button class="chip" data-vpreset="${esc(p)}">${p}</button>`).join('')}</div>
      <div class="field"><label>العنوان</label><input type="text" id="vk" dir="rtl" placeholder="مثلًا: رقم الجواز"></div>
      <div class="field"><label>القيمة</label><input type="text" id="vv" dir="rtl"></div>
      <label class="mhvlive"><button class="usw" data-vsecret></button><span>أخفِها افتراضيًّا (••••)</span></label>
      <div class="sheetrow"><button class="btn pri" data-vsave="1">${ICON.chk} احفظ</button></div>`, m => {
      let secret = false;
      m.addEventListener('click', e => {
        const pr = e.target.closest('[data-vpreset]'); if (pr) { m.querySelector('#vk').value = pr.dataset.vpreset; m.querySelector('#vv').focus(); return; }
        if (e.target.closest('[data-vsecret]')) { secret = !secret; e.target.closest('[data-vsecret]').classList.toggle('on', secret); return; }
        if (e.target.closest('[data-vsave]')) { const k = m.querySelector('#vk').value.trim(), v = m.querySelector('#vv').value.trim();
          if (!k || !v) { toast('أكمل الحقلين'); return; } mhVault.fields.push({ k, v, secret }); saveVault(); m.close(); render(); }
      });
    });
  } else if (kind === 'pw') {
    mhModal(`<div class="mhvhead"><b>${MHI.key} كلمة مرور</b><span style="flex:1"></span><button class="lnk" data-mhx="1">إغلاق</button></div>
      <div class="field"><label>اسم الموقع أو التطبيق (اختياري)</label><input type="text" id="pS" dir="rtl" placeholder="مثلًا: بريدي"></div>
      <div class="field"><label>الإيميل أو اسم المستخدم</label><input type="text" id="pE" dir="ltr"></div>
      <div class="field"><label>كلمة السرّ</label><input type="text" id="pP" dir="ltr"></div>
      <div class="field"><label>ملاحظة (اختياري)</label><input type="text" id="pN" dir="rtl"></div>
      <div class="sheetrow"><button class="btn pri" data-vsave="1">${ICON.chk} احفظ</button></div>`, m => {
      m.querySelector('[data-vsave]').onclick = () => {
        mhVault.pw.push({ site: m.querySelector('#pS').value.trim(), email: m.querySelector('#pE').value.trim(),
          pass: m.querySelector('#pP').value, note: m.querySelector('#pN').value.trim() });
        saveVault(); m.close(); render();
      };
    });
  } else if (kind === 'file') {
    mhPickFile('image/*,application/pdf').then(async f => {
      if (!f) return;
      const isImg = /^image/.test(f.type);
      const blob = isImg ? await shrinkImg(f, 1800) : f;
      const key = uid('vf'); await putFile(key, blob);
      mhVault.files.push({ key, name: f.name, mime: f.type }); saveVault(); render();
    });
  }
}
function mhVaultLockSheet() {
  mhModal(`<div class="mhvhead"><b>${MHI.lock} قفل الخزنة</b><span style="flex:1"></span><button class="lnk" data-mhx="1">إغلاق</button></div>
    <p class="mhnote">القفل يمنع الفضول العابر. وهو ليس تشفيرًا قويًّا — لا تعتمد عليه لأسرار خطيرة.</p>
    <div class="field"><label>كلمة سرّ جديدة (اتركها فارغة لإزالة القفل)</label><input type="password" id="vPw" dir="ltr"></div>
    <div class="field"><label>أعِدها</label><input type="password" id="vPw2" dir="ltr"></div>
    <div class="sheetrow"><button class="btn pri" data-vsavelk="1">${ICON.chk} احفظ</button></div>`, m => {
    m.querySelector('[data-vsavelk]').onclick = () => {
      const a = m.querySelector('#vPw').value, b = m.querySelector('#vPw2').value;
      if (a !== b) { toast('الكلمتان غير متطابقتين'); return; }
      mhVault.lock = a ? mhHash(a) : ''; mhVaultOpen = true; saveVault(); m.close(); render();
      toast(a ? 'أُقفلت الخزنة' : 'أُزيل القفل');
    };
  });
}
/* زرّ الخزنة داخل بوح */
mhAfter(h => {
  if (h !== '#/boh') return;
  try { if (typeof bohLocked === 'function' && bohLocked()) return; } catch (e) {}   /* لا تظهر الخزنة فوق قفل بوح */
  const view = document.getElementById('view'); if (!view || view.querySelector('.vaultcard')) return;
  const head0 = view.querySelector('.sechead') || view.querySelector('p');
  const d = document.createElement('a'); d.className = 'pcardx vaultcard'; d.href = '#/vault';
  d.style.cssText = 'margin:0 16px 12px;display:flex;gap:11px;align-items:center;text-decoration:none;color:inherit';
  d.innerHTML = `<span class="mhico" style="pointer-events:none">${MHI.lock}</span>
    <div style="flex:1"><b style="font-size:13.5px">خزنتي — معلوماتي وملفّاتي الشخصية</b>
    <small style="display:block;color:var(--muted);font-size:11.5px">جواز، هاتف، كلمات مرور، صور وثائق — في جهازك وحده</small></div>${ICON.back}`;
  if (head0) head0.after(d); else view.querySelector('article,div')?.prepend(d);
});
/* الخزنة تدخل النسخة الشاملة */
const _mhBkKeys2 = bkFileKeys;
bkFileKeys = function () {
  const keys = new Set(_mhBkKeys2());
  (mhVault.files || []).forEach(f => keys.add(f.key));
  return [...keys];
};
