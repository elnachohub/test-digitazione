/**
 * Tickless server — one process, zero database.
 *
 *   node server.mjs        →  http://localhost:8787/console.html
 *
 * - serves the site, console, demo and widget
 * - realtime op-log sync over Server-Sent Events (agents see everything,
 *   each visitor only their own conversations, never internal notes)
 * - validates every widget operation: visitors can't touch other people's
 *   conversations, settings or the knowledge base
 * - AI answers + agent assist through Claude (ai.mjs), if a key is set
 *
 * Env: PORT, TICKLESS_ADMIN_TOKEN, TICKLESS_DATA (dir), TICKLESS_SEED=demo|empty,
 *      TICKLESS_ALLOWED_ORIGINS (comma list, default *), ANTHROPIC_API_KEY, TICKLESS_MODEL
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { createAI } from "./ai.mjs";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, "..");
const Core = require("../core.js");
const Seed = require("../seed.js");

const PORT = +process.env.PORT || 8787;
const DATA = process.env.TICKLESS_DATA || path.join(here, "data");
const WS_ID = "demo";
const ORIGINS = (process.env.TICKLESS_ALLOWED_ORIGINS || "*").split(",").map((s) => s.trim());
const ADMIN_TOKEN = process.env.TICKLESS_ADMIN_TOKEN || crypto.randomBytes(18).toString("base64url");
const ai = createAI();

/* ------------------------------------------------------------ storage */
fs.mkdirSync(DATA, { recursive: true });
const stateFile = path.join(DATA, WS_ID + ".json");
const visitorsFile = path.join(DATA, WS_ID + ".visitors.json");
const readJSON = (f) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch (e) { return null; } };

function freshState() {
  if (process.env.TICKLESS_SEED === "empty") {
    const s = Core.emptyState(WS_ID);
    s.settings = Core.clone(Seed.SETTINGS);
    s.settings.hours.always = false;
    return s;
  }
  return Seed.workspace(Date.now());
}
let state = readJSON(stateFile) || freshState();
const visitors = readJSON(visitorsFile) || {}; // vid -> sha256(key)

let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    for (const [file, data] of [[stateFile, state], [visitorsFile, visitors]]) {
      const tmp = file + ".tmp";
      fs.writeFileSync(tmp, JSON.stringify(data));
      fs.renameSync(tmp, file);
    }
  }, 400);
}
save();

/* ------------------------------------------------------------ realtime */
const admins = new Set();          // SSE responses
const widgets = new Map();         // vid -> Set(SSE responses)
const send = (res, op) => res.write(`data: ${JSON.stringify(op)}\n\n`);
setInterval(() => {
  for (const r of admins) r.write(": ping\n\n");
  for (const set of widgets.values()) for (const r of set) r.write(": ping\n\n");
}, 25000).unref();

function ownerOf(convId) { const c = state.conversations[convId]; return c && c.visitor ? c.visitor.id : null; }

/** What (if anything) a widget should receive for this op. */
function forWidget(op) {
  switch (op.t) {
    case "msg.add": return op.msg.role === "note" ? null : op;
    case "conv.update": {
      const patch = {};
      for (const k of Core.WIDGET_PATCH_FIELDS.concat(["assignee", "assigneeName"])) if (k in op.patch) patch[k] = op.patch[k];
      return Object.keys(patch).length ? Object.assign({}, op, { patch }) : null;
    }
    case "typing": return op.who === "agent" ? { t: "typing", convId: op.convId, who: "agent", name: op.name, on: op.on } : null;
    case "settings.update": { const patch = Object.assign({}, op.patch); delete patch.costPerTicket; return Object.assign({}, op, { patch }); }
    case "kb.upsert": return op.item.status === "draft" ? { t: "kb.delete", id: op.item.id, at: op.at } : op;
    case "flow.upsert": return op.item.enabled === false ? { t: "flow.delete", id: op.item.id, at: op.at } : op;
    case "kb.delete": case "flow.delete": case "incident.upsert": case "incident.delete": return op;
    default: return null;
  }
}

function broadcast(op) {
  for (const r of admins) send(r, op);
  const w = forWidget(op);
  if (!w) return;
  if (w.convId) { for (const r of widgets.get(ownerOf(w.convId)) || []) send(r, w); }
  else for (const set of widgets.values()) for (const r of set) send(r, w);
}

/* ------------------------------------------------------------ validation */
const str = (v, max) => typeof v === "string" && v.length <= max;
const hash = (k) => crypto.createHash("sha256").update(String(k)).digest("hex");

function visitorOK(vid, key, register) {
  if (!str(vid, 64) || !str(key, 128) || !vid || !key) return false;
  const h = hash(key);
  if (!visitors[vid]) { if (!register) return false; visitors[vid] = h; save(); return true; }
  return crypto.timingSafeEqual(Buffer.from(visitors[vid]), Buffer.from(h));
}

/** Returns a sanitized op or throws. Widgets may only act on their own conversations. */
function checkWidgetOp(op, vid) {
  if (!op || typeof op !== "object") throw new Error("bad op");
  const own = (id) => { if (ownerOf(id) !== vid) throw new Error("not your conversation"); };
  const now = Date.now();
  switch (op.t) {
    case "conv.create": {
      const c = op.conv || {};
      if (!str(c.id, 64) || state.conversations[c.id]) throw new Error("bad id");
      const v = c.visitor || {};
      const visitor = { id: vid };
      for (const k of ["name", "email", "plan", "page", "device", "tz", "locale"]) if (str(v[k], 200)) visitor[k] = v[k];
      return { t: "conv.create", at: now, origin: op.origin, conv: { id: c.id, createdAt: now, channel: "web", status: "bot", lang: Core.LANGS.includes(c.lang) ? c.lang : "en", visitor, messages: [] } };
    }
    case "msg.add": {
      own(op.convId);
      const m = op.msg || {};
      const kindOK = m.role !== "note" || (m.meta && m.meta.kind === "summary");
      if (!["visitor", "bot", "note", "system"].includes(m.role) || !kindOK || !str(m.id, 64) || !str(m.text, 6000)) throw new Error("bad message");
      let text = m.text;
      if (m.role === "visitor" && state.settings.privacy && state.settings.privacy.redact) text = Core.redactPII(text).text;
      return { t: "msg.add", convId: op.convId, at: now, origin: op.origin, msg: { id: m.id, role: m.role, text, at: now, meta: m.meta && typeof m.meta === "object" ? m.meta : undefined } };
    }
    case "conv.update": {
      own(op.convId);
      const patch = {};
      for (const k of Core.WIDGET_PATCH_FIELDS) if (op.patch && k in op.patch) patch[k] = op.patch[k];
      if ("status" in patch && !["bot", "open", "resolved"].includes(patch.status)) throw new Error("bad status");
      if ("csat" in patch && !(Number.isInteger(patch.csat) && patch.csat >= 1 && patch.csat <= 5)) throw new Error("bad rating");
      if ("priority" in patch && !["normal", "high", "urgent"].includes(patch.priority)) delete patch.priority;
      if ("resolvedBy" in patch && ![null, "bot"].includes(patch.resolvedBy)) throw new Error("bad resolver");
      if (patch.visitor) {
        const v = {};
        for (const k of ["name", "email", "plan", "page", "device", "tz", "locale"]) if (str(patch.visitor[k], 200)) v[k] = patch.visitor[k];
        patch.visitor = Object.assign({}, state.conversations[op.convId].visitor, v, { id: vid });
      }
      for (const k of ["escalatedAt", "resolvedAt"]) if (k in patch && patch[k] != null) patch[k] = now;
      return { t: "conv.update", convId: op.convId, at: now, origin: op.origin, patch };
    }
    case "typing": own(op.convId); return { t: "typing", convId: op.convId, who: "visitor", text: String(op.text || "").slice(0, 500), on: !!op.on, origin: op.origin };
    case "kb.view": case "kb.feedback":
      if (!state.kb.some((a) => a.id === op.id)) throw new Error("bad article");
      return { t: op.t, id: op.id, helpful: !!op.helpful, at: now, origin: op.origin };
    case "flow.stat":
      if (!state.flows.some((f) => f.id === op.id) || !["started", "fixed", "handoff"].includes(op.key)) throw new Error("bad stat");
      return { t: "flow.stat", id: op.id, key: op.key, at: now, origin: op.origin };
    case "gap.add":
      if (!str(op.q, 500)) throw new Error("bad gap");
      if (op.convId) own(op.convId);
      return { t: "gap.add", q: op.q, convId: op.convId, id: "g_" + crypto.randomBytes(5).toString("hex"), at: now, origin: op.origin };
    default: throw new Error("op not allowed");
  }
}

/* ------------------------------------------------------------ rate limits */
const buckets = new Map();
function limited(key, perMin) {
  const now = Date.now(), b = buckets.get(key) || { n: 0, t: now };
  if (now - b.t > 60000) { b.n = 0; b.t = now; }
  b.n++; buckets.set(key, b);
  return b.n > perMin;
}

/* ------------------------------------------------------------ http */
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".json": "application/json" };
const PUBLIC = new Set(["index.html", "console.html", "demo.html", "widget.js", "core.js", "seed.js", "console.js", "console.css", "site.css", "icon.svg"]);

function cors(req, res) {
  const o = req.headers.origin;
  if (!o) return;
  if (ORIGINS.includes("*") || ORIGINS.includes(o)) { res.setHeader("access-control-allow-origin", ORIGINS.includes("*") ? "*" : o); res.setHeader("vary", "origin"); }
  res.setHeader("access-control-allow-headers", "content-type");
  res.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
}
function json(res, code, body) { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(body)); }
function body(req) {
  return new Promise((ok, ko) => {
    let n = 0; const chunks = [];
    req.on("data", (c) => { n += c.length; if (n > 256 * 1024) { ko(new Error("too large")); req.destroy(); } else chunks.push(c); });
    req.on("end", () => { try { ok(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}")); } catch (e) { ko(e); } });
  });
}
function isAdmin(req, url) {
  const h = req.headers.authorization || "";
  const tok = h.startsWith("Bearer ") ? h.slice(7) : url.searchParams.get("token") || "";
  return tok.length === ADMIN_TOKEN.length && crypto.timingSafeEqual(Buffer.from(tok), Buffer.from(ADMIN_TOKEN));
}
function sse(req, res, set) {
  res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive", "x-accel-buffering": "no" });
  res.write(": connected\n\n");
  set.add(res);
  req.on("close", () => set.delete(res));
}

function applyAndBroadcast(op) {
  Core.applyOp(state, op);
  if (!Core.EPHEMERAL.has(op.t)) save();
  broadcast(op);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  const p = url.pathname;
  res.setHeader("x-content-type-options", "nosniff");
  try {
    if (p.startsWith("/api/")) {
      cors(req, res);
      if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }

      if (p === "/api/health") return json(res, 200, { ok: true, app: "tickless", ai: !!ai, model: ai ? ai.model : null });

      /* --- widget --- */
      if (p === "/api/widget/session" && req.method === "GET") {
        const vid = url.searchParams.get("vid"), key = url.searchParams.get("key");
        if (!visitorOK(vid, key, true)) return json(res, 403, { error: "bad visitor" });
        const convs = {};
        for (const c of Object.values(state.conversations)) if (c.visitor && c.visitor.id === vid) convs[c.id] = Core.publicConversation(c);
        return json(res, 200, Object.assign(Core.publicSettings(state), { conversations: convs }));
      }
      if (p === "/api/widget/stream" && req.method === "GET") {
        const vid = url.searchParams.get("vid");
        if (!visitorOK(vid, url.searchParams.get("key"), false)) return json(res, 403, { error: "bad visitor" });
        if (!widgets.has(vid)) widgets.set(vid, new Set());
        const set = widgets.get(vid);
        sse(req, res, set);
        req.on("close", () => { if (!set.size) widgets.delete(vid); });
        return;
      }
      if (p === "/api/widget/ops" && req.method === "POST") {
        const b = await body(req);
        if (!visitorOK(b.vid, b.key, false)) return json(res, 403, { error: "bad visitor" });
        if (limited("ops:" + b.vid, 90)) return json(res, 429, { error: "slow down" });
        let op;
        try { op = checkWidgetOp(b.op, b.vid); } catch (e) { return json(res, 400, { error: e.message }); }
        applyAndBroadcast(op);
        return json(res, 200, { ok: true });
      }
      if (p === "/api/ai/answer" && req.method === "POST") {
        if (!ai) return json(res, 503, { error: "AI not configured" });
        const b = await body(req);
        if (!visitorOK(b.vid, b.key, false)) return json(res, 403, { error: "bad visitor" });
        const conv = state.conversations[b.convId];
        if (!conv || ownerOf(b.convId) !== b.vid) return json(res, 403, { error: "not your conversation" });
        if (!str(b.text, 6000)) return json(res, 400, { error: "bad text" });
        if (limited("ai:" + b.vid, 12) || limited("ai:all", 600)) return json(res, 429, { error: "slow down" });
        try { return json(res, 200, await ai.answer(state, conv, b.text)); }
        catch (e) { console.error("[ai] answer failed:", e.status || "", e.message); return json(res, 502, { error: "AI unavailable" }); }
      }

      /* --- admin --- */
      if (p.startsWith("/api/admin/")) {
        if (!isAdmin(req, url)) return json(res, 401, { error: "unauthorized" });
        if (p === "/api/admin/state") return json(res, 200, state);
        if (p === "/api/admin/stream") return sse(req, res, admins);
        if (p === "/api/admin/ops" && req.method === "POST") {
          const { op } = await body(req);
          if (!op || typeof op.t !== "string") return json(res, 400, { error: "bad op" });
          op.at = Date.now();
          applyAndBroadcast(op);
          return json(res, 200, { ok: true });
        }
        if (p === "/api/admin/ai" && req.method === "POST") {
          if (!ai) return json(res, 503, { error: "AI not configured" });
          const b = await body(req);
          const conv = b.convId ? state.conversations[b.convId] : null;
          if (b.task !== "article" && !conv) return json(res, 404, { error: "no conversation" });
          try { return json(res, 200, await ai.assist(state, b.task, { conv, text: String(b.text || "").slice(0, 8000), agent: String(b.agent || "").slice(0, 80) })); }
          catch (e) { console.error("[ai] assist failed:", e.status || "", e.message); return json(res, 502, { error: e.message }); }
        }
      }
      return json(res, 404, { error: "not found" });
    }

    /* --- static --- */
    const file = p === "/" ? "index.html" : p.slice(1);
    if (req.method !== "GET" || !PUBLIC.has(file)) { res.writeHead(404, { "content-type": "text/plain" }); return res.end("Not found"); }
    const data = fs.readFileSync(path.join(ROOT, file));
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream", "cache-control": "no-cache" });
    res.end(data);
  } catch (e) {
    console.error(e);
    if (!res.headersSent) json(res, 500, { error: "server error" });
  }
});

server.listen(PORT, () => {
  console.log(`\nTickless running → http://localhost:${PORT}/console.html`);
  console.log(`Admin token: ${process.env.TICKLESS_ADMIN_TOKEN ? "(from TICKLESS_ADMIN_TOKEN)" : ADMIN_TOKEN}`);
  console.log(`AI: ${ai ? "on (" + ai.model + ")" : "off — set ANTHROPIC_API_KEY to enable"}`);
  console.log(`Widget snippet: <script src="http://localhost:${PORT}/widget.js" data-workspace="${WS_ID}" data-api="http://localhost:${PORT}" async></script>\n`);
});
