// Worker API — Gemini ခေါ်ခြင်း (StarFish /api/reading ပုံစံ, JS နဲ့)
// POST /api/reading { prompt } -> { text } | { error }
// Key: Worker secret GEMINI_API_KEY (dashboard မှာ ထည့်ရန်)

const MODELS = ['gemini-3-flash-preview', 'gemini-2.5-flash', 'gemini-3.5-flash-lite'];
const TIMEOUT_MS = 60000; // 60s — StarFish စနစ် အတိုင်း
const RETRY_CODES = [429, 404, 400, 503, 504];

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });

async function callModel(model, key, prompt) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        signal: ctrl.signal,
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data?.error?.message || `HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    const text = (data?.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');
    if (!text) throw new Error('Empty response from model');
    return text;
  } finally {
    clearTimeout(timer);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/health') return json({ status: 'ok' });

    if (url.pathname === '/api/reading' && request.method === 'POST') {
      const key = env.GEMINI_API_KEY;
      if (!key) return json({ error: 'API Key Not Found Error' }, 500);
      let body;
      try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
      if (!body.prompt) return json({ error: 'prompt လိုအပ်ပါသည်။' }, 400);

      for (const model of MODELS) {
        try {
          return json({ text: await callModel(model, key, body.prompt) });
        } catch (e) {
          if (e.status === 401 || e.status === 403) return json({ error: `API Key Error (${model}): ${e.message}` }, 500);
          const retry = RETRY_CODES.includes(e.status) ||
            /429|404|400|503|504|timed out|timeout|abort/i.test(e.message || '');
          if (retry) continue; // နောက် model စမ်းမည်
          return json({ error: `Error (${model}): ${e.message}` }, 500);
        }
      }
      return json({ error: 'ရနိုင်သမျှ AI Model အားလုံး Token Limit ပြည့်သွားပါပြီ။ ခဏနားပြီးမှ ပြန်စမ်းပေးပါ။' }, 503);
    }

    return json({ error: 'Not found' }, 404);
  },
};
