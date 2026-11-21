# Myanmar AI Astrology — HTML/CSS/JS ပြန်ရေး

Streamlit (Python) version ကို HTML/CSS/JS သက်သက်နဲ့ ပြန်ရေးထားတာ။
Tab ၅ ခု၊ prompt စာသားများ၊ မဟာဘုတ် တွက်နည်းအကုန် မူရင်း အတိုင်း။

## ဖိုင်များ

- `public/index.html` — Tab ၅ ခု ပါတဲ့ စာမျက်နှာ
- `public/css/style.css` — Dark navy + gold theme
- `public/js/prompts.js` — AI prompt စာသားများ (မပြင်ရ)
- `public/js/app.js` — Tab, ဘန်နာ, မဟာဘုတ်, API ခေါ်ခြင်း
- `src/index.js` — Worker API: `POST /api/reading` → Gemini
- `wrangler.jsonc` — Cloudflare Workers config

## Deploy (Cloudflare Workers)

1. GitHub repo အသစ်မှာ ဒီဖိုင်တွေ တင်ပါ။
2. Cloudflare Dashboard → Workers → Create → Git ချိတ်ပါ။
3. Settings → Variables → Secret ထည့်ပါ: `GEMINI_API_KEY` = Gemini API key (Runtime secret အဖြစ် ထည့်ရမယ် — Build secret သီးသန့်ဆို Worker က key ကို မမြင်ရဘူး)။
4. Deploy — URL: `https://mm-ai-astrology.kyal.workers.dev/` (Worker name: `mm-ai-astrology`)

> Git auto-deploy အတွက် "Cloudflare Workers and Pages" GitHub App ကို repo မှာ install ထားရမယ် (https://github.com/apps/cloudflare-workers-and-pages/installations/new)။ Push လုပ်ပြီး deploy မဖြစ်ရင် repo Settings → Webhooks မှာ Cloudflare webhook ရှိ/မရှိ စစ်ပါ။ (App install လုပ်ပြီးတာ 21 Nov 2026။)

Local စမ်းရန်: `npx wrangler dev` (`.dev.vars` ထဲမှာ `GEMINI_API_KEY` ထည့်ပါ)။

## မှတ်ချက်

- Gemini model အစဉ်: `gemini-3-flash-preview` → `gemini-2.5-flash` →
  `gemini-3.5-flash-lite` (429/404/400/503/504/timeout ဆို နောက် model, 401/403 ဆို ရပ်)။
  Timeout တစ်ကြိမ်စာ 60s။
- Storage မပါ — ရလဒ်က စာမျက်နှာထဲမှာပဲ ရှိပြီး .txt download လုပ်လို့ရတယ်။
  (လိုအပ်ရင် Google Drive သုံးဖို့ စဉ်းစားထားတယ်။)
- PWA (manifest/sw.js) မပါ — မူရင်း version မှာလည်း အလုပ်မလုပ်ခဲ့ပါ။
- Key: AI Studio မှာ ရှိတဲ့ key ပဲ သုံးပါ (Streamlit key …kgr0h0 က AI Studio မှာ မရှိပါ)။
