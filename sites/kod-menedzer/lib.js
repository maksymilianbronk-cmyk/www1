/* KodBox — wspólne funkcje pomocnicze (używane przez app.js i share.js).
   Bez zależności zewnętrznych: własny zapis ZIP, kompresja linków, inline HTML. */

(function (global) {
  "use strict";

  /* ---------- Podstawy ---------- */

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function fmtSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1024 / 1024).toFixed(2) + " MB";
  }

  function fmtDate(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d)) return "";
    return d.toLocaleDateString("pl-PL") + " " + d.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
  }

  function byteLength(text) {
    return new TextEncoder().encode(text).length;
  }

  function extOf(name) {
    var i = String(name).lastIndexOf(".");
    return i > 0 ? name.slice(i + 1).toLowerCase() : "";
  }

  function baseName(path) {
    return String(path).replace(/^\.\//, "").split(/[\\/]/).pop();
  }

  /** Nazwa pliku bezpieczna dla systemu plików (bez katalogów i znaków specjalnych). */
  function safeFileName(name) {
    var clean = baseName(name)
      .replace(/[\x00-\x1f<>:"|?*\\/]/g, "_")
      .replace(/\s+/g, "-")
      .replace(/^\.+/, "")
      .trim();
    return clean.slice(0, 120) || "plik.txt";
  }

  /* ---------- Rozszerzenia i typy MIME ---------- */

  var EXTENSIONS = [
    { ext: "html", label: "HTML", mime: "text/html", lang: "html" },
    { ext: "css", label: "CSS", mime: "text/css", lang: "css" },
    { ext: "js", label: "JavaScript", mime: "text/javascript", lang: "js" },
    { ext: "mjs", label: "JS Module", mime: "text/javascript", lang: "js" },
    { ext: "ts", label: "TypeScript", mime: "text/plain", lang: "js" },
    { ext: "jsx", label: "JSX", mime: "text/plain", lang: "js" },
    { ext: "tsx", label: "TSX", mime: "text/plain", lang: "js" },
    { ext: "json", label: "JSON", mime: "application/json", lang: "json" },
    { ext: "py", label: "Python", mime: "text/x-python", lang: "py" },
    { ext: "php", label: "PHP", mime: "application/x-httpd-php", lang: "js" },
    { ext: "sql", label: "SQL", mime: "application/sql", lang: "sql" },
    { ext: "md", label: "Markdown", mime: "text/markdown", lang: "md" },
    { ext: "txt", label: "Tekst", mime: "text/plain", lang: "txt" },
    { ext: "xml", label: "XML", mime: "application/xml", lang: "html" },
    { ext: "svg", label: "SVG", mime: "image/svg+xml", lang: "html" },
    { ext: "yml", label: "YAML", mime: "text/yaml", lang: "yml" },
    { ext: "yaml", label: "YAML", mime: "text/yaml", lang: "yml" },
    { ext: "csv", label: "CSV", mime: "text/csv", lang: "txt" },
    { ext: "sh", label: "Shell", mime: "text/x-sh", lang: "sh" },
    { ext: "ini", label: "INI/CONF", mime: "text/plain", lang: "ini" },
    { ext: "env", label: "ENV", mime: "text/plain", lang: "ini" },
    { ext: "java", label: "Java", mime: "text/x-java", lang: "js" },
    { ext: "c", label: "C", mime: "text/x-c", lang: "js" },
    { ext: "cpp", label: "C++", mime: "text/x-c", lang: "js" },
    { ext: "cs", label: "C#", mime: "text/plain", lang: "js" },
    { ext: "go", label: "Go", mime: "text/plain", lang: "js" },
    { ext: "rs", label: "Rust", mime: "text/plain", lang: "js" },
    { ext: "rb", label: "Ruby", mime: "text/plain", lang: "py" },
    { ext: "vue", label: "Vue", mime: "text/plain", lang: "html" }
  ];

  var EXT_MAP = {};
  EXTENSIONS.forEach(function (e) { EXT_MAP[e.ext] = e; });

  function mimeOf(name) {
    var e = EXT_MAP[extOf(name)];
    return e ? e.mime : "text/plain";
  }

  function langOf(name) {
    var e = EXT_MAP[extOf(name)];
    return e ? e.lang : "txt";
  }

  /** Rozpoznaje rozszerzenie po treści wklejonego kodu. */
  function detectExtension(code) {
    var s = String(code).trim();
    if (!s) return null;
    if (/^<!doctype html|^<html[\s>]|<\/html>|<head[\s>]|<body[\s>]/i.test(s)) return "html";
    if (/^<\?php/.test(s)) return "php";
    if (/^<svg[\s>]|<\/svg>\s*$/i.test(s)) return "svg";
    if (/^<\?xml/i.test(s)) return "xml";
    if (/^\s*[{[]/.test(s) && /[}\]]\s*$/.test(s)) {
      try { JSON.parse(s); return "json"; } catch (e) { /* nie JSON */ }
    }
    if (/^#!.*\b(bash|sh|zsh)\b/.test(s)) return "sh";
    if (/^#!.*python|^\s*(from\s+[\w.]+\s+import|import\s+\w+)[\s\S]*^\s*def\s+\w+\s*\(/m.test(s)) return "py";
    if (/^\s*def\s+\w+\s*\(.*\)\s*:|^\s*class\s+\w+\s*(\(|:)/m.test(s) && !/[;{]\s*$/m.test(s)) return "py";
    if (/^\s*(SELECT|INSERT\s+INTO|UPDATE|CREATE\s+TABLE|ALTER\s+TABLE|DELETE\s+FROM)\b/i.test(s)) return "sql";
    if (/^#{1,3}\s+\S|^\s*[-*]\s+\S[\s\S]*^\s*[-*]\s+\S/m.test(s) && !/[;{}]\s*$/m.test(s)) return "md";
    if (/\b(function|const|let|var|=>|document\.|window\.|console\.log|export default|require\()/.test(s)) return "js";
    if (/^[^{}]*\{[^{}]*:[^{}]*;[\s\S]*\}/.test(s) && /[.#@:][\w-]+[^{]*\{/.test(s)) return "css";
    if (/^[\w-]+\s*:\s*\S/m.test(s) && /^\s{2,}[\w-]+\s*:/m.test(s)) return "yml";
    return null;
  }

  /* ---------- Rozbijanie Markdown na pliki ---------- */

  var PL_MAP = {
    "ą": "a", "ć": "c", "ę": "e", "ł": "l", "ń": "n", "ó": "o", "ś": "s", "ź": "z", "ż": "z",
    "Ą": "A", "Ć": "C", "Ę": "E", "Ł": "L", "Ń": "N", "Ó": "O", "Ś": "S", "Ź": "Z", "Ż": "Z"
  };

  /**
   * Nazwa pliku w czystym ASCII — przeglądarki (Chromium) ignorują atrybut
   * download z, np., polskimi znakami przy pobieraniu z blobu i zapisują
   * plik jako „download". Nazwa w aplikacji zostaje bez zmian, składamy
   * ASCII tylko na moment pobierania.
   */
  function asciiFileName(name) {
    var out = String(name)
      .replace(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, function (c) { return PL_MAP[c] || c; })
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^\x20-\x7e]/g, "-")
      .replace(/["*/:<>?\\|]/g, "-")
      .replace(/-{2,}/g, "-")
      .replace(/^[-. ]+/, "")
      .trim();
    return out || "plik";
  }

  function slugify(text) {
    return String(text)
      .toLowerCase()
      .replace(/[ąćęłńóśźż]/g, function (c) { return PL_MAP[c] || c; })
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);
  }

  /* nazwa języka z ogrodzenia ``` → rozszerzenie pliku */
  var LANG_EXT = {
    html: "html", htm: "html", xhtml: "html", markup: "html", vue: "vue",
    css: "css", scss: "css", less: "css",
    js: "js", javascript: "js", node: "js", jsx: "jsx", ts: "ts", typescript: "ts", tsx: "tsx",
    json: "json", json5: "json",
    py: "py", python: "py", php: "php", rb: "rb", ruby: "rb",
    sql: "sql", mysql: "sql", postgres: "sql", postgresql: "sql",
    sh: "sh", bash: "sh", shell: "sh", zsh: "sh", console: "sh", terminal: "sh",
    yaml: "yml", yml: "yml", toml: "ini", ini: "ini", conf: "ini", env: "env",
    xml: "xml", svg: "svg", md: "md", markdown: "md", text: "txt", plaintext: "txt", txt: "txt",
    java: "java", c: "c", cpp: "cpp", "c++": "cpp", cs: "cs", csharp: "cs", go: "go", golang: "go",
    rust: "rs", rs: "rs", diff: "txt", makefile: "txt", dockerfile: "txt"
  };

  var FILENAME_RE = /([\w./-]*[\w-]\.(?:html?|css|m?js|jsx|tsx?|json|py|php|sql|md|txt|xml|svg|ya?ml|csv|sh|ini|env|java|cpp|cs|go|rs|rb|vue))\b/gi;
  var HEADING_RE = /^#{1,6}[ \t]+(.+)$/gm;
  var FENCE_RE = /^[ \t]{0,3}(?:```|~~~)([\w+#.-]*)[ \t]*\n([\s\S]*?)\n?^[ \t]{0,3}(?:```|~~~)[ \t]*$/gm;

  /* bloki z instrukcjami powłoki rzadko są plikami do zapisania */
  var SHELLISH = { sh: true, txt: true };

  /**
   * Wyodrębnia z dokumentu Markdown wszystkie bloki kodu i proponuje dla nich
   * nazwy plików — z jawnie podanej nazwy w tekście („## Backend (app.py)"),
   * z najbliższego nagłówka albo z języka bloku.
   * @param {string} md
   * @returns {{files: Array, prose: string}}
   */
  function splitMarkdown(md) {
    var text = String(md).replace(/\r\n/g, "\n");
    var files = [];
    var taken = {};
    var lastEnd = 0;
    var prose = "";
    var match;

    FENCE_RE.lastIndex = 0;
    while ((match = FENCE_RE.exec(text)) !== null) {
      var before = text.slice(lastEnd, match.index);
      prose += before;
      lastEnd = FENCE_RE.lastIndex;

      var code = match[2];
      if (!code.trim()) continue;

      var lang = (match[1] || "").toLowerCase();
      var ext = LANG_EXT[lang] || null;

      /* 1) jawna nazwa pliku w tekście tuż przed blokiem */
      var tail = before.slice(-400);
      var explicit = null;
      var fm;
      FILENAME_RE.lastIndex = 0;
      while ((fm = FILENAME_RE.exec(tail)) !== null) explicit = fm[1];

      /* 2) najbliższy nagłówek nad blokiem */
      var heading = "";
      var hm;
      HEADING_RE.lastIndex = 0;
      while ((hm = HEADING_RE.exec(before)) !== null) heading = hm[1];

      if (!ext) ext = detectExtension(code) || (explicit ? extOf(explicit) : null) || "txt";

      var name;
      if (explicit) {
        name = explicit.replace(/^\.?\//, "").replace(/\//g, "-");
        if (!extOf(name)) name += "." + ext;
      } else {
        var stem = slugify(heading.replace(/^kod:\s*/i, "").replace(/\(.*?\)/g, " ")) || ("plik-" + (files.length + 1));
        name = stem + "." + ext;
      }
      name = safeFileName(name);

      /* unikalna nazwa w obrębie importu */
      if (taken[name.toLowerCase()]) {
        var e = extOf(name);
        var base = e ? name.slice(0, -(e.length + 1)) : name;
        var i = 2;
        while (taken[(base + "-" + i + (e ? "." + e : "")).toLowerCase()]) i++;
        name = base + "-" + i + (e ? "." + e : "");
      }
      taken[name.toLowerCase()] = true;

      files.push({
        name: name,
        ext: extOf(name),
        lang: lang || extOf(name),
        heading: heading.trim(),
        content: code,
        size: byteLength(code),
        /* domyślnie zaznaczamy realne pliki, a nie komendy instalacyjne i krótkie wypisy */
        selected: !SHELLISH[extOf(name)] && code.trim().length > 40
      });
    }

    prose += text.slice(lastEnd);
    return { files: files, prose: prose.trim() };
  }

  /* ---------- Pobieranie ---------- */

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = asciiFileName(filename);
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { a.remove(); URL.revokeObjectURL(url); }, 4000);
  }

  function downloadText(text, filename) {
    downloadBlob(new Blob([text], { type: mimeOf(filename) + ";charset=utf-8" }), filename);
  }

  /* ---------- Archiwum ZIP (metoda „store", bez kompresji) ---------- */

  var CRC_TABLE = (function () {
    var table = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
    return table;
  })();

  function crc32(bytes) {
    var c = 0xffffffff;
    for (var i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  function dosTime(date) {
    var d = date || new Date();
    var time = (d.getHours() << 11) | (d.getMinutes() << 5) | (Math.floor(d.getSeconds() / 2));
    var day = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    return { time: time & 0xffff, date: day & 0xffff };
  }

  /**
   * Buduje archiwum ZIP z listy plików tekstowych.
   * @param {{name:string, content:string, modified?:string}[]} files
   * @returns {Blob}
   */
  function makeZip(files) {
    var enc = new TextEncoder();
    var chunks = [];
    var central = [];
    var offset = 0;

    files.forEach(function (f) {
      var nameBytes = enc.encode(f.name);
      var dataBytes = enc.encode(f.content);
      var crc = crc32(dataBytes);
      var when = dosTime(f.modified ? new Date(f.modified) : new Date());

      var local = new DataView(new ArrayBuffer(30));
      local.setUint32(0, 0x04034b50, true);
      local.setUint16(4, 20, true);          // wersja
      local.setUint16(6, 0x0800, true);      // flaga UTF-8
      local.setUint16(8, 0, true);           // metoda: store
      local.setUint16(10, when.time, true);
      local.setUint16(12, when.date, true);
      local.setUint32(14, crc, true);
      local.setUint32(18, dataBytes.length, true);
      local.setUint32(22, dataBytes.length, true);
      local.setUint16(26, nameBytes.length, true);
      local.setUint16(28, 0, true);

      chunks.push(new Uint8Array(local.buffer), nameBytes, dataBytes);

      var dir = new DataView(new ArrayBuffer(46));
      dir.setUint32(0, 0x02014b50, true);
      dir.setUint16(4, 20, true);
      dir.setUint16(6, 20, true);
      dir.setUint16(8, 0x0800, true);
      dir.setUint16(10, 0, true);
      dir.setUint16(12, when.time, true);
      dir.setUint16(14, when.date, true);
      dir.setUint32(16, crc, true);
      dir.setUint32(20, dataBytes.length, true);
      dir.setUint32(24, dataBytes.length, true);
      dir.setUint16(28, nameBytes.length, true);
      dir.setUint16(30, 0, true);
      dir.setUint16(32, 0, true);
      dir.setUint16(34, 0, true);
      dir.setUint16(36, 0, true);
      dir.setUint32(38, 0, true);
      dir.setUint32(42, offset, true);

      central.push(new Uint8Array(dir.buffer), nameBytes);
      offset += 30 + nameBytes.length + dataBytes.length;
    });

    var centralSize = central.reduce(function (a, b) { return a + b.length; }, 0);
    var end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true);
    end.setUint16(8, files.length, true);
    end.setUint16(10, files.length, true);
    end.setUint32(12, centralSize, true);
    end.setUint32(16, offset, true);

    return new Blob(chunks.concat(central, [new Uint8Array(end.buffer)]), { type: "application/zip" });
  }

  /* ---------- Kodowanie linków udostępniania ---------- */

  function bytesToBase64Url(bytes) {
    var bin = "";
    var chunk = 0x8000;
    for (var i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function base64UrlToBytes(str) {
    var b64 = str.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    var bin = atob(b64);
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  async function streamThrough(bytes, Ctor, format) {
    var stream = new Blob([bytes]).stream().pipeThrough(new Ctor(format));
    var buf = await new Response(stream).arrayBuffer();
    return new Uint8Array(buf);
  }

  /** Pakuje obiekt projektu do tekstu nadającego się na fragment adresu URL. */
  async function encodePayload(obj) {
    var bytes = new TextEncoder().encode(JSON.stringify(obj));
    if (typeof CompressionStream === "function") {
      try {
        return "z" + bytesToBase64Url(await streamThrough(bytes, CompressionStream, "deflate-raw"));
      } catch (e) { /* fallback poniżej */ }
    }
    return "u" + bytesToBase64Url(bytes);
  }

  /** Odwrotność encodePayload. */
  async function decodePayload(text) {
    var mode = text[0];
    var bytes = base64UrlToBytes(text.slice(1));
    if (mode === "z") {
      bytes = await streamThrough(bytes, DecompressionStream, "deflate-raw");
    }
    return JSON.parse(new TextDecoder().decode(bytes));
  }

  /* ---------- Podgląd HTML z wstawionymi zasobami projektu ---------- */

  /**
   * Wstawia treść plików CSS/JS/SVG z projektu bezpośrednio do dokumentu HTML,
   * dzięki czemu podgląd działa bez serwera i bez odwołań do plików zewnętrznych.
   * @param {string} html    treść pliku HTML
   * @param {Object} fileMap mapa { "nazwa.css": "treść", ... }
   */
  function inlineHtml(html, fileMap) {
    var out = String(html);

    out = out.replace(/<link\b[^>]*?href\s*=\s*["']([^"']+)["'][^>]*>/gi, function (tag, href) {
      var key = baseName(href);
      if (!/stylesheet/i.test(tag) || !Object.prototype.hasOwnProperty.call(fileMap, key)) return tag;
      return "<style>\n" + String(fileMap[key]).replace(/<\/style/gi, "<\\/style") + "\n</style>";
    });

    out = out.replace(/<script\b([^>]*?)src\s*=\s*["']([^"']+)["']([^>]*)>\s*<\/script>/gi, function (tag, pre, src, post) {
      var key = baseName(src);
      if (!Object.prototype.hasOwnProperty.call(fileMap, key)) return tag;
      var attrs = (pre + " " + post).match(/\btype\s*=\s*["'][^"']*["']/i);
      return "<script" + (attrs ? " " + attrs[0] : "") + ">\n" +
        String(fileMap[key]).replace(/<\/script/gi, "<\\/script") + "\n</script>";
    });

    out = out.replace(/\bsrc\s*=\s*["']([^"']+\.svg)["']/gi, function (attr, src) {
      var key = baseName(src);
      if (!Object.prototype.hasOwnProperty.call(fileMap, key)) return attr;
      return 'src="data:image/svg+xml;charset=utf-8,' + encodeURIComponent(fileMap[key]) + '"';
    });

    return out;
  }

  /** Prosty render Markdown (nagłówki, listy, kod, pogrubienia, linki). */
  function renderMarkdown(md) {
    var blocks = [];
    var text = String(md).replace(/```([\s\S]*?)```/g, function (m, code) {
      blocks.push("<pre><code>" + escapeHtml(code.replace(/^\w*\n/, "")) + "</code></pre>");
      return "\u0000" + (blocks.length - 1) + "\u0000";
    });

    text = escapeHtml(text)
      .replace(/^###### (.*)$/gm, "<h6>$1</h6>")
      .replace(/^##### (.*)$/gm, "<h5>$1</h5>")
      .replace(/^#### (.*)$/gm, "<h4>$1</h4>")
      .replace(/^### (.*)$/gm, "<h3>$1</h3>")
      .replace(/^## (.*)$/gm, "<h2>$1</h2>")
      .replace(/^# (.*)$/gm, "<h1>$1</h1>")
      .replace(/^\s*[-*] (.*)$/gm, "<li>$1</li>")
      .replace(/(<li>[\s\S]*?<\/li>)(?!\s*<li>)/g, "<ul>$1</ul>")
      .replace(/`([^`\n]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" rel="noreferrer">$1</a>')
      .replace(/^(?!<[hulpc])(.+)$/gm, "<p>$1</p>");

    return text.replace(/\u0000(\d+)\u0000/g, function (m, i) { return blocks[+i]; });
  }

  global.KB = {
    escapeHtml: escapeHtml,
    fmtSize: fmtSize,
    fmtDate: fmtDate,
    byteLength: byteLength,
    extOf: extOf,
    baseName: baseName,
    safeFileName: safeFileName,
    asciiFileName: asciiFileName,
    EXTENSIONS: EXTENSIONS,
    EXT_MAP: EXT_MAP,
    mimeOf: mimeOf,
    langOf: langOf,
    detectExtension: detectExtension,
    slugify: slugify,
    splitMarkdown: splitMarkdown,
    downloadBlob: downloadBlob,
    downloadText: downloadText,
    makeZip: makeZip,
    encodePayload: encodePayload,
    decodePayload: decodePayload,
    inlineHtml: inlineHtml,
    renderMarkdown: renderMarkdown
  };
})(window);
