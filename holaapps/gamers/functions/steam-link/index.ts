// Hola Gamers · función "steam-link" (Supabase Edge Function)
// Acciones: start (devuelve la URL de inicio de sesión de Steam), callback (Steam regresa aquí y se vincula la cuenta),
// sync (importa la biblioteca con GetOwnedGames). Secreto requerido: STEAM_API_KEY. verify_jwt = false porque
// el callback llega desde Steam sin sesión; start y sync validan el JWT del usuario aquí mismo.
import { createClient } from "npm:@supabase/supabase-js@2";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const SRV = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const KEY = Deno.env.get("STEAM_API_KEY") ?? "";
const BASE = `${URL_}/functions/v1/steam-link`;
const admin = createClient(URL_, SRV, { auth: { persistSession: false } });
const enc = new TextEncoder();

const okHost = (u: string) => {
  try {
    const h = new URL(u);
    const local = h.hostname === "localhost" || h.hostname === "127.0.0.1";
    return (["holaibague.co", "www.holaibague.co"].includes(h.hostname) && h.protocol === "https:") || local;
  } catch { return false; }
};
const cors = (req: Request) => {
  const o = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": okHost(o) ? o : "https://holaibague.co",
    "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
};
const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(req), "Content-Type": "application/json" } });

const b64u = (b: Uint8Array) => btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const hmacKey = crypto.subtle.importKey("raw", enc.encode("steam-link:" + SRV), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
const sign = async (p: string) => b64u(new Uint8Array(await crypto.subtle.sign("HMAC", await hmacKey, enc.encode(p))));
async function makeState(uid: string, ret: string) {
  const p = b64u(enc.encode(JSON.stringify({ uid, ret, exp: Date.now() + 10 * 60 * 1000 })));
  return p + "." + await sign(p);
}
async function readState(s: string) {
  const [p, sig] = s.split(".");
  if (!p || !sig || (await sign(p)) !== sig) return null;
  try {
    const d = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(p.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0))));
    return d.exp > Date.now() && okHost(d.ret) ? d : null;
  } catch { return null; }
}
async function userOf(req: Request) {
  const t = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!t) return null;
  const { data, error } = await admin.auth.getUser(t);
  return error ? null : data.user;
}

async function start(req: Request, user: { id: string }) {
  const b = await req.json().catch(() => ({}));
  const ret = String(b.ret || "");
  if (!okHost(ret)) return json(req, { error: "retorno", mensaje: "Dirección de retorno no permitida." }, 400);
  const rt = `${BASE}?action=callback&state=${await makeState(user.id, ret)}`;
  const p = new URLSearchParams({
    "openid.ns": "http://specs.openid.net/auth/2.0",
    "openid.mode": "checkid_setup",
    "openid.return_to": rt,
    "openid.realm": new URL(URL_).origin,
    "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
    "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
  });
  return json(req, { url: "https://steamcommunity.com/openid/login?" + p });
}

async function callback(url: URL) {
  const stateRaw = url.searchParams.get("state") || "";
  const st = await readState(stateRaw);
  if (!st) {
    return new Response("Enlace vencido. Vuelve a Hola Gamers e inténtalo de nuevo.", { status: 400, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
  const back = (r: string) => {
    const u = new URL(st.ret);
    u.searchParams.set("steam", r);
    return new Response(null, { status: 302, headers: { Location: u.toString() } });
  };
  const q = url.searchParams;
  if (q.get("openid.mode") !== "id_res" || q.get("openid.return_to") !== `${BASE}?action=callback&state=${stateRaw}`) return back("cancelado");
  const v = new URLSearchParams();
  q.forEach((val, k) => { if (k.startsWith("openid.")) v.set(k, val); });
  v.set("openid.mode", "check_authentication");
  const r = await fetch("https://steamcommunity.com/openid/login", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: v });
  if (!/is_valid\s*:\s*true/.test(await r.text())) return back("invalido");
  const m = /^https:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/.exec(q.get("openid.claimed_id") || "");
  if (!m) return back("invalido");
  let persona: string | null = null, avatar: string | null = null;
  try {
    const s = await (await fetch(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${KEY}&steamids=${m[1]}`)).json();
    const p = s?.response?.players?.[0];
    persona = p?.personaname ?? null; avatar = p?.avatarfull ?? null;
  } catch { /* el perfil es opcional */ }
  const { error } = await admin.from("gamers_steam").upsert(
    { user_id: st.uid, steam_id: m[1], persona, avatar, vinculado_en: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) return back(error.code === "23505" ? "en_uso" : "error");
  return back("vinculado");
}

async function sync(req: Request, user: { id: string }) {
  const { data: row } = await admin.from("gamers_steam").select("steam_id,persona,sincronizado_en").eq("user_id", user.id).maybeSingle();
  if (!row) return json(req, { error: "sin_vinculo", mensaje: "Primero vincula tu cuenta de Steam." }, 409);
  if (row.sincronizado_en && Date.now() - new Date(row.sincronizado_en).getTime() < 60000) {
    return json(req, { error: "espera", mensaje: "Acabas de sincronizar. Espera un minuto e inténtalo otra vez." }, 429);
  }
  const r = await fetch(`https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${KEY}&steamid=${row.steam_id}&include_appinfo=1&include_played_free_games=1&skip_unvetted_apps=false&format=json`);
  if (!r.ok) return json(req, { error: "steam", mensaje: "Steam no respondió. Inténtalo en unos minutos." }, 502);
  const d = (await r.json())?.response;
  if (!d || d.game_count === undefined) {
    return json(req, { error: "perfil_privado", mensaje: "No pudimos ver tu biblioteca. En Steam, pon «Detalles de juegos» en público y vuelve a intentar." }, 409);
  }
  // deno-lint-ignore no-explicit-any
  const games = (d.games || []).slice(0, 5000).map((g: any) => ({
    user_id: user.id, plataforma: "steam", app_id: String(g.appid), nombre: String(g.name || g.appid).slice(0, 200),
    minutos: g.playtime_forever || 0, ultima_vez: g.rtime_last_played ? new Date(g.rtime_last_played * 1000).toISOString() : null,
  }));
  await admin.from("gamers_biblioteca").delete().eq("user_id", user.id).eq("plataforma", "steam");
  for (let i = 0; i < games.length; i += 500) {
    const { error } = await admin.from("gamers_biblioteca").insert(games.slice(i, i + 500));
    if (error) throw error;
  }
  await admin.from("gamers_steam").update({ sincronizado_en: new Date().toISOString() }).eq("user_id", user.id);
  return json(req, { total: games.length, persona: row.persona });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
  const url = new URL(req.url);
  const action = url.searchParams.get("action");
  try {
    if (action === "callback") return await callback(url);
    if (!KEY) return json(req, { error: "sin_llave", mensaje: "Falta configurar la llave de Steam en el servidor." }, 500);
    const user = await userOf(req);
    if (!user) return json(req, { error: "sin_sesion", mensaje: "Inicia sesión para continuar." }, 401);
    if (action === "start") return await start(req, user);
    if (action === "sync") return await sync(req, user);
    return json(req, { error: "accion", mensaje: "Acción no válida." }, 400);
  } catch (e) {
    console.error(e);
    return json(req, { error: "interno", mensaje: "Algo salió mal. Inténtalo de nuevo." }, 500);
  }
});
