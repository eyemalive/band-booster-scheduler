// Vercel serverless function — acts as a proxy between the app and Google Apps Script
// This lives on the same domain as index.html so there are NO CORS issues at all.
// The browser talks to /api/sync (same origin), which then talks to Apps Script server-to-server.

export default async function handler(req, res) {
  // Allow requests from the same origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Read config from Vercel environment variables (set these in Vercel dashboard)
  const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
  const API_KEY         = process.env.API_KEY;

  if (!APPS_SCRIPT_URL || !API_KEY) {
    return res.status(500).json({
      ok: false,
      error: 'Server not configured. Set APPS_SCRIPT_URL and API_KEY in Vercel environment variables.'
    });
  }

  try {
    let action, payload;

    if (req.method === 'GET') {
      action  = req.query.action || 'load';
    } else {
      // POST
      const body = req.body || {};
      action  = body.action;
      payload = body.payload;
    }

    // Forward to Apps Script as a URL-encoded POST
    const params = new URLSearchParams();
    params.append('action',  action);
    params.append('key',     API_KEY);
    if (payload !== undefined) params.append('payload', typeof payload === 'string' ? payload : JSON.stringify(payload));

    const gsRes = await fetch(APPS_SCRIPT_URL, {
      method:  'POST',
      body:    params,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      redirect: 'follow',
    });

    if (!gsRes.ok) {
      return res.status(502).json({ ok: false, error: 'Apps Script returned HTTP ' + gsRes.status });
    }

    const data = await gsRes.json();
    return res.status(200).json(data);

  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
