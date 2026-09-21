/* ================================================================
   معجم الكلمات: أثناء القراءة اكتب الكلمة ومعناها، فتُحفظ في فوائدي.
   ================================================================ */
let mhDict = S.get('dict', []);
const saveDict = () => S.set('dict', mhDict);
function mhDictAdd(pre) {
  pre = pre || {};
  mhModal(`<div class="mhvhead"><b>${MHI.dict} أضف إلى معجمي</b><span style="flex:1"></span><button class="lnk" data-mhx="1">إغلاق</button></div>
    <div class="field"><label>الكلمة</label><input type="text" id="dW" dir="rtl" value="${esc(pre.w || '')}" placeholder="الكلمة أو المصطلح"></div>
    <div class="field"><label>المعنى</label><textarea id="dM" dir="rtl" placeholder="معناها بعبارتك، أو ما فهمته منها…"></textarea></div>
    <div class="field"><label>مثال أو شاهد (اختياري)</label><input type="text" id="dE" dir="rtl" placeholder="جملة ترد فيها"></div>
    <div class="sheetrow"><button class="btn pri" data-da="save">${ICON.chk} احفظ</button>
      <button class="btn" data-da="mic">${MHI.mic} أملِ المعنى</button>
      <button class="btn" onclick="this.closest('.mhmodal').remove()">إغلاق</button></div>`, m => {
    setTimeout(() => m.querySelector('#dW').focus(), 80);
    m.addEventListener('click', ev => {
      const b = ev.target.closest('[data-da]'); if (!b) return;
      if (b.dataset.da === 'mic') { mhVoice(m.querySelector('#dM')); return; }
      const w = m.querySelector('#dW').value.trim(); if (!w) { toast('اكتب الكلمة'); return; }
      mhDict.unshift({ id: uid('d'), w, m: m.querySelector('#dM').value.trim(), ex: m.querySelector('#dE').value.trim(),
        item: pre.item || null, p: pre.p || null, at: Date.now() });
      saveDict(); m.close(); toast('أُضيفت إلى معجمك');
      if (location.hash === '#/dict') render();
    });
  });
}
/* عرض المعجم */
mhRoute(h => h === '#/dict', () => {
  const q = norm(S.get('dictQ', ''));
  const list = q ? mhDict.filter(d => norm(d.w + ' ' + d.m).includes(q)) : mhDict;
  return `${head('معجمي', `<button class="chip" data-dictnew="1">${ICON.plus} كلمة</button>`)}
    <p class="mhnote" style="margin:0 16px 12px">كلماتٌ جمعتَها من قراءتك ومعانيها — ${AR(mhDict.length)} كلمة.</p>
    ${mhDict.length ? `<div class="sbox" style="margin:0 16px 12px"><input type="text" id="dictQ" placeholder="ابحث في معجمك…" value="${esc(S.get('dictQ', ''))}">${ICON.search}</div>
      <div class="dictlist">${list.map(mhDictCard).join('') || '<div class="empty2s">لا شيء يطابق.</div>'}</div>`
      : `<div class="empty">معجمك فارغ.<br>أثناء قراءة أي ملفّ، حدّد كلمة واضغط «معجمي»، أو اضغط زرّ المعجم في أدوات القراءة.<br><br>
        <button class="btn pri" data-dictnew="1">${ICON.plus} أضف كلمة</button></div>`}`;
}, () => {
  const q = document.getElementById('dictQ'); if (q) q.oninput = () => { S.set('dictQ', q.value);
    const v = norm(q.value); document.querySelectorAll('.dictcard').forEach(c => c.style.display = !v || norm(c.dataset.q).includes(v) ? '' : 'none'); };
});
function mhDictCard(d) {
  const r = d.item ? findItem(d.item) : null;
  return `<div class="dictcard" data-q="${esc(d.w + ' ' + d.m)}">
    <div class="dictw"><b>${esc(d.w)}</b>${r ? `<a class="nbref" href="#/i/${d.item}">${esc(r.it.name)}${d.p ? ' · ص' + AR(d.p) : ''}</a>` : ''}
      <span style="flex:1"></span>
      <button class="lnk" data-dicte="${d.id}">${ICON.pen}</button>
      <button class="lnk danger" data-dictd="${d.id}">حذف</button></div>
    ${d.m ? `<div class="dictm">${esc(d.m)}</div>` : ''}
    ${d.ex ? `<div class="dictex">«${esc(d.ex)}»</div>` : ''}</div>`;
}
document.addEventListener('click', ev => {
  if (ev.target.closest('[data-dictnew]')) { mhDictAdd({}); return; }
  const e = ev.target.closest('[data-dicte]');
  if (e) { const d = mhDict.find(x => x.id === e.dataset.dicte); if (!d) return;
    mhModal(`<div class="mhvhead"><b>${MHI.dict} تعديل</b><span style="flex:1"></span><button class="lnk" data-mhx="1">إغلاق</button></div>
      <div class="field"><label>الكلمة</label><input type="text" id="eW" dir="rtl" value="${esc(d.w)}"></div>
      <div class="field"><label>المعنى</label><textarea id="eM" dir="rtl">${esc(d.m || '')}</textarea></div>
      <div class="field"><label>مثال</label><input type="text" id="eE" dir="rtl" value="${esc(d.ex || '')}"></div>
      <div class="sheetrow"><button class="btn pri" data-ds="1">${ICON.chk} حفظ</button><button class="btn" onclick="this.closest('.mhmodal').remove()">إلغاء</button></div>`, m => {
      m.querySelector('[data-ds]').onclick = () => { d.w = m.querySelector('#eW').value.trim() || d.w; d.m = m.querySelector('#eM').value.trim(); d.ex = m.querySelector('#eE').value.trim(); saveDict(); m.close(); render(); };
    }); return; }
  const del = ev.target.closest('[data-dictd]');
  if (del) { const d = mhDict.find(x => x.id === del.dataset.dictd);
    confirmSheet('تُحذف هذه الكلمة من معجمك.', () => { mhDict = mhDict.filter(x => x !== d); saveDict(); }); }
});
/* بطاقة المعجم داخل فوائدي */
function mhDictPanel() {
  if (!mhDict.length) return '';
  return `<div class="sechead"><h2>${MHI.dict} معجمي</h2><div class="ln"></div><a href="#/dict">الكل (${AR(mhDict.length)})</a></div>
    <div class="dictlist">${mhDict.slice(0, 3).map(mhDictCard).join('')}</div>`;
}
