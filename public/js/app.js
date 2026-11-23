// app.js — မြန်မာ AI Astrology (HTML/CSS/JS ပြန်ရေး, Streamlit app.py အတိုင်း)
// Tab ၅ ခု + ကံကောင်းရောင်ဘန်နာ + မဟာဘုတ် တွက်နည်း + /api/reading ခေါ်ခြင်း

// --- မြန်မာစံတော်ချိန် (UTC+6:30) ---
const TZ = 'Asia/Yangon';
const fmtDay = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'long' });
const fmtDate = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, day: '2-digit', month: 'long', year: 'numeric' });
const fmtISO = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
const today = new Date();
const todayISO = fmtISO.format(today);            // "2026-11-21"
const todayLong = fmtDate.format(today);          // "21 November 2026"
const todayEnDay = fmtDay.format(today);          // "Saturday"

const DAYS_8 = ['တနင်္ဂနွေ', 'တနင်္လာ', 'အင်္ဂါ', 'ဗုဒ္ဓဟူး', 'ရာဟု', 'ကြာသပတေး', 'သောကြာ', 'စနေ'];

// --- ကံကောင်းရောင် (app.py lucky_data အတိုင်း) ---
const LUCKY = {
  Monday:    { color: 'ဝင်းပသော အဝါရောင်',         hex: '#FFFF00', text: 'တနင်္လာ' },
  Tuesday:   { color: 'နူးညံ့သော ပန်းရောင်',        hex: '#FF8FB1', text: 'အင်္ဂါ' },
  Wednesday: { color: 'စိမ်းလန်းသော အစိမ်းရောင်',    hex: '#00FF00', text: 'ဗုဒ္ဓဟူး/ရာဟု' },
  Thursday:  { color: 'ရွှေအိုရောင်/လိမ္မော်ရောင်', hex: '#FFA500', text: 'ကြာသပတေး' },
  Friday:    { color: 'ကြည်လင်သော အပြာရောင်',      hex: '#6EA8FE', text: 'သောကြာ' },
  Saturday:  { color: 'နက်မှောင်သော ခရမ်းရောင်',     hex: '#C084FC', text: 'စနေ' },
  Sunday:    { color: 'တောက်ပသော အနီရောင်',        hex: '#FF5252', text: 'တနင်္ဂနွေ' },
};

// --- နေ့စဉ် ကံကောင်းဂဏန်း (ရက်စွဲကနေ တွက်တယ် — တစ်နေ့လုံး တူတူ, နောက်နေ့ ပြောင်း) ---
const MY_NUM = ['၀', '၁', '၂', '၃', '၄', '၅', '၆', '၇', '၈', '၉'];
const myNum = (n) => String(n).replace(/[0-9]/g, (d) => MY_NUM[+d]);
function dailyLucky(dateISO) {
  let h = 2166136261 >>> 0; // FNV-1a seed from the date
  for (const ch of dateISO) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  const picked = [];
  let x = h;
  while (picked.length < 3) {
    x = (Math.imul(x, 1103515245) + 12345) >>> 0; // LCG step
    const d = x % 10;
    if (!picked.includes(d)) picked.push(d);
  }
  return picked;
}

// --- စာသား သန့်ရှင်းရေး (clean_ai_text အတိုင်း) ---
function cleanText(t) {
  return t.replace(/\n{3,}/g, '\n').replace(/[ \t]+$/gm, '');
}

// --- Markdown အနည်းငယ် render (AI အဖြေက ###, **bold**, •, ၁။ သုံးတယ်) ---
function renderMarkdown(text) {
  const esc = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const inline = (s) => s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
  let html = '', inUl = false, inOl = false;
  const close = () => { if (inUl) { html += '</ul>'; inUl = false; } if (inOl) { html += '</ol>'; inOl = false; } };
  for (const line of esc.split('\n')) {
    const t = line.trim();
    if (!t) { close(); continue; }
    let m;
    if ((m = t.match(/^#{4}\s+(.*)/))) { close(); html += `<h4>${inline(m[1])}</h4>`; }
    else if ((m = t.match(/^#{3}\s+(.*)/))) { close(); html += `<h3>${inline(m[1])}</h3>`; }
    else if ((m = t.match(/^#{2}\s+(.*)/))) { close(); html += `<h2>${inline(m[1])}</h2>`; }
    else if ((m = t.match(/^[•\-–\*]\s+(.*)/))) { if (!inUl) { close(); html += '<ul>'; inUl = true; } html += `<li>${inline(m[1])}</li>`; }
    else if ((m = t.match(/^[0-9၀-၉]+[.)။]\s+(.*)/))) { if (!inOl) { close(); html += '<ol>'; inOl = true; } html += `<li>${inline(m[1])}</li>`; }
    else if (t === '---' || t === '***') { close(); html += '<hr>'; }
    else { close(); html += `<p>${inline(t)}</p>`; }
  }
  close();
  return html;
}

// --- မဟာဘုတ် တွက်နည်း (app.py အတိုင်း) ---
function mahabote(dobStr, birthDay) {
  const year = parseInt(dobStr.slice(0, 4), 10);
  const remainder = (year - 638) % 7;
  const weekdays = ['တနင်္ဂနွေ', 'တနင်္လာ', 'အင်္ဂါ', 'ဗုဒ္ဓဟူး', 'ကြာသပတေး', 'သောကြာ', 'စနေ'];
  const row0 = ['ပုတိ', 'သိုက်', 'မရဏ', 'အဓိပတိ', 'ရာဇ', 'အထွန်း', 'ဘင်္ဂ'];
  const lookupDay = birthDay === 'ရာဟု' ? 'ဗုဒ္ဓဟူး' : birthDay; // ရာဟု = ဗုဒ္ဓဟူး ကော်လံ
  const position = row0[(weekdays.indexOf(lookupDay) - remainder + 7) % 7];
  const enDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][
    new Date(dobStr + 'T00:00:00Z').getUTCDay()];
  const derivedDay = { Monday: 'တနင်္လာ', Tuesday: 'အင်္ဂါ', Wednesday: 'ဗုဒ္ဓဟူး', Thursday: 'ကြာသပတေး',
    Friday: 'သောကြာ', Saturday: 'စနေ', Sunday: 'တနင်္ဂနွေ' }[enDay];
  const warn = birthDay !== derivedDay && !(derivedDay === 'ဗုဒ္ဓဟူး' && birthDay === 'ရာဟု');
  return { remainder, position, derivedDay, warn };
}

// --- API ---
async function askAI(prompt) {
  const res = await fetch('/api/reading', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || ('Error ' + res.status));
  return cleanText(data.text || '');
}

// --- UI helpers ---
const $ = (id) => document.getElementById(id);
const results = {}; // tab -> ရလဒ် စာသား

// --- မှတ်တမ်း သိမ်းခြင်း (ဖုန်းထဲမှာပဲ — localStorage, DB မလို) ---
const HISTORY_KEY = 'mm_astrology_history';
const HISTORY_MAX = 20;
const TAB_TITLES = { comp: '💞 အိမ်ထောင်ဖက်', dream: '🌙 အိပ်မက်', yadaya: '🛡️ ယတြာ', horo: '✨ ဟောစာတမ်း', maha: '📜 မဟာဘုတ်' };
const DL_FILES = { comp: 'compatibility_result.txt', dream: 'dream.txt', yadaya: 'yadaya.txt', horo: 'horoscope.txt', maha: 'mahabote_astrology.txt' };

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function shortLabel(s, n) {
  const t = String(s), lim = n || 40;
  return t.length > lim ? t.slice(0, lim) + '…' : t;
}
// သန့်ရှင်း pure functions (node test အတွက်) — list ထဲ entry ထည့်/ဖျက်
function historyAdd(list, entry) {
  const next = [{ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7), ...entry }, ...list];
  return next.slice(0, HISTORY_MAX);
}
function historyDelete(list, id) { return list.filter((x) => x.id !== id); }
function loadHistory() {
  try {
    const arr = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch (e) { return []; }
}
function saveHistory(list) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(list)); } catch (e) { /* သိမ်းမရရင် — ဘာမှ မလုပ်ပါ */ }
}
function addHistory(entry) { const next = historyAdd(loadHistory(), entry); saveHistory(next); return next; }
function deleteHistory(id) { const next = historyDelete(loadHistory(), id); saveHistory(next); return next; }
function clearHistory() { saveHistory([]); }
// မေးခွန်း input တွေ ပြန်ဖြည့်တာ (reload ပြီးရင် မေးခွန်းပါ ပြန်ပေါ်အောင်)
function applyInputs(inputs) {
  if (!inputs) return;
  for (const [id, val] of Object.entries(inputs)) {
    const el = $(id);
    if (el) el.value = val;
  }
}

function renderResult(tab, text, fileName, savedNote) {
  results[tab] = text;
  const box = $('result-' + tab);
  box.innerHTML = (savedNote ? `<p class="saved-note">💾 ${escapeHtml(savedNote)}</p>` : '') +
    `<div class="result-card">${renderMarkdown(text)}</div>`;
  $('dl-' + tab).style.display = 'inline-block';
  $('dl-' + tab).onclick = () => download(text, fileName);
}

function showResult(tab, text, fileName, label, inputs) {
  renderResult(tab, text, fileName, '');
  if (label) {
    addHistory({ tab, label, text, inputs: inputs || null, date: fmtDate.format(new Date()) });
    renderHistory();
  }
}

function showError(tab, msg) {
  const box = $('result-' + tab);
  box.innerHTML = `<div class="error-box">${msg}</div>`;
}

function showWarn(tab, msg) {
  const box = $('warn-' + tab);
  box.textContent = msg;
  box.style.display = 'block';
}

function download(text, fileName) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(a.href);
}

// --- မှတ်တမ်း tab ---
function renderHistory() {
  const listEl = $('history-list');
  if (!listEl) return;
  const list = loadHistory();
  $('btn-clear-history').style.display = list.length ? 'inline-block' : 'none';
  $('history-view').innerHTML = '';
  if (!list.length) {
    listEl.innerHTML = '<p class="history-empty">မှတ်တမ်း မရှိသေးပါ — ဟောစာတမ်း ဖတ်ပြီးရင် ဒီမှာ ပေါ်လာမယ်။</p>';
    return;
  }
  listEl.innerHTML = list.map((e) => `
    <div class="history-item">
      <div class="history-meta"><span>${escapeHtml(TAB_TITLES[e.tab] || e.tab)}</span><span>${escapeHtml(e.date || '')}</span></div>
      <div class="history-label">${escapeHtml(e.label || '')}</div>
      <div class="history-actions">
        <button type="button" class="history-view-btn" data-id="${e.id}">ကြည့်မယ်</button>
        <button type="button" class="history-del-btn" data-id="${e.id}">ဖျက်မယ်</button>
      </div>
    </div>`).join('');
}

function showHistoryEntry(id) {
  const entry = loadHistory().find((x) => x.id === id);
  const view = $('history-view');
  if (!entry || !view) return;
  view.innerHTML = `<p class="saved-note">💾 ${escapeHtml(TAB_TITLES[entry.tab] || entry.tab)} — ${escapeHtml(entry.date || '')}</p>` +
    `<div class="result-card">${renderMarkdown(entry.text)}</div>` +
    `<button type="button" class="btn-dl" id="dl-history-view">📁 ရလဒ်ကိုသိမ်းမယ်</button>`;
  $('dl-history-view').onclick = () => download(entry.text, DL_FILES[entry.tab] || 'reading.txt');
  view.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function restoreLastResults() {
  const list = loadHistory();
  for (const tab of Object.keys(TAB_TITLES)) {
    const entry = list.find((x) => x.tab === tab);
    if (entry) {
      renderResult(tab, entry.text, DL_FILES[tab], 'သိမ်းထားတဲ့ အဖြေ — ' + (entry.date || ''));
      applyInputs(entry.inputs);
    }
  }
}

function runButton(btn, busy, label) {
  btn.disabled = busy;
  btn.textContent = busy ? label : btn.dataset.label;
}

// --- Tab ပြောင်းခြင်း ---
document.querySelectorAll('.tab-btn').forEach((b) => {
  b.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((x) => x.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach((x) => x.classList.remove('active'));
    b.classList.add('active');
    $('panel-' + b.dataset.tab).classList.add('active');
  });
});

// --- Tab 1: အိမ်ထောင်ဖက် ---
$('btn-comp').addEventListener('click', async (e) => {
  const uName = $('u-comp').value.trim(), pName = $('p-comp').value.trim();
  if (!uName || !pName) { showError('comp', 'အမည်နှစ်ခုလုံးကို ပြည့်စုံအောင် ဖြည့်ပေးပါ ခင်ဗျာ။'); return; }
  const btn = e.currentTarget;
  runButton(btn, true, 'နှစ်ဦးသား လိုက်ဖက်မှုကို တွက်ချက်နေပါသည်...');
  try {
    const prompt = COMPATIBILITY_TEMPLATE(SYSTEM_INSTRUCTION, uName, $('u-day-comp').value, pName, $('p-day-comp').value);
    showResult('comp', await askAI(prompt), 'compatibility_result.txt', shortLabel(uName + ' + ' + pName), { 'u-comp': uName, 'u-day-comp': $('u-day-comp').value, 'p-comp': pName, 'p-day-comp': $('p-day-comp').value });
  } catch (err) { showError('comp', err.message); }
  runButton(btn, false);
});

// --- Tab 2: အိပ်မက် ---
$('btn-dream').addEventListener('click', async (e) => {
  const dream = $('dream-input').value.trim();
  if (!dream) { showError('dream', 'အိပ်မက်ကို အရင်ရေးပေးပါ ခင်ဗျာ။'); return; }
  const btn = e.currentTarget;
  runButton(btn, true, 'သင့်အတွက် တွက်ချက်နေပါသည်...');
  try {
    showResult('dream', await askAI(DREAM_TEMPLATE(SYSTEM_INSTRUCTION, dream)), 'dream.txt', shortLabel(dream), { 'dream-input': dream });
  } catch (err) { showError('dream', err.message); }
  runButton(btn, false);
});

// --- Tab 3: ယတြာ ---
$('btn-yadaya').addEventListener('click', async (e) => {
  const uName = $('u-name').value.trim();
  if (!uName) { showError('yadaya', 'အမည် ထည့်ပေးပါ ခင်ဗျာ။'); return; }
  const btn = e.currentTarget;
  runButton(btn, true, 'သင့်အတွက် တွက်ချက်နေပါသည်...');
  try {
    showResult('yadaya', await askAI(YADAYA_TEMPLATE(SYSTEM_INSTRUCTION, uName, $('problem').value)), 'yadaya.txt', shortLabel(uName + ' — ' + $('problem').value), { 'u-name': uName, 'problem': $('problem').value });
  } catch (err) { showError('yadaya', err.message); }
  runButton(btn, false);
});

// --- Tab 4: ဟောစာတမ်း ---
$('btn-horo').addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  runButton(btn, true, 'သင့်အတွက် တွက်ချက်နေပါသည်...');
  try {
    showResult('horo', await askAI(HOROSCOPE_TEMPLATE(SYSTEM_INSTRUCTION, $('horo-day').value, todayLong)), 'horoscope.txt', shortLabel($('horo-day').value + ' နေ့ ဟောစာတမ်း'), { 'horo-day': $('horo-day').value });
  } catch (err) { showError('horo', err.message); }
  runButton(btn, false);
});

// --- Tab 5: မဟာဘုတ် ---
$('btn-maha').addEventListener('click', async (e) => {
  const dob = $('dob').value, birthDay = $('maha-day').value;
  if (!dob) { showError('maha', 'မွေးသက္ကရာဇ် ထည့်ပေးပါ ခင်ဗျာ။'); return; }
  const { remainder, position, derivedDay, warn } = mahabote(dob, birthDay);
  if (warn) {
    const dobLong = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
      .format(new Date(dob + 'T00:00:00Z'));
    showWarn('maha', `သတိပြုပါ — ရွေးထားသော နေ့နံ (${birthDay}) က မွေးသက္ကရာဇ်နှင့် မကိုက်ပါ။ ${dobLong} ရက်နေ့၏ နေ့နံမှာ ${derivedDay} ဖြစ်ပါသည်။`);
  } else { $('warn-maha').style.display = 'none'; }
  const btn = e.currentTarget;
  runButton(btn, true, 'မဟာဘုတ်ခွင် တွက်ချက်နေပါသည်...');
  try {
    const prompt = MAHABOTE_TEMPLATE(SYSTEM_INSTRUCTION, dob, birthDay, remainder, position);
    showResult('maha', await askAI(prompt), 'mahabote_astrology.txt', shortLabel(dob + ' · ' + birthDay), { 'dob': dob, 'maha-day': birthDay });
  } catch (err) { showError('maha', err.message); }
  runButton(btn, false);
});

// --- အစပြုခြင်း ---
(function init() {
  const lucky = LUCKY[todayEnDay] || LUCKY.Monday;
  const nums = dailyLucky(todayISO);
  $('banner').innerHTML =
    `✨ ယနေ့ <b>${lucky.text}</b> နေ့အတွက် ကံကောင်းစေသောအရောင်မှာ ` +
    `<b style="color: ${lucky.hex}; text-shadow: 1px 1px 2px black;">${lucky.color}</b> ဖြစ်ပါတယ် — ` +
    `ကံကောင်းဂဏန်း: <b>${nums.map(myNum).join(', ')}</b> ✨`;
  const dob = $('dob');
  dob.value = todayISO;
  dob.max = todayISO;
  dob.min = '1920-01-01';
  // Footer: visitor badge + Facebook share (လက်ရှိ URL အတိုင်း)
  const url = location.href;
  $('visitor-badge').src =
    'https://api.visitorbadge.io/api/combined?path=' + encodeURIComponent(url) +
    '&label=VISITORS&countColor=%23d4af37&style=flat';
  $('visitor-badge-link').href = 'https://visitorbadge.io/status?path=' + encodeURIComponent(url);
  $('fb-share').href = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url);
  // မှတ်တမ်း — နောက်ဆုံး အဖြေတွေ ပြန်ဖော်တာ + list ပြတာ
  restoreLastResults();
  renderHistory();
  $('history-list').addEventListener('click', (e) => {
    const viewBtn = e.target.closest('.history-view-btn');
    const delBtn = e.target.closest('.history-del-btn');
    if (viewBtn) showHistoryEntry(viewBtn.dataset.id);
    else if (delBtn) { deleteHistory(delBtn.dataset.id); renderHistory(); }
  });
  $('btn-clear-history').addEventListener('click', () => {
    if (!confirm('မှတ်တမ်း အားလုံး ဖျက်မှာလား?')) return;
    clearHistory(); renderHistory();
  });
})();

// စမ်းသပ်ဖို့ (node) — browser မှာ အကျိုးမရှိပါ
if (typeof module !== 'undefined') module.exports = { mahabote, renderMarkdown, cleanText, dailyLucky, myNum, historyAdd, historyDelete, shortLabel, escapeHtml, HISTORY_MAX, applyInputs };
