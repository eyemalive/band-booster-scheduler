// Vercel serverless proxy — forwards requests to Google Apps Script.
// Runs server-side so there are no CORS issues.

export const config = {
  api: {
    bodyParser: true,
  },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
  const API_KEY         = process.env.API_KEY;

  // ── Diagnostic endpoint ──────────────────────────────────────
  if (req.method === 'GET' && req.query.diag) {
    return res.status(200).json({
      ok: true,
      configured: !!(APPS_SCRIPT_URL && API_KEY),
      hasUrl: !!APPS_SCRIPT_URL,
      hasKey: !!API_KEY,
      urlPreview: APPS_SCRIPT_URL ? APPS_SCRIPT_URL.slice(0, 60) + '…' : null,
    });
  }

  if (!APPS_SCRIPT_URL || !API_KEY) {
    return res.status(500).json({
      ok: false,
      error: 'Vercel env vars not set. Add APPS_SCRIPT_URL and API_KEY in Vercel → Settings → Environment Variables, then redeploy.',
    });
  }

  try {
    let action, payload, tab;
    if (req.method === 'GET') {
      action  = req.query.action || 'load';
      payload = req.query.payload;
      tab     = req.query.tab;
    } else {
      const body = req.body || {};
      action  = body.action;
      payload = body.payload;
      tab     = body.tab;   // 'AppData' | 'AppDataGeneral' | 'AppPasswords'
    }

    if (!action) return res.status(400).json({ ok: false, error: 'No action specified.' });

    const params = new URLSearchParams();
    params.append('action', action);
    params.append('key', API_KEY);
    if (tab)     params.append('tab', tab);
    if (payload !== undefined) {
      params.append('payload', typeof payload === 'string' ? payload : JSON.stringify(payload));
    }

    const gsRes = await fetch(APPS_SCRIPT_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    params.toString(),
      redirect: 'follow',
    });

    if (!gsRes.ok) {
      const text = await gsRes.text().catch(() => '');
      return res.status(502).json({ ok: false, error: `Apps Script returned HTTP ${gsRes.status}. Response: ${text.slice(0, 200)}` });
    }

    const text = await gsRes.text();
    let data;
    try { data = JSON.parse(text); }
    catch (e) { return res.status(502).json({ ok: false, error: `Apps Script returned non-JSON: ${text.slice(0, 200)}` }); }

    return res.status(200).json(data);

  } catch (err) {
    return res.status(500).json({ ok: false, error: `Proxy error: ${err.message}` });
  }
}
