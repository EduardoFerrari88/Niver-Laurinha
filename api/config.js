// Entrega ao convite a URL e a chave PÚBLICA (anon) do Supabase, lidas das variáveis da Vercel.
module.exports = (req, res) => {
  const c = {};
  const url = (process.env.SUPABASE_URL || "").trim();
  const key = (process.env.SUPABASE_ANON_KEY || "").trim();
  if (url) c.SUPABASE_URL = url;
  if (key) c.SUPABASE_ANON_KEY = key;
  res.setHeader("Content-Type", "application/javascript; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.status(200).send("window.CFG=Object.assign(window.CFG||{}," + JSON.stringify(c) + ");");
};
