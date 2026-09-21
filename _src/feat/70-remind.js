/* ================================================================
   التذكير — ثلاثة أعطال أُصلحت:
   ١) الذكر لا يظهر أبدًا: كان فحص المهامّ يسبقه ويُرجع «بقي كذا من مهامك» كلّ مرّة.
   ٢) لمسة واحدة على التذكير كانت تُسكت كل شيء نصف ساعة — ومعه أذان الصلاة.
   ٣) تنبيه الصلاة يضيع إن كانت نافذةٌ مفتوحة لحظتها: يُعلَّم «مقروءًا» قبل أن يظهر.
   وأُضيف: إشعار النظام، واستدراك ما فات حين تعود، وتصدير الأوقات إلى تقويم الهاتف
   لتنبّهك حتى والموقع مغلق.
   ================================================================ */
hideHint = function () {
  const e = document.getElementById('nowhint'); if (e) e.classList.remove('on');
  clearTimeout(hintHideT);
};
function mhHint(html, cls, ms, force) {
  if (!force) {
    if (!plan.hint.on) return false;
    if (typeof uiOn === 'function' && !uiOn('hint')) return false;
    if (Date.now() < (S.get('hintOff', 0) || 0)) return false;
    if (document.querySelector('.mhmodal')) return false;
  }
  const e = hintEl();
  e.className = 'nowhint ' + (cls || '');
  e.innerHTML = html + '<i class="x">×</i>';
  requestAnimationFrame(() => e.classList.add('on'));
  clearTimeout(hintHideT);
  hintHideT = setTimeout(() => e.classList.remove('on'), ms || Math.max(4, +plan.hint.secs || 5) * 1000);
  return true;
}
showHint = function (html, cls, ms) { return mhHint(html, cls, ms, false); };

/* الذكر والفائدة: كلٌّ في موعده، ولا تقطعه المهامّ */
let mhZk = 0;
hintTick = function () {
  if (mhZk++ % 3 === 2) { const m = museHint(); if (m && showHint(m, 'muse')) return; }
  zikrHint();
};
zikrHint = function () {
  if (plan.hint.zikr === false) return;
  zIdx = (zIdx + 1) % AZKAR.length;
  showHint(`<b>ذِكر</b><span>${esc(AZKAR[zIdx])}</span>`, 'muse', Math.max(5, +plan.hint.secs || 5) * 1000);
};

/* المهامّ: تنبيه قبلها بدقائق، وتنبيه عند بدئها — مرّة واحدة لكلّ منهما */
function mhTaskWatch() {
  try {
    const { cur, nxt } = nowNext();
    const seen = S.get('taskSeen', {}), day = ymd(new Date());
    Object.keys(seen).forEach(k => { if (!k.startsWith(day)) delete seen[k]; });
    if (cur) { const k = day + ':now:' + cur.t.id + ':' + cur.s;
      if (!seen[k] && showHint(`<b>الآن</b><span>${esc(cur.t.title)}</span><small>حتى ${clock(cur.e)}</small>`, 'task', 8000)) { seen[k] = 1; try { beep(1); } catch (e) {} } }
    if (nxt) { const before = +plan.hint.before || 10, d = nxt.s - nowMin(), k = day + ':pre:' + nxt.t.id + ':' + nxt.s;
      if (d <= before && d > 0 && !seen[k] && showHint(`<b>بعد ${AR(Math.max(1, Math.round(d)))} دقيقة</b><span>${esc(nxt.t.title)}</span><small>${clock(nxt.s)}</small>`, 'task', 8000)) seen[k] = 1; }
    S.set('taskSeen', seen);
  } catch (e) {}
}

/* ---------- الصلاة: تنبيهٌ لا يضيع ---------- */
function mhPrayCheck(catchUp) {
  try {
    if (plan.hint.pray === false) return;
    const m = prayTimes(new Date()); if (!m) return;
    const n = nowMin(), k = ymd(new Date());
    const seen = S.get('praySeen', {});
    Object.keys(seen).forEach(x => { if (!x.startsWith(k)) delete seen[x]; });
    const pre = +plan.hint.prayPre || 0;
    PRAY.forEach(([key, name]) => {
      if (key === 'sunrise') return;
      const t = m[key]; if (t == null) return;
      const id = k + ':' + key;
      const win = catchUp ? 30 : 20;
      if (n >= t && n < t + win && !seen[id]) {
        const late = Math.round(n - t);
        const body = late >= 2 ? `دخل وقت صلاة ${name} منذ ${AR(late)} دقيقة` : `حان وقت صلاة ${name}`;
        mhHint(`<b>الصلاة</b><span>${body}</span><small>${clock(t)}</small>`, 'pray', 15000, true);
        seen[id] = 1; S.set('praySeen', seen);
        try { beep(3); } catch (e) {}
        mhNotify('حان وقت صلاة ' + name, clock(t) + ' — ' + (site.name || 'مساحتي'), 'pray-' + key);
        try { if (navigator.vibrate) navigator.vibrate([300, 150, 300]); } catch (e) {}
      }
      if (pre > 0) {
        const pid = k + ':pre:' + key;
        if (n >= t - pre && n < t && !seen[pid]) {
          seen[pid] = 1; S.set('praySeen', seen);
          mhHint(`<b>قريبًا</b><span>بعد ${AR(Math.round(t - n))} دقائق صلاة ${name}</span><small>${clock(t)}</small>`, 'pray', 9000, true);
        }
      }
    });
  } catch (e) {}
}
prayWatch = function () { mhPrayCheck(false); };
function mhNotify(title, body, tag) {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    if (document.visibilityState === 'visible' && document.hasFocus()) return;   /* الشريط العلويّ يكفي */
    const opt = { body, tag, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', renotify: true, vibrate: [300, 150, 300] };
    if (navigator.serviceWorker && navigator.serviceWorker.controller)
      navigator.serviceWorker.ready.then(r => r.showNotification(title, opt)).catch(() => { new Notification(title, opt); });
    else new Notification(title, opt);
  } catch (e) {}
}
startHints = function () {
  clearInterval(hintTimer); clearInterval(minTimer);
  const e = document.getElementById('nowhint'); if (e) e.classList.remove('on');
  /* الصلاة مستقلّة عن الذكر: تعمل ولو أوقفت التذكير العائم */
  minTimer = setInterval(() => { mhPrayCheck(false); if (plan.hint.on) mhTaskWatch(); }, 20000);
  setTimeout(() => { mhPrayCheck(true); if (plan.hint.on) mhTaskWatch(); }, 3000);
  if (!plan.hint.on || (typeof uiOn === 'function' && !uiOn('hint'))) return;
  hintTimer = setInterval(hintTick, Math.max(1, +plan.hint.every || 10) * 60000);
  setTimeout(() => { try {
    if (plan.hint.pray === false || prayTimes(new Date()) || S.get('prayAsk', false)) return;
    S.set('prayAsk', true);
    showHint('<b>أوقات الصلاة</b><span>اختر مدينتك ليُنبّهك الموقع بدخول الوقت</span><small>الجدول ← أوقات الصلاة</small>', 'task', 8000);
  } catch (e) {} }, 9000);
};
/* حين تعود إلى الموقع: ما فاتك من الصلاة يُذكر لك */
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') setTimeout(() => mhPrayCheck(true), 600); });

/* ---------- تصدير أوقات الصلاة إلى تقويم الهاتف: تنبّهك والموقع مغلق ---------- */
function mhPrayICS(days) {
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Masahati//Pray//AR', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:أوقات الصلاة'];
  const d0 = new Date(); d0.setHours(0, 0, 0, 0);
  const p2 = n => String(n).padStart(2, '0');
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  for (let i = 0; i < days; i++) {
    const d = new Date(d0.getTime() + i * 86400000);
    const m = prayTimes(d); if (!m) continue;
    PRAY.forEach(([key, name]) => {
      if (key === 'sunrise' || m[key] == null) return;
      const mm = Math.round(m[key]), dt = `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}T${p2(Math.floor(mm / 60))}${p2(mm % 60)}00`;
      L.push('BEGIN:VEVENT', `UID:${ymd(d)}-${key}@masahati`, `DTSTAMP:${stamp}`, `DTSTART:${dt}`, 'DURATION:PT15M',
        `SUMMARY:صلاة ${name}`, 'TRANSP:TRANSPARENT',
        'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:حان وقت صلاة ${name}`, 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT');
    });
  }
  L.push('END:VCALENDAR');
  return L.join('\r\n');
}
function mhPrayTools() {
  const perm = ('Notification' in window) ? Notification.permission : 'unsupported';
  return `<div class="pcardx mhpray" style="margin:12px 0 0">
    <h3 class="mini">${ICON.cal} تنبيه الصلاة</h3>
    <div class="sheetrow" style="margin:0">
      ${perm === 'unsupported' ? '' : `<button class="btn ${perm === 'granted' ? '' : 'pri'}" data-mhp="notif">${perm === 'granted' ? '✓ إشعارات الجهاز مفعّلة' : 'فعّل إشعارات الجهاز'}</button>`}
      <button class="btn" data-mhp="ics">${ICON.dl} أضِف الأوقات إلى تقويم هاتفي</button>
    </div>
    <div class="urow"><span class="ulbl">نبّهني قبل الأذان بعشر دقائق أيضًا</span>
      <button class="usw ${+plan.hint.prayPre ? 'on' : ''}" data-mhp="pre"></button></div>
    <p class="mhnote">الموقع يُنبّهك ما دام مفتوحًا. أمّا <b>التقويم</b> فيُنبّهك حتى والهاتف مقفل والموقع مغلق — لثلاثين يومًا، ثمّ صدّرها من جديد.</p>
  </div>`;
}
document.addEventListener('click', async ev => {
  const b = ev.target.closest('[data-mhp]'); if (!b) return;
  const k = b.dataset.mhp;
  if (k === 'notif') {
    try { const r = await Notification.requestPermission();
      toast(r === 'granted' ? 'ستصلك إشعارات الصلاة' : 'لم يُسمح بالإشعارات — من إعدادات المتصفّح');
      b.textContent = r === 'granted' ? '✓ إشعارات الجهاز مفعّلة' : 'فعّل إشعارات الجهاز'; } catch (e) {}
    return;
  }
  if (k === 'ics') {
    if (!prayTimes(new Date())) { toast('اختر مدينتك أوّلًا'); return; }
    saveBlob(new Blob([mhPrayICS(30)], { type: 'text/calendar' }), 'أوقات-الصلاة.ics', false);
    toast('افتح الملف واختر «إضافة الكلّ» في التقويم');
    return;
  }
  if (k === 'pre') { plan.hint.prayPre = +plan.hint.prayPre ? 0 : 10; savePlan(); b.classList.toggle('on', !!plan.hint.prayPre); return; }
});
const _mhPrayConfig = prayConfig;
prayConfig = function () {
  _mhPrayConfig.apply(this, arguments);
  const card = document.querySelector('.sheet .sheetcard'); if (!card) return;
  const row = card.querySelector('.sheetrow:last-of-type');
  const d = document.createElement('div'); d.innerHTML = mhPrayTools();
  (row || card.lastElementChild).before(d.firstElementChild);
};
/* في صفحة الجدول، تحت إعدادات التذكير */
mhAfter(h => {
  if (!h.startsWith('#/plan')) return;
  const ho = document.getElementById('hintOn'); if (!ho || document.querySelector('.mhpray')) return;
  const card = ho.closest('.pcardx') || ho.parentElement;
  const d = document.createElement('div'); d.innerHTML = mhPrayTools(); card.after(d.firstElementChild);
});
