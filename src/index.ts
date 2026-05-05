/*
 * Loam. The memory substrate for personal AI.
 *
 *   "Memory ages. Loam ripens."
 *
 * This Worker exposes search and retrieval over your AI history corpus,
 * running on YOUR Cloudflare account. The product is the substrate.
 * What's underneath whatever AI you build, query, or think on top of.
 *
 * Three things matter in a query worker:
 *   1. The data is yours.    FTS5 over your own D1.
 *   2. The auth is yours.    Bearer token in your own env.
 *   3. The substrate is yours. The code is open. Audit it before you trust it.
 *
 * Stack: D1 (FTS5 full-text search) + R2 (raw archive) + Worker (auth + UI).
 *
 * Routes:
 *   GET /                     HTML UI
 *   GET /healthz              liveness (no auth)
 *   GET /search?q=...         keyword search across the corpus
 *   GET /conversation/:id     full thread JSON
 *   GET /stats                counts and dimensions
 *   GET /sources              list of distinct sources
 *
 * The soil holds.
 */

interface Env {
  DB: D1Database;
  ARCHIVES: R2Bucket;
  AUTH_TOKEN: string;
}

const HEADERS_JSON = { "content-type": "application/json; charset=utf-8" };
const HEADERS_HTML = { "content-type": "text/html; charset=utf-8" };

function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { ...HEADERS_JSON, ...(init.headers || {}) },
  });
}

function authed(req: Request, env: Env): boolean {
  if (!env.AUTH_TOKEN) return true; // no token configured = open (dev/local only)
  const header = req.headers.get("authorization") || "";
  const url = new URL(req.url);
  const queryToken = url.searchParams.get("token") || "";
  const got = header.replace(/^Bearer\s+/i, "") || queryToken;
  return got === env.AUTH_TOKEN;
}

// FTS5 has its own grammar. A few characters (hyphens, asterisks, colons,
// parens, quotes) carry meaning to the parser. User intent is rarely that.
// When raw input fails, we retry the same query as a literal phrase before
// surfacing the error. The user said it; we shouldn't reject the wording.
const FTS_SPECIALS = /[-^*:()"]/;

function sanitizeFtsPhrase(q: string): string {
  // Strip embedded double-quotes, wrap the rest as a phrase. Loses operators
  // but preserves the words the user actually typed.
  return `"${q.replace(/"/g, "")}"`;
}

async function runFtsQuery(
  env: Env,
  ftsQuery: string,
  source: string,
  from: string,
  to: string,
  limit: number
) {
  const where: string[] = ["messages_fts MATCH ?"];
  const params: any[] = [ftsQuery];
  if (source) { where.push("source = ?"); params.push(source); }
  if (from) { where.push("created_at >= ?"); params.push(from); }
  if (to) { where.push("created_at <= ?"); params.push(to); }

  const sql = `
    SELECT
      f.message_id     AS message_id,
      f.conversation_id AS conversation_id,
      f.source         AS source,
      f.role           AS role,
      f.created_at     AS created_at,
      snippet(messages_fts, 0, '<mark>', '</mark>', '…', 14) AS snippet,
      bm25(messages_fts) AS rank,
      c.title          AS conversation_title
    FROM messages_fts f
    LEFT JOIN conversations c ON c.id = f.conversation_id
    WHERE ${where.join(" AND ")}
    ORDER BY rank
    LIMIT ?
  `;
  params.push(limit);

  return env.DB.prepare(sql).bind(...params).all();
}

async function handleSearch(url: URL, env: Env) {
  const q = (url.searchParams.get("q") || "").trim();
  if (!q) return json({ error: "missing q" }, { status: 400 });

  const source = url.searchParams.get("source") || "";
  const from = url.searchParams.get("from") || "";
  const to = url.searchParams.get("to") || "";
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "25", 10), 100);

  let result;
  let usedFallback = false;
  try {
    result = await runFtsQuery(env, q, source, from, to, limit);
  } catch (e: any) {
    if (FTS_SPECIALS.test(q)) {
      try {
        result = await runFtsQuery(env, sanitizeFtsPhrase(q), source, from, to, limit);
        usedFallback = true;
      } catch (e2: any) {
        return json({ error: "fts query failed (raw + phrase)", detail: e2.message }, { status: 400 });
      }
    } else {
      return json({ error: "fts query failed", detail: e.message }, { status: 400 });
    }
  }

  return json({
    query: q,
    fallback_phrase_mode: usedFallback,
    filters: { source: source || null, from: from || null, to: to || null, limit },
    count: result.results?.length ?? 0,
    results: result.results,
  });
}

async function handleConversation(id: string, env: Env) {
  const conv = await env.DB.prepare("SELECT * FROM conversations WHERE id = ?").bind(id).first();
  if (!conv) return json({ error: "conversation not found" }, { status: 404 });
  const msgs = await env.DB
    .prepare(
      "SELECT id, role, content, created_at, position FROM messages WHERE conversation_id = ? ORDER BY position"
    )
    .bind(id)
    .all();
  return json({ conversation: conv, messages: msgs.results });
}

async function handleStats(env: Env) {
  const totals = await env.DB.prepare(
    "SELECT (SELECT COUNT(*) FROM conversations) AS conversations, (SELECT COUNT(*) FROM messages) AS messages, (SELECT COUNT(DISTINCT source) FROM conversations) AS sources_count"
  ).first();
  const bySource = await env.DB.prepare(
    "SELECT source, COUNT(*) AS conversations, SUM(message_count) AS messages, MIN(created_at) AS first, MAX(created_at) AS last FROM conversations GROUP BY source"
  ).all();
  const byMonth = await env.DB.prepare(
    "SELECT substr(created_at, 1, 7) AS month, COUNT(*) AS conversations FROM conversations GROUP BY month ORDER BY month DESC LIMIT 24"
  ).all();
  return json({ totals, by_source: bySource.results, by_month: byMonth.results });
}

async function handleSources(env: Env) {
  const r = await env.DB.prepare("SELECT DISTINCT source FROM conversations ORDER BY source").all();
  return json({ sources: r.results?.map((x: any) => x.source) ?? [] });
}

const UI = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Loam</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  :root {
    --bg: #0d1117;
    --panel: #161b22;
    --border: #30363d;
    --fg: #c9d1d9;
    --muted: #8b949e;
    --accent: #58a6ff;
    --mark-bg: #f9c74f;
    --mark-fg: #1a1a1a;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--fg); font: 15px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif; }
  header { padding: 18px 24px; border-bottom: 1px solid var(--border); display: flex; gap: 16px; align-items: center; }
  header h1 { margin: 0; font-size: 18px; font-weight: 600; }
  header h1 .tag { font-weight: 400; color: var(--muted); font-size: 13px; margin-left: 8px; }
  header .stats { color: var(--muted); font-size: 13px; flex: 1; }
  header .token-btn { background: transparent; border: 1px solid var(--border); color: var(--muted); padding: 6px 10px; border-radius: 4px; font-size: 12px; cursor: pointer; }
  header .token-btn.set { border-color: #2ea043; color: #56d364; }
  header .token-btn:hover { color: var(--fg); }
  main { max-width: 980px; margin: 0 auto; padding: 24px; }
  form { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
  input, select { background: var(--panel); border: 1px solid var(--border); color: var(--fg); padding: 10px 12px; border-radius: 6px; font: inherit; }
  input[type="search"] { flex: 1; min-width: 220px; }
  input[type="date"] { color-scheme: dark; }
  button { background: var(--accent); border: 0; color: #0d1117; padding: 10px 18px; border-radius: 6px; font: inherit; font-weight: 600; cursor: pointer; }
  .meta { color: var(--muted); font-size: 13px; margin-bottom: 12px; }
  .result { background: var(--panel); border: 1px solid var(--border); border-radius: 8px; padding: 14px 16px; margin-bottom: 10px; }
  .result .head { display: flex; justify-content: space-between; gap: 12px; align-items: baseline; margin-bottom: 6px; flex-wrap: wrap; }
  .result .title { font-weight: 600; color: var(--accent); cursor: pointer; }
  .result .when { color: var(--muted); font-size: 12px; white-space: nowrap; }
  .result .role { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; background: var(--border); color: var(--fg); margin-right: 8px; vertical-align: middle; }
  .result .snippet { color: var(--fg); }
  mark { background: var(--mark-bg); color: var(--mark-fg); padding: 1px 3px; border-radius: 2px; }
  .empty { text-align: center; color: var(--muted); padding: 40px 0; }
  .modal { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: none; align-items: center; justify-content: center; padding: 20px; }
  .modal.open { display: flex; }
  .modal .panel { background: var(--panel); border: 1px solid var(--border); border-radius: 8px; max-width: 880px; width: 100%; max-height: 90vh; overflow: auto; padding: 24px; }
  .modal .close { float: right; background: none; color: var(--muted); border: 1px solid var(--border); padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 12px; }
  .msg { border-bottom: 1px solid var(--border); padding: 12px 0; white-space: pre-wrap; }
  .msg:last-child { border-bottom: 0; }
  .msg .meta-row { color: var(--muted); font-size: 12px; margin-bottom: 6px; }
  .msg.human { border-left: 3px solid var(--accent); padding-left: 12px; }
  .msg.assistant { border-left: 3px solid #6c757d; padding-left: 12px; }
  footer { color: var(--muted); font-size: 12px; padding: 24px; text-align: center; }
  footer em { color: var(--muted); font-style: italic; }
</style>
</head>
<body>
<header>
  <h1>Loam <span class="tag">— the memory substrate</span></h1>
  <span class="stats" id="stats">…</span>
  <button class="token-btn" id="tokenBtn" type="button">set token</button>
</header>
<main>
  <form id="searchForm">
    <input type="search" id="q" name="q" placeholder='Search your history…' autofocus />
    <select id="source" name="source"><option value="">all sources</option></select>
    <input type="date" id="from" name="from" title="from date" />
    <input type="date" id="to" name="to" title="to date" />
    <button type="submit">Search</button>
  </form>
  <div class="meta" id="meta"></div>
  <div id="results"></div>
</main>
<div class="modal" id="modal"><div class="panel" id="modalPanel"></div></div>
<footer>Loam · the soil layer · running on your land · <em>memory ages, loam ripens</em></footer>
<script>
const URL_TOKEN = new URLSearchParams(location.search).get('token') || '';
if (URL_TOKEN) {
  localStorage.setItem('loam_token', URL_TOKEN);
  history.replaceState(null, '', location.pathname);
}
let TOKEN = localStorage.getItem('loam_token') || '';
const authHeaders = () => TOKEN ? { Authorization: 'Bearer ' + TOKEN } : {};
const fmtTime = (s) => s ? new Date(s).toISOString().slice(0,16).replace('T',' ') : '';

function setTokenButtonState() {
  const btn = document.getElementById('tokenBtn');
  if (TOKEN) { btn.textContent = 'token set ✓'; btn.classList.add('set'); }
  else { btn.textContent = 'set token'; btn.classList.remove('set'); }
}

async function loadStats() {
  setTokenButtonState();
  const stats = document.getElementById('stats');
  if (!TOKEN) { stats.textContent = 'no token — click "set token" or append ?token=… to URL'; return; }
  const r = await fetch('/stats', { headers: authHeaders() });
  if (r.status === 401) { stats.textContent = 'token rejected — click "set token" to update'; return; }
  if (!r.ok) { stats.textContent = 'stats error: ' + r.status; return; }
  const d = await r.json();
  stats.textContent =
    d.totals.conversations + ' conversations · ' + d.totals.messages + ' messages · ' + d.totals.sources_count + ' source(s)';
  const sel = document.getElementById('source');
  sel.innerHTML = '<option value="">all sources</option>';
  for (const s of d.by_source) {
    const o = document.createElement('option');
    o.value = s.source; o.textContent = s.source + ' (' + s.conversations + ')';
    sel.appendChild(o);
  }
}

function promptForToken() {
  const v = window.prompt('Paste your Loam bearer token (stored in localStorage on this device):', TOKEN);
  if (v === null) return;
  TOKEN = v.trim();
  if (TOKEN) localStorage.setItem('loam_token', TOKEN);
  else localStorage.removeItem('loam_token');
  loadStats();
}

async function search(e) {
  e?.preventDefault?.();
  const q = document.getElementById('q').value.trim();
  if (!q) return;
  if (!TOKEN) { promptForToken(); if (!TOKEN) return; }
  const params = new URLSearchParams();
  params.set('q', q);
  for (const k of ['source','from','to']) {
    const v = document.getElementById(k).value;
    if (v) params.set(k, v);
  }
  const meta = document.getElementById('meta'); meta.textContent = 'searching…';
  const res = document.getElementById('results'); res.innerHTML = '';
  const r = await fetch('/search?' + params.toString(), { headers: authHeaders() });
  if (r.status === 401) { meta.textContent = 'unauthorized — click "set token" to update'; return; }
  const d = await r.json();
  if (!r.ok) { meta.textContent = 'error: ' + (d.error || r.status); return; }
  meta.textContent = d.count + ' results for "' + q + '"';
  if (!d.count) { res.innerHTML = '<div class="empty">No matches.</div>'; return; }
  for (const row of d.results) {
    const div = document.createElement('div');
    div.className = 'result';
    div.innerHTML =
      '<div class="head">' +
        '<span class="title" data-id="' + row.conversation_id + '">' +
          escapeHtml(row.conversation_title || '(untitled)') +
        '</span>' +
        '<span class="when">' + fmtTime(row.created_at) + ' · ' + row.source + '</span>' +
      '</div>' +
      '<div class="snippet"><span class="role">' + row.role + '</span>' + row.snippet + '</div>';
    div.querySelector('.title').addEventListener('click', () => openConv(row.conversation_id));
    res.appendChild(div);
  }
}

async function openConv(id) {
  const r = await fetch('/conversation/' + id, { headers: authHeaders() });
  const d = await r.json();
  if (!r.ok) { alert('load failed: ' + (d?.error || r.status)); return; }
  const panel = document.getElementById('modalPanel');
  let html = '<button class="close" onclick="closeModal()">close</button>';
  html += '<h2 style="margin-top:0">' + escapeHtml(d.conversation.title || '(untitled)') + '</h2>';
  html += '<div style="color:var(--muted);font-size:13px;margin-bottom:18px">' + fmtTime(d.conversation.created_at) + ' → ' + fmtTime(d.conversation.updated_at) + ' · ' + d.conversation.source + ' · ' + d.messages.length + ' messages</div>';
  for (const m of d.messages) {
    html += '<div class="msg ' + m.role + '">' +
      '<div class="meta-row">' + m.role + ' · ' + fmtTime(m.created_at) + '</div>' +
      escapeHtml(m.content) + '</div>';
  }
  panel.innerHTML = html;
  document.getElementById('modal').classList.add('open');
}
function closeModal() { document.getElementById('modal').classList.remove('open'); }
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

document.getElementById('modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
document.getElementById('searchForm').addEventListener('submit', search);
document.getElementById('tokenBtn').addEventListener('click', promptForToken);
loadStats();
</script>
</body>
</html>`;

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    if (url.pathname === "/" || url.pathname === "") {
      return new Response(UI, { headers: HEADERS_HTML });
    }
    if (url.pathname === "/healthz") {
      // small, quiet. proves the worker is awake without leaking anything.
      return json({ ok: true, name: "loam", note: "the soil holds" });
    }

    if (!authed(req, env)) {
      return json({ error: "unauthorized" }, { status: 401 });
    }

    if (url.pathname === "/search") return handleSearch(url, env);
    if (url.pathname === "/stats") return handleStats(env);
    if (url.pathname === "/sources") return handleSources(env);
    const cm = url.pathname.match(/^\/conversation\/([0-9a-fA-F-]{36})$/);
    if (cm) return handleConversation(cm[1], env);

    return json({ error: "not found", path: url.pathname }, { status: 404 });
  },
};
