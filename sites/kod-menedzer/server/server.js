#!/usr/bin/env node
/**
 * KodBox — backend Node.js zapisujący pliki projektów na dysku serwera.
 *
 * Uruchomienie:  node server.js            (domyślnie port 5000)
 *                PORT=8080 node server.js
 *
 * Zero zależności — wyłącznie moduły wbudowane Node.js (>= 18).
 * Serwuje też frontend z katalogu wyżej, więc po starcie wystarczy wejść
 * na http://localhost:5000 — aplikacja sama wykryje backend przez /api/ping.
 *
 * Pliki lądują w server/projects/<id>/, metadane w metadata.json tego katalogu,
 * a linki do udostępniania w server/shares.json.
 */

"use strict";

const http = require("node:http");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const zlib = require("node:zlib");

const BASE_DIR = __dirname;
const FRONTEND_DIR = path.dirname(BASE_DIR);
const PROJECTS_DIR = path.join(BASE_DIR, "projects");
const SHARES_FILE = path.join(BASE_DIR, "shares.json");

const PORT = Number(process.env.PORT || 5000);
const HOST = process.env.HOST || "0.0.0.0";
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_BODY_BYTES = 16 * 1024 * 1024;

const PROJECT_ID_RE = /^[A-Za-z0-9_-]{1,32}$/;
const ALLOWED_EXT = new Set([
  "html", "htm", "css", "js", "mjs", "ts", "jsx", "tsx", "json", "py", "php",
  "sql", "md", "txt", "xml", "svg", "yml", "yaml", "csv", "sh", "ini", "env",
  "java", "c", "cpp", "cs", "go", "rs", "rb", "vue", "toml", "log", "conf"
]);

const MIME = {
  html: "text/html; charset=utf-8", htm: "text/html; charset=utf-8",
  css: "text/css; charset=utf-8", js: "text/javascript; charset=utf-8",
  mjs: "text/javascript; charset=utf-8", json: "application/json; charset=utf-8",
  svg: "image/svg+xml; charset=utf-8", xml: "application/xml; charset=utf-8",
  md: "text/markdown; charset=utf-8", txt: "text/plain; charset=utf-8",
  csv: "text/csv; charset=utf-8", py: "text/x-python; charset=utf-8",
  ico: "image/x-icon", png: "image/png", jpg: "image/jpeg", webp: "image/webp"
};

/* --------------------------------------------------------------- narzędzia */

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const nowIso = () => new Date().toISOString();

function extOf(name) {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(i + 1).toLowerCase() : "";
}

/** Katalog projektu — z twardą walidacją identyfikatora (bez ../). */
function projectDir(projectId) {
  if (!PROJECT_ID_RE.test(projectId || "")) throw new HttpError(400, "Nieprawidłowy identyfikator projektu");
  const dir = path.join(PROJECTS_DIR, projectId);
  if (path.dirname(path.resolve(dir)) !== path.resolve(PROJECTS_DIR)) {
    throw new HttpError(400, "Nieprawidłowa ścieżka");
  }
  return dir;
}

async function requireProject(projectId) {
  const dir = projectDir(projectId);
  const stat = await fsp.stat(dir).catch(() => null);
  if (!stat || !stat.isDirectory()) throw new HttpError(404, "Projekt nie istnieje");
  return dir;
}

/** Nazwa pliku bez katalogów i znaków specjalnych, z dozwolonym rozszerzeniem. */
function safeName(filename, defaultExt = "txt") {
  const base = path.basename(String(filename || "")).replace(/[\x00-\x1f<>:"|?*\\/]/g, "_").trim();
  if (!base || base === "metadata.json" || /^\.+$/.test(base)) {
    throw new HttpError(400, "Nieprawidłowa nazwa pliku");
  }
  let stem = base;
  let ext = extOf(base);
  if (!ext) {
    ext = defaultExt;
  } else {
    stem = base.slice(0, -(ext.length + 1));
  }
  if (!ALLOWED_EXT.has(ext)) throw new HttpError(400, `Niedozwolone rozszerzenie pliku: .${ext}`);
  return `${stem.slice(0, 100)}.${ext}`;
}

async function filePath(projectId, filename) {
  const dir = await requireProject(projectId);
  const name = safeName(filename);
  const full = path.join(dir, name);
  if (path.dirname(path.resolve(full)) !== path.resolve(dir)) {
    throw new HttpError(400, "Nieprawidłowa ścieżka pliku");
  }
  return { full, name, dir };
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await fsp.readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

const loadShares = () => readJson(SHARES_FILE, {});
const saveShares = (data) => fsp.writeFile(SHARES_FILE, JSON.stringify(data, null, 2), "utf8");

async function readMetadata(projectId) {
  const dir = projectDir(projectId);
  const meta = await readJson(path.join(dir, "metadata.json"), {});
  const stat = await fsp.stat(dir).catch(() => null);
  return {
    id: projectId,
    name: meta.name || projectId,
    description: meta.description || "",
    created: meta.created || (stat ? stat.birthtime.toISOString() : nowIso()),
    updated: meta.updated || meta.created || nowIso()
  };
}

async function writeMetadata(projectId, meta) {
  const next = { ...meta, id: projectId, updated: nowIso() };
  await fsp.writeFile(path.join(projectDir(projectId), "metadata.json"), JSON.stringify(next, null, 2), "utf8");
  return next;
}

async function listFiles(projectId) {
  const dir = await requireProject(projectId);
  const names = (await fsp.readdir(dir)).filter((n) => n !== "metadata.json").sort();
  const files = [];
  for (const name of names) {
    const stat = await fsp.stat(path.join(dir, name)).catch(() => null);
    if (stat && stat.isFile()) {
      files.push({ name, size: stat.size, modified: stat.mtime.toISOString() });
    }
  }
  return files;
}

async function shareCount(projectId) {
  const shares = await loadShares();
  return Object.values(shares).filter((s) => s.project_id === projectId).length;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ------------------------------------------------------------------- ZIP */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function dosStamp(date) {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1);
  const day = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time: time & 0xffff, date: day & 0xffff };
}

/** Buduje archiwum ZIP (deflate) z listy { name, data: Buffer, modified }. */
function makeZip(entries) {
  const chunks = [];
  const central = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, "utf8");
    const raw = entry.data;
    const deflated = zlib.deflateRawSync(raw);
    const useDeflate = deflated.length < raw.length;
    const data = useDeflate ? deflated : raw;
    const method = useDeflate ? 8 : 0;
    const crc = crc32(raw);
    const stamp = dosStamp(entry.modified || new Date());

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);          // nazwy w UTF-8
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(stamp.time, 10);
    local.writeUInt16LE(stamp.date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    chunks.push(local, nameBuf, data);

    const dir = Buffer.alloc(46);
    dir.writeUInt32LE(0x02014b50, 0);
    dir.writeUInt16LE(20, 4);
    dir.writeUInt16LE(20, 6);
    dir.writeUInt16LE(0x0800, 8);
    dir.writeUInt16LE(method, 10);
    dir.writeUInt16LE(stamp.time, 12);
    dir.writeUInt16LE(stamp.date, 14);
    dir.writeUInt32LE(crc, 16);
    dir.writeUInt32LE(data.length, 20);
    dir.writeUInt32LE(raw.length, 24);
    dir.writeUInt16LE(nameBuf.length, 28);
    dir.writeUInt32LE(offset, 42);
    central.push(dir, nameBuf);

    offset += local.length + nameBuf.length + data.length;
  }

  const centralBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);

  return Buffer.concat([...chunks, centralBuf, end]);
}

/* ------------------------------------------------------ obsługa żądania */

function sendJson(res, status, data) {
  const body = Buffer.from(JSON.stringify(data), "utf8");
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Content-Length": body.length });
  res.end(body);
}

function sendBuffer(res, status, buf, type, disposition) {
  const headers = { "Content-Type": type, "Content-Length": buf.length };
  if (disposition) headers["Content-Disposition"] = disposition;
  res.writeHead(status, headers);
  res.end(buf);
}

function attachment(name) {
  const ascii = name.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "'");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const parts = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new HttpError(413, "Żądanie jest za duże"));
        req.destroy();
        return;
      }
      parts.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(parts).toString("utf8")));
    req.on("error", reject);
  });
}

async function jsonBody(req) {
  const raw = await readBody(req);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new HttpError(400, "Nieprawidłowy JSON w żądaniu");
  }
}

/* ------------------------------------------------------------- API: trasy */

const routes = [];
const route = (method, pattern, handler) => routes.push({ method, pattern, handler });

route("GET", /^\/api\/ping$/, async (_req, res) => {
  sendJson(res, 200, { app: "kodbox", version: 1, runtime: "node " + process.version, storage: PROJECTS_DIR });
});

route("GET", /^\/api\/projects$/, async (_req, res) => {
  const entries = await fsp.readdir(PROJECTS_DIR, { withFileTypes: true });
  const projects = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || !PROJECT_ID_RE.test(entry.name)) continue;
    const meta = await readMetadata(entry.name);
    meta.shares = await shareCount(entry.name);
    projects.push(meta);
  }
  projects.sort((a, b) => (b.updated || b.created).localeCompare(a.updated || a.created));
  sendJson(res, 200, projects);
});

route("POST", /^\/api\/projects$/, async (req, res) => {
  const data = await jsonBody(req);
  const projectId = crypto.randomBytes(4).toString("hex");
  await fsp.mkdir(projectDir(projectId), { recursive: true });
  const meta = await writeMetadata(projectId, {
    name: String(data.name || "Projekt").trim().slice(0, 80),
    description: String(data.description || "").trim().slice(0, 200),
    created: nowIso()
  });
  sendJson(res, 200, meta);
});

route("GET", /^\/api\/projects\/([^/]+)$/, async (_req, res, [projectId]) => {
  await requireProject(projectId);
  const meta = await readMetadata(projectId);
  meta.files = await listFiles(projectId);
  meta.shares = await shareCount(projectId);
  sendJson(res, 200, meta);
});

route("PATCH", /^\/api\/projects\/([^/]+)$/, async (req, res, [projectId]) => {
  await requireProject(projectId);
  const data = await jsonBody(req);
  const meta = await readMetadata(projectId);
  if (data.name !== undefined) meta.name = String(data.name || "Projekt").trim().slice(0, 80);
  if (data.description !== undefined) meta.description = String(data.description || "").trim().slice(0, 200);
  sendJson(res, 200, await writeMetadata(projectId, meta));
});

route("DELETE", /^\/api\/projects\/([^/]+)$/, async (_req, res, [projectId]) => {
  const dir = projectDir(projectId);
  await fsp.rm(dir, { recursive: true, force: true });
  const shares = await loadShares();
  const remaining = Object.fromEntries(Object.entries(shares).filter(([, s]) => s.project_id !== projectId));
  if (Object.keys(remaining).length !== Object.keys(shares).length) await saveShares(remaining);
  sendJson(res, 200, { success: true });
});

route("POST", /^\/api\/projects\/([^/]+)\/files$/, async (req, res, [projectId]) => {
  const data = await jsonBody(req);
  const content = String(data.content ?? "");
  if (Buffer.byteLength(content, "utf8") > MAX_FILE_BYTES) throw new HttpError(413, "Plik jest za duży");

  let filename = data.filename || "index.html";
  const extension = String(data.extension || "").replace(/^\./, "").toLowerCase();
  if (extension && !filename.toLowerCase().endsWith("." + extension)) {
    filename = `${filename.replace(/\.[^.]*$/, "") || filename}.${extension}`;
  }

  const { full, name } = await filePath(projectId, filename);
  await fsp.writeFile(full, content, "utf8");
  await writeMetadata(projectId, await readMetadata(projectId));
  const stat = await fsp.stat(full);
  sendJson(res, 200, { success: true, name, size: stat.size, modified: stat.mtime.toISOString() });
});

route("GET", /^\/api\/projects\/([^/]+)\/files\/(.+)$/, async (_req, res, [projectId, filename]) => {
  const { full, name } = await filePath(projectId, filename);
  const content = await fsp.readFile(full, "utf8").catch(() => null);
  if (content === null) throw new HttpError(404, "Plik nie istnieje");
  sendJson(res, 200, { filename: name, content });
});

route("PUT", /^\/api\/projects\/([^/]+)\/files\/(.+)$/, async (req, res, [projectId, filename]) => {
  const { full, name } = await filePath(projectId, filename);
  if (!fs.existsSync(full)) throw new HttpError(404, "Plik nie istnieje");
  const data = await jsonBody(req);
  const content = String(data.content ?? "");
  if (Buffer.byteLength(content, "utf8") > MAX_FILE_BYTES) throw new HttpError(413, "Plik jest za duży");
  await fsp.writeFile(full, content, "utf8");
  await writeMetadata(projectId, await readMetadata(projectId));
  sendJson(res, 200, { success: true, name, size: Buffer.byteLength(content, "utf8") });
});

route("POST", /^\/api\/projects\/([^/]+)\/files\/(.+)\/rename$/, async (req, res, [projectId, filename]) => {
  const source = await filePath(projectId, filename);
  if (!fs.existsSync(source.full)) throw new HttpError(404, "Plik nie istnieje");
  const data = await jsonBody(req);
  const target = await filePath(projectId, data.new_name || "");
  await fsp.rename(source.full, target.full);
  await writeMetadata(projectId, await readMetadata(projectId));
  sendJson(res, 200, { success: true, name: target.name });
});

route("DELETE", /^\/api\/projects\/([^/]+)\/files\/(.+)$/, async (_req, res, [projectId, filename]) => {
  const { full } = await filePath(projectId, filename);
  await fsp.rm(full, { force: true });
  await writeMetadata(projectId, await readMetadata(projectId));
  sendJson(res, 200, { success: true });
});

route("GET", /^\/api\/projects\/([^/]+)\/download\/(.+)$/, async (_req, res, [projectId, filename]) => {
  const { full, name } = await filePath(projectId, filename);
  const data = await fsp.readFile(full).catch(() => null);
  if (!data) throw new HttpError(404, "Plik nie istnieje");
  sendBuffer(res, 200, data, MIME[extOf(name)] || "application/octet-stream", attachment(name));
});

async function zipProject(projectId) {
  const dir = await requireProject(projectId);
  const meta = await readMetadata(projectId);
  const files = await listFiles(projectId);
  const entries = [];
  for (const file of files) {
    entries.push({
      name: file.name,
      data: await fsp.readFile(path.join(dir, file.name)),
      modified: new Date(file.modified)
    });
  }
  return { buf: makeZip(entries), name: (meta.name || projectId).replace(/[^\w.-]+/g, "-") + ".zip" };
}

route("GET", /^\/api\/projects\/([^/]+)\/zip$/, async (_req, res, [projectId]) => {
  const { buf, name } = await zipProject(projectId);
  sendBuffer(res, 200, buf, "application/zip", attachment(name));
});

/* ------------------------------------------------------- udostępnianie */

route("POST", /^\/api\/projects\/([^/]+)\/share$/, async (req, res, [projectId]) => {
  await requireProject(projectId);
  const token = crypto.randomBytes(16).toString("base64url");
  const shares = await loadShares();
  shares[token] = { project_id: projectId, created: nowIso() };
  await saveShares(shares);
  const host = req.headers.host || `localhost:${PORT}`;
  sendJson(res, 200, { share_url: `http://${host}/shared/${token}`, token });
});

route("GET", /^\/api\/projects\/([^/]+)\/shares$/, async (_req, res, [projectId]) => {
  await requireProject(projectId);
  const shares = await loadShares();
  const items = Object.entries(shares)
    .filter(([, s]) => s.project_id === projectId)
    .map(([token, s]) => ({ token, created: s.created }));
  sendJson(res, 200, { count: items.length, shares: items });
});

route("DELETE", /^\/api\/shares\/([^/]+)$/, async (_req, res, [token]) => {
  const shares = await loadShares();
  if (shares[token]) {
    delete shares[token];
    await saveShares(shares);
  }
  sendJson(res, 200, { success: true });
});

async function resolveShare(token) {
  const shares = await loadShares();
  const share = shares[token];
  if (!share) throw new HttpError(404, "Link wygasł lub jest nieprawidłowy");
  await requireProject(share.project_id);
  return share.project_id;
}

route("GET", /^\/shared\/([^/]+)$/, async (_req, res, [token]) => {
  const projectId = await resolveShare(token);
  const meta = await readMetadata(projectId);
  const files = await listFiles(projectId);
  sendBuffer(res, 200, Buffer.from(sharedPage(meta, files, token), "utf8"), "text/html; charset=utf-8");
});

route("GET", /^\/api\/shared\/([^/]+)\/files\/(.+)$/, async (req, res, [token, filename]) => {
  const projectId = await resolveShare(token);
  const { full, name } = await filePath(projectId, filename);
  const data = await fsp.readFile(full).catch(() => null);
  if (!data) throw new HttpError(404, "Plik nie istnieje");
  const inline = new URL(req.url, "http://x").searchParams.get("inline") === "1";
  sendBuffer(res, 200, data, MIME[extOf(name)] || "text/plain; charset=utf-8", inline ? null : attachment(name));
});

route("GET", /^\/api\/shared\/([^/]+)\/zip$/, async (_req, res, [token]) => {
  const projectId = await resolveShare(token);
  const { buf, name } = await zipProject(projectId);
  sendBuffer(res, 200, buf, "application/zip", attachment(name));
});

/** Strona, którą widzi odbiorca linku. */
function sharedPage(project, files, token) {
  const rows = files.length
    ? files.map((f) => `
    <div class="row">
      <span class="grow">
        <div class="nm">${escapeHtml(f.name)}</div>
        <div class="mt">${(f.size / 1024).toFixed(1)} KB · ${escapeHtml(f.modified.slice(0, 16).replace("T", " "))}</div>
      </span>
      <a class="btn" href="/api/shared/${token}/files/${encodeURIComponent(f.name)}?inline=1" target="_blank" rel="noreferrer">Podejrzyj</a>
      <a class="btn btn-primary" href="/api/shared/${token}/files/${encodeURIComponent(f.name)}">⬇️ Pobierz</a>
    </div>`).join("")
    : '<div class="row"><span class="grow mt">Ten projekt nie ma jeszcze plików.</span></div>';

  return `<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(project.name)} — udostępniony projekt</title>
<meta name="robots" content="noindex">
<style>
  :root { --bg:#0f0f13; --panel:#1a1a22; --line:#2b2b38; --txt:#e8e8f0; --txt-2:#a4a4b8; --txt-3:#6f6f85; --accent:#6c63ff; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:var(--bg); color:var(--txt); font:14px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; padding:32px 20px 60px; }
  .wrap { max-width:900px; margin:0 auto; display:grid; gap:18px; }
  .brand { display:flex; align-items:center; gap:10px; font-weight:700; }
  .mark { width:30px; height:30px; border-radius:9px; background:linear-gradient(135deg,#6c63ff,#b06cff); display:grid; place-items:center; font-family:monospace; }
  h1 { font-size:22px; letter-spacing:-.02em; }
  p.desc { color:var(--txt-2); }
  .card { background:var(--panel); border:1px solid var(--line); border-radius:12px; }
  .row { display:flex; align-items:center; gap:12px; padding:12px 14px; border-bottom:1px solid var(--line); flex-wrap:wrap; }
  .row:last-child { border-bottom:0; }
  .row .grow { flex:1; min-width:160px; }
  .nm { font-family:ui-monospace,monospace; font-size:13px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .mt { font-size:11.5px; color:var(--txt-3); }
  .btn { display:inline-flex; align-items:center; gap:6px; padding:8px 12px; border-radius:8px; background:#20202b; border:1px solid var(--line); color:var(--txt); font-size:12.5px; text-decoration:none; }
  .btn:hover { border-color:#3a3a4b; }
  .btn-primary { background:var(--accent); border-color:var(--accent); color:#fff; }
  .foot { color:var(--txt-3); font-size:12px; }
</style>
</head>
<body>
<div class="wrap">
  <div class="brand"><div class="mark">{}</div> KodBox</div>
  <div>
    <h1>${escapeHtml(project.name)}</h1>
    ${project.description ? `<p class="desc">${escapeHtml(project.description)}</p>` : ""}
  </div>
  <div class="card">${rows}</div>
  <div><a class="btn btn-primary" href="/api/shared/${token}/zip">⬇️ Pobierz cały projekt (ZIP)</a></div>
  <p class="foot">Projekt udostępniony z KodBox. Link działa, dopóki projekt istnieje na serwerze.</p>
</div>
</body>
</html>`;
}

/* ------------------------------------------------------- serwowanie frontu */

async function serveFrontend(req, res, pathname) {
  const rel = pathname === "/" ? "index.html" : decodeURIComponent(pathname.slice(1));
  const full = path.join(FRONTEND_DIR, rel);
  if (!path.resolve(full).startsWith(path.resolve(FRONTEND_DIR) + path.sep)) {
    throw new HttpError(400, "Nieprawidłowa ścieżka");
  }
  const stat = await fsp.stat(full).catch(() => null);
  if (!stat || !stat.isFile()) throw new HttpError(404, "Nie znaleziono: " + pathname);
  const data = await fsp.readFile(full);
  sendBuffer(res, 200, data, MIME[extOf(full)] || "application/octet-stream");
}

/* ------------------------------------------------------------------ serwer */

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const pathname = new URL(req.url, "http://localhost").pathname;

  try {
    for (const entry of routes) {
      if (entry.method !== req.method) continue;
      const match = pathname.match(entry.pattern);
      if (!match) continue;
      await entry.handler(req, res, match.slice(1).map(decodeURIComponent));
      return;
    }
    if (req.method === "GET") {
      await serveFrontend(req, res, pathname);
      return;
    }
    throw new HttpError(404, "Nie znaleziono trasy: " + pathname);
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 500;
    if (status === 500) console.error("Błąd serwera:", err);
    if (!res.headersSent) sendJson(res, status, { error: err.message || "Błąd serwera" });
    else res.end();
  }
});

fs.mkdirSync(PROJECTS_DIR, { recursive: true });

server.listen(PORT, HOST, () => {
  console.log(`KodBox — serwer Node.js działa na http://localhost:${PORT}`);
  console.log(`Pliki projektów: ${PROJECTS_DIR}`);
});
