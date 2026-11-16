// Painel do organizador: a senha fica na Vercel (ADMIN_PASSWORD) e a chave secreta do Supabase também.
// Nada disso vai para o navegador nem para o GitHub.
const crypto = require("crypto");
const env = (k) => (process.env[k] || "").trim();
const hash = (s) => crypto.createHash("sha256").update(String(s)).digest();
const same = (a, b) => crypto.timingSafeEqual(hash(a), hash(b));
const secret = () => hash(env("ADMIN_PASSWORD") + "|" + env("SUPABASE_SERVICE_ROLE_KEY"));
const sign = (exp) => exp + "." + crypto.createHmac("sha256", secret()).update(String(exp)).digest("hex");
const valid = (t) => {
  if (typeof t !== "string") return false;
  const [e] = t.split(".");
  if (!e || !(+e > Date.now())) return false;
  return same(t, sign(e));
};
const sb = (path, opt = {}) => {
  const k = env("SUPABASE_SERVICE_ROLE_KEY");
  return fetch(env("SUPABASE_URL") + "/rest/v1/" + path, {
    ...opt,
    headers: { apikey: k, ...(k.startsWith("sb_") ? {} : { Authorization: "Bearer " + k }), "Content-Type": "application/json", ...(opt.method ? { Prefer: "return=minimal" } : {}) },
  });
};
const num = (v) => Math.max(0, Math.min(20, parseInt(v, 10) || 0));

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "metodo" });
  if (!env("ADMIN_PASSWORD") || !env("SUPABASE_URL") || !env("SUPABASE_SERVICE_ROLE_KEY")) return res.status(500).json({ error: "config" });
  let b = req.body || {};
  if (typeof b === "string") { try { b = JSON.parse(b); } catch { b = {}; } }

  if (b.action === "login") {
    await new Promise((r) => setTimeout(r, 700)); // atrasa tentativas de adivinhar a senha
    if (!same(b.password || "", env("ADMIN_PASSWORD"))) return res.status(401).json({ error: "senha" });
    return res.status(200).json({ token: sign(Date.now() + 12 * 3600 * 1000) });
  }
  if (!valid(b.token)) return res.status(401).json({ error: "sessao" });

  try {
    if (b.action === "list") {
      const [a, m] = await Promise.all([
        sb("rsvps?select=*&order=created_at.desc"),
        sb("messages?select=id,name,message,created_at,edited&order=created_at.desc"),
      ]);
      if (!a.ok || !m.ok) return res.status(502).json({ error: "banco" });
      return res.status(200).json({ rsvps: await a.json(), messages: await m.json() });
    }
    const id = String(b.id || "");
    if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: "id" });
    let r;
    if (b.action === "update") {
      const x = b.data || {}, d = {};
      if ("attending" in x) d.attending = !!x.attending;
      if ("guests" in x) d.guests = num(x.guests);
      for (const k of ["adults", "children"]) if (k in x) d[k] = x[k] === null ? null : num(x[k]);
      d.updated_at = new Date().toISOString();
      r = await sb("rsvps?id=eq." + id, { method: "PATCH", body: JSON.stringify(d) });
    } else if (b.action === "delete") r = await sb("rsvps?id=eq." + id, { method: "DELETE" });
    else if (b.action === "delete_message") r = await sb("messages?id=eq." + id, { method: "DELETE" });
    else return res.status(400).json({ error: "acao" });
    return res.status(r.ok ? 200 : 502).json({ ok: r.ok });
  } catch (e) {
    return res.status(500).json({ error: "erro" });
  }
};
