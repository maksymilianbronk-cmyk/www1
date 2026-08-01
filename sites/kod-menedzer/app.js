/* KodBox — logika aplikacji: projekty, menedżer plików, edytor, podgląd, udostępnianie.
   Dwa tryby zapisu: IndexedDB w przeglądarce albo backend Flask z katalogu server/. */

(function () {
  "use strict";

  var KB = window.KB;
  var $ = function (id) { return document.getElementById(id); };

  /* =====================================================================
     Powiadomienia
     ===================================================================== */

  function toast(msg, kind) {
    var box = document.createElement("div");
    box.className = "toast" + (kind ? " " + kind : "");
    box.textContent = msg;
    $("toasts").appendChild(box);
    setTimeout(function () {
      box.style.transition = "opacity .3s";
      box.style.opacity = "0";
      setTimeout(function () { box.remove(); }, 300);
    }, 3200);
  }

  /* =====================================================================
     Podświetlanie składni (własny skaner, bez bibliotek)
     ===================================================================== */

  var IDENT = [/[A-Za-z_$][\w$]*/y, null];

  var RULES = {
    js: [
      [/\/\*[\s\S]*?(?:\*\/|$)/y, "t-com"],
      [/\/\/[^\n]*/y, "t-com"],
      [/`(?:\\[\s\S]|[^\\`])*`?/y, "t-str"],
      [/"(?:\\[\s\S]|[^\\"\n])*"?/y, "t-str"],
      [/'(?:\\[\s\S]|[^\\'\n])*'?/y, "t-str"],
      [/\b(?:const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|class|extends|super|this|typeof|instanceof|await|async|try|catch|finally|throw|import|export|from|default|delete|in|of|yield|static|public|private|void)\b/y, "t-key"],
      [/\b(?:true|false|null|undefined|NaN|Infinity|self|window|document|console)\b/y, "t-lit"],
      [/\b0[xX][0-9a-fA-F]+\b|\b\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?\b/y, "t-num"],
      [/[A-Za-z_$][\w$]*(?=\s*\()/y, "t-fun"],
      IDENT
    ],
    html: [
      [/<!--[\s\S]*?(?:-->|$)/y, "t-com"],
      [/<!DOCTYPE[^>]*>/iy, "t-com"],
      [/<\/?[A-Za-z][\w:-]*/y, "t-tag"],
      [/"[^"]*"?|'[^']*'?/y, "t-str"],
      [/[A-Za-z_:][\w:.-]*(?=\s*=)/y, "t-att"],
      [/\/?>/y, "t-tag"],
      IDENT
    ],
    css: [
      [/\/\*[\s\S]*?(?:\*\/|$)/y, "t-com"],
      [/"[^"\n]*"?|'[^'\n]*'?/y, "t-str"],
      [/@[\w-]+/y, "t-key"],
      [/--[\w-]+/y, "t-pro"],
      [/[a-z-]+(?=\s*:)/y, "t-pro"],
      [/#[0-9a-fA-F]{3,8}\b/y, "t-num"],
      [/\b\d*\.?\d+(?:px|em|rem|%|vh|vw|s|ms|deg|fr|ch|pt)?\b/y, "t-num"],
      [/[.#][\w-]+|:{1,2}[\w-]+/y, "t-tag"],
      IDENT
    ],
    py: [
      [/#[^\n]*/y, "t-com"],
      [/"""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$)/y, "t-str"],
      [/[rbuf]?"(?:\\[\s\S]|[^\\"\n])*"?|[rbuf]?'(?:\\[\s\S]|[^\\'\n])*'?/y, "t-str"],
      [/\b(?:def|class|return|if|elif|else|for|while|import|from|as|with|try|except|finally|raise|lambda|global|nonlocal|pass|break|continue|yield|assert|async|await|del|in|is|not|and|or)\b/y, "t-key"],
      [/\b(?:True|False|None|self|cls)\b/y, "t-lit"],
      [/\b\d[\d_]*(?:\.\d+)?\b/y, "t-num"],
      [/[A-Za-z_][\w]*(?=\s*\()/y, "t-fun"],
      [/@[\w.]+/y, "t-att"],
      IDENT
    ],
    json: [
      [/"(?:\\[\s\S]|[^\\"])*"(?=\s*:)/y, "t-pro"],
      [/"(?:\\[\s\S]|[^\\"])*"?/y, "t-str"],
      [/\b(?:true|false|null)\b/y, "t-lit"],
      [/-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/y, "t-num"],
      IDENT
    ],
    md: [
      [/```[\s\S]*?(?:```|$)/y, "t-str"],
      [/^#{1,6}[^\n]*/my, "t-key"],
      [/`[^`\n]*`/y, "t-str"],
      [/\*\*[^*\n]+\*\*|\*[^*\n]+\*/y, "t-fun"],
      [/\[[^\]\n]*\]\([^)\n]*\)/y, "t-att"],
      [/^\s*(?:[-*+]|\d+\.)\s/my, "t-tag"],
      IDENT
    ],
    sql: [
      [/--[^\n]*/y, "t-com"],
      [/'(?:''|[^'])*'?/y, "t-str"],
      [/\b(?:SELECT|FROM|WHERE|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|ALTER|DROP|JOIN|LEFT|RIGHT|INNER|OUTER|ON|GROUP|ORDER|BY|HAVING|LIMIT|OFFSET|AS|AND|OR|NOT|NULL|PRIMARY|KEY|FOREIGN|REFERENCES|INDEX|UNIQUE|DEFAULT|DISTINCT|COUNT|SUM|AVG|MIN|MAX|CASE|WHEN|THEN|ELSE|END)\b/iy, "t-key"],
      [/\b\d+(?:\.\d+)?\b/y, "t-num"],
      IDENT
    ],
    sh: [
      [/#[^\n]*/y, "t-com"],
      [/"(?:\\[\s\S]|[^\\"])*"?|'[^']*'?/y, "t-str"],
      [/\b(?:if|then|else|elif|fi|for|while|do|done|case|esac|function|return|export|local|source|echo|cd|mkdir|rm|cp|mv|cat|grep|sed|awk)\b/y, "t-key"],
      [/\$\{?[\w@#?]+\}?/y, "t-lit"],
      IDENT
    ],
    ini: [
      [/[#;][^\n]*/y, "t-com"],
      [/^\[[^\]\n]*\]/my, "t-key"],
      [/^[\w.-]+(?=\s*=)/my, "t-pro"],
      [/"[^"\n]*"?|'[^'\n]*'?/y, "t-str"],
      IDENT
    ],
    yml: [
      [/#[^\n]*/y, "t-com"],
      [/^[ \t]*-?[ \t]*[\w.-]+(?=\s*:)/my, "t-pro"],
      [/"[^"\n]*"?|'[^'\n]*'?/y, "t-str"],
      [/\b(?:true|false|null|yes|no|on|off)\b/y, "t-lit"],
      [/\b\d+(?:\.\d+)?\b/y, "t-num"],
      IDENT
    ]
  };

  function highlight(code, lang) {
    var rules = RULES[lang];
    if (!rules || code.length > 120000) return KB.escapeHtml(code);
    var out = "";
    var i = 0;
    var n = code.length;
    while (i < n) {
      var hit = null;
      for (var r = 0; r < rules.length; r++) {
        var re = rules[r][0];
        re.lastIndex = i;
        var m = re.exec(code);
        if (m && m[0]) { hit = [m[0], rules[r][1]]; break; }
      }
      if (hit) {
        out += hit[1] ? '<span class="' + hit[1] + '">' + KB.escapeHtml(hit[0]) + "</span>" : KB.escapeHtml(hit[0]);
        i += hit[0].length;
      } else {
        out += KB.escapeHtml(code[i]);
        i += 1;
      }
    }
    return out;
  }

  /* =====================================================================
     Magazyn 1: przeglądarka (IndexedDB)
     ===================================================================== */

  var DB_NAME = "kodbox";
  var dbPromise = null;

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      var req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains("projects")) db.createObjectStore("projects", { keyPath: "id" });
        if (!db.objectStoreNames.contains("files")) {
          var s = db.createObjectStore("files", { keyPath: "key" });
          s.createIndex("pid", "pid", { unique: false });
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
    return dbPromise;
  }

  function reqDone(request) {
    return new Promise(function (resolve, reject) {
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error); };
    });
  }

  function fileKey(pid, name) { return pid + "::" + name; }
  function newId() { return Math.random().toString(36).slice(2, 10); }

  var LocalStore = {
    kind: "local",
    label: "Zapis lokalny (IndexedDB)",

    listProjects: function () {
      return openDb().then(function (db) {
        return reqDone(db.transaction("projects").objectStore("projects").getAll());
      }).then(function (rows) {
        return rows.sort(function (a, b) { return (b.updated || b.created).localeCompare(a.updated || a.created); });
      });
    },

    createProject: function (name, description) {
      var now = new Date().toISOString();
      var project = { id: newId(), name: name, description: description || "", created: now, updated: now, shares: 0 };
      return openDb().then(function (db) {
        return reqDone(db.transaction("projects", "readwrite").objectStore("projects").put(project));
      }).then(function () { return project; });
    },

    // Każdy krok w osobnej transakcji — transakcja IndexedDB wygasa,
    // gdy sterowanie wróci do pętli zdarzeń między żądaniami.
    updateProject: function (id, patch) {
      return openDb().then(function (db) {
        return reqDone(db.transaction("projects").objectStore("projects").get(id)).then(function (p) {
          if (!p) throw new Error("Projekt nie istnieje");
          Object.assign(p, patch, { updated: new Date().toISOString() });
          return reqDone(db.transaction("projects", "readwrite").objectStore("projects").put(p))
            .then(function () { return p; });
        });
      });
    },

    deleteProject: function (id) {
      return openDb().then(function (db) {
        return reqDone(db.transaction("files").objectStore("files").index("pid").getAllKeys(IDBKeyRange.only(id)))
          .then(function (keys) {
            var t = db.transaction(["projects", "files"], "readwrite");
            t.objectStore("projects").delete(id);
            keys.forEach(function (k) { t.objectStore("files").delete(k); });
            return new Promise(function (resolve, reject) {
              t.oncomplete = function () { resolve(); };
              t.onerror = function () { reject(t.error); };
              t.onabort = function () { reject(t.error); };
            });
          });
      });
    },

    getProject: function (id) {
      return openDb().then(function (db) {
        var t = db.transaction(["projects", "files"]);
        return Promise.all([
          reqDone(t.objectStore("projects").get(id)),
          reqDone(t.objectStore("files").index("pid").getAll(IDBKeyRange.only(id)))
        ]);
      }).then(function (pair) {
        var project = pair[0];
        if (!project) throw new Error("Projekt nie istnieje");
        project.files = pair[1].map(function (f) {
          return { name: f.name, size: f.size, modified: f.modified };
        }).sort(function (a, b) { return a.name.localeCompare(b.name); });
        return project;
      });
    },

    readFile: function (pid, name) {
      return openDb().then(function (db) {
        return reqDone(db.transaction("files").objectStore("files").get(fileKey(pid, name)));
      }).then(function (f) {
        if (!f) throw new Error("Plik nie istnieje");
        return f.content;
      });
    },

    writeFile: function (pid, name, content) {
      var record = {
        key: fileKey(pid, name), pid: pid, name: name, content: content,
        size: KB.byteLength(content), modified: new Date().toISOString()
      };
      return openDb().then(function (db) {
        return reqDone(db.transaction("files", "readwrite").objectStore("files").put(record));
      }).then(function () {
        return LocalStore.updateProject(pid, {});
      }).then(function () {
        return { name: name, size: record.size, modified: record.modified };
      });
    },

    renameFile: function (pid, name, nextName) {
      return LocalStore.readFile(pid, name).then(function (content) {
        return LocalStore.writeFile(pid, nextName, content);
      }).then(function (meta) {
        return LocalStore.deleteFile(pid, name).then(function () { return meta; });
      });
    },

    deleteFile: function (pid, name) {
      return openDb().then(function (db) {
        return reqDone(db.transaction("files", "readwrite").objectStore("files").delete(fileKey(pid, name)));
      });
    },

    createShare: function (pid) {
      var project;
      return LocalStore.getProject(pid).then(function (p) {
        project = p;
        return Promise.all(p.files.map(function (f) {
          return LocalStore.readFile(pid, f.name).then(function (c) { return { n: f.name, c: c }; });
        }));
      }).then(function (files) {
        return KB.encodePayload({ v: 1, name: project.name, desc: project.description, files: files });
      }).then(function (payload) {
        return LocalStore.updateProject(pid, { shares: (project.shares || 0) + 1 }).then(function () {
          return { url: new URL("share.html", location.href).href + "#" + payload, inline: true };
        });
      });
    }
  };

  /* =====================================================================
     Magazyn 2: serwer (Flask, katalog server/)
     ===================================================================== */

  function ServerStore(base) {
    function api(path, options) {
      return fetch(base + "/api" + path, Object.assign({ headers: { "Content-Type": "application/json" } }, options))
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (data) {
            if (!res.ok) throw new Error(data.error || "Błąd serwera (" + res.status + ")");
            return data;
          });
        });
    }
    var enc = encodeURIComponent;

    return {
      kind: "server",
      base: base,
      label: "Serwer " + base,
      listProjects: function () { return api("/projects"); },
      createProject: function (name, description) {
        return api("/projects", { method: "POST", body: JSON.stringify({ name: name, description: description }) });
      },
      updateProject: function (id, patch) {
        return api("/projects/" + enc(id), { method: "PATCH", body: JSON.stringify(patch) });
      },
      deleteProject: function (id) { return api("/projects/" + enc(id), { method: "DELETE" }); },
      getProject: function (id) { return api("/projects/" + enc(id)); },
      readFile: function (pid, name) {
        return api("/projects/" + enc(pid) + "/files/" + enc(name)).then(function (d) { return d.content; });
      },
      writeFile: function (pid, name, content) {
        return api("/projects/" + enc(pid) + "/files", {
          method: "POST", body: JSON.stringify({ filename: name, content: content })
        });
      },
      renameFile: function (pid, name, nextName) {
        return api("/projects/" + enc(pid) + "/files/" + enc(name) + "/rename", {
          method: "POST", body: JSON.stringify({ new_name: nextName })
        });
      },
      deleteFile: function (pid, name) {
        return api("/projects/" + enc(pid) + "/files/" + enc(name), { method: "DELETE" });
      },
      createShare: function (pid) {
        return api("/projects/" + enc(pid) + "/share", { method: "POST" }).then(function (d) {
          return { url: d.share_url, inline: false };
        });
      }
    };
  }

  function pingServer(base) {
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, 2500);
    return fetch(base.replace(/\/$/, "") + "/api/ping", { signal: ctrl.signal, cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { return !!(d && d.app === "kodbox"); })
      .catch(function () { return false; })
      .then(function (ok) { clearTimeout(timer); return ok; });
  }

  /* =====================================================================
     Stan aplikacji
     ===================================================================== */

  var Store = LocalStore;
  var state = {
    projects: [],
    project: null,
    file: null,
    dirty: false,
    previewOn: false,
    projectFilter: "",
    fileFilter: ""
  };

  /* =====================================================================
     Panel projektów
     ===================================================================== */

  function refreshProjects(selectId) {
    return Store.listProjects().then(function (list) {
      state.projects = list || [];
      renderProjects();
      var target = selectId || (state.project && state.project.id);
      if (target && state.projects.some(function (p) { return p.id === target; })) {
        return selectProject(target);
      }
      showEmpty();
      return null;
    }).catch(function (err) {
      toast("Nie udało się wczytać projektów: " + err.message, "bad");
    });
  }

  function renderProjects() {
    var q = state.projectFilter.toLowerCase();
    var list = state.projects.filter(function (p) {
      return !q || (p.name + " " + (p.description || "")).toLowerCase().indexOf(q) >= 0;
    });
    $("projectCount").textContent = state.projects.length;
    var box = $("projectList");
    box.innerHTML = "";
    if (!list.length) {
      var info = document.createElement("div");
      info.style.cssText = "padding:14px;color:var(--txt-3);font-size:12.5px";
      info.textContent = state.projects.length ? "Brak dopasowań." : "Nie masz jeszcze projektów.";
      box.appendChild(info);
      return;
    }
    list.forEach(function (p) {
      var btn = document.createElement("button");
      btn.className = "project-item" + (state.project && state.project.id === p.id ? " active" : "");
      btn.innerHTML = "<strong></strong><span></span>";
      btn.querySelector("strong").textContent = p.name;
      btn.querySelector("span").textContent = (p.description || "utworzono " + (p.created || "").slice(0, 10));
      btn.addEventListener("click", function () { selectProject(p.id); });
      box.appendChild(btn);
    });
  }

  function showEmpty() {
    state.project = null;
    $("projectView").hidden = true;
    $("emptyState").hidden = false;
    renderProjects();
  }

  function selectProject(id) {
    return Store.getProject(id).then(function (project) {
      state.project = project;
      $("emptyState").hidden = true;
      $("projectView").hidden = false;
      $("projectTitle").textContent = project.name;
      $("projectDesc").textContent = project.description || "";
      closeEditor(true);
      renderProjects();
      renderFiles();
      renderStats();
    }).catch(function (err) {
      toast(err.message, "bad");
      showEmpty();
    });
  }

  function renderStats() {
    var p = state.project;
    var files = p.files || [];
    var total = files.reduce(function (a, f) { return a + (f.size || 0); }, 0);
    var days = Math.max(0, Math.floor((Date.now() - new Date(p.created).getTime()) / 86400000));
    $("statFiles").textContent = files.length;
    $("statSize").textContent = KB.fmtSize(total);
    $("statAge").textContent = isNaN(days) ? "0" : days;
    $("statShares").textContent = p.shares || 0;
    $("statusInfo").textContent = p.name + " · " + files.length + " plików · " + KB.fmtSize(total);
  }

  /* =====================================================================
     Menedżer plików
     ===================================================================== */

  function renderFiles() {
    var box = $("fileList");
    box.innerHTML = "";
    var files = (state.project.files || []).filter(function (f) {
      return !state.fileFilter || f.name.toLowerCase().indexOf(state.fileFilter.toLowerCase()) >= 0;
    });
    $("emptyFiles").hidden = files.length > 0;

    files.forEach(function (f) {
      var ext = KB.extOf(f.name) || "?";
      var card = document.createElement("div");
      card.className = "file-card" + (state.file === f.name ? " active" : "");

      var open = document.createElement("button");
      open.className = "file-open";
      open.innerHTML =
        '<div class="file-top"><span class="ext-chip"></span><span class="file-name"></span></div>' +
        '<div class="file-meta"></div>';
      open.querySelector(".ext-chip").textContent = ext.slice(0, 4).toUpperCase();
      open.querySelector(".ext-chip").style.background = extColor(ext);
      open.querySelector(".file-name").textContent = f.name;
      open.querySelector(".file-name").title = f.name;
      open.querySelector(".file-meta").textContent = KB.fmtSize(f.size || 0) + " · " + KB.fmtDate(f.modified);
      open.addEventListener("click", function () { openFile(f.name); });
      card.appendChild(open);

      var actions = document.createElement("div");
      actions.className = "file-actions";
      var extras = [];
      if (ext === "md" || ext === "markdown") {
        extras.push(["✂️", "Rozbij na osobne pliki z kodem", function () {
          Store.readFile(state.project.id, f.name).then(openMarkdownModal);
        }]);
      }
      extras.concat([
        ["⬇️", "Pobierz", function () { downloadFile(f.name); }],
        ["✏️", "Zmień nazwę", function () { renameFile(f.name); }],
        ["⧉", "Duplikuj", function () { duplicateFile(f.name); }],
        ["🗑️", "Usuń", function () { removeFile(f.name); }]
      ]).forEach(function (a) {
        var b = document.createElement("button");
        b.className = "btn btn-sm";
        b.textContent = a[0];
        b.title = a[1];
        b.addEventListener("click", a[2]);
        actions.appendChild(b);
      });
      card.appendChild(actions);
      box.appendChild(card);
    });
  }

  function extColor(ext) {
    var palette = {
      html: "#e34c26", css: "#2965f1", js: "#c9a227", mjs: "#c9a227", json: "#3d8b6a",
      py: "#3572A5", md: "#4a4a5e", svg: "#a05fb0", sql: "#b5651d", php: "#6b74a8",
      sh: "#3f6d3f", yml: "#8a5a2b", yaml: "#8a5a2b", ts: "#2f74c0", tsx: "#2f74c0", jsx: "#c9a227"
    };
    return palette[ext] || "#26263a";
  }

  function reloadProject() {
    return Store.getProject(state.project.id).then(function (p) {
      state.project = p;
      renderFiles();
      renderStats();
    });
  }

  function downloadFile(name) {
    Store.readFile(state.project.id, name).then(function (content) {
      KB.downloadText(content, name);
      toast("Pobrano " + name, "ok");
    }).catch(function (e) { toast(e.message, "bad"); });
  }

  function renameFile(name) {
    var next = prompt("Nowa nazwa pliku:", name);
    if (!next || next === name) return;
    next = KB.safeFileName(next);
    if (!KB.extOf(next)) next += "." + (KB.extOf(name) || "txt");
    Store.renameFile(state.project.id, name, next).then(function () {
      if (state.file === name) { state.file = next; $("editorFileName").textContent = next; }
      toast("Zmieniono nazwę na " + next, "ok");
      return reloadProject();
    }).catch(function (e) { toast(e.message, "bad"); });
  }

  function duplicateFile(name) {
    var ext = KB.extOf(name);
    var stem = ext ? name.slice(0, -(ext.length + 1)) : name;
    var copy = stem + "-kopia" + (ext ? "." + ext : "");
    Store.readFile(state.project.id, name).then(function (content) {
      return Store.writeFile(state.project.id, copy, content);
    }).then(function () {
      toast("Utworzono " + copy, "ok");
      return reloadProject();
    }).catch(function (e) { toast(e.message, "bad"); });
  }

  function removeFile(name) {
    if (!confirm("Usunąć plik " + name + "? Tej operacji nie można cofnąć.")) return;
    Store.deleteFile(state.project.id, name).then(function () {
      if (state.file === name) closeEditor(true);
      toast("Usunięto " + name, "ok");
      return reloadProject();
    }).catch(function (e) { toast(e.message, "bad"); });
  }

  /* =====================================================================
     Edytor
     ===================================================================== */

  var codeEl = $("code");
  var hlEl = $("hl");
  var gutterEl = $("gutter");

  function paintEditor() {
    var text = codeEl.value;
    hlEl.innerHTML = highlight(text, KB.langOf(state.file || "plik.txt")) + "\n";
    var lines = text.split("\n").length;
    var nums = [];
    for (var i = 1; i <= lines; i++) nums.push(i);
    gutterEl.textContent = nums.join("\n");
    syncScroll();
  }

  function syncScroll() {
    var pre = hlEl.parentNode;
    pre.scrollTop = codeEl.scrollTop;
    pre.scrollLeft = codeEl.scrollLeft;
    gutterEl.scrollTop = codeEl.scrollTop;
  }

  function setDirty(on) {
    state.dirty = on;
    $("editorPanel").classList.toggle("dirty", !!on);
  }

  function openFile(name) {
    var go = function () {
      return Store.readFile(state.project.id, name).then(function (content) {
        state.file = name;
        codeEl.value = content;
        $("editorFileName").textContent = name;
        $("editorPanel").hidden = false;
        setDirty(false);
        paintEditor();
        renderFiles();
        $("editorPanel").scrollIntoView({ behavior: "smooth", block: "nearest" });
        if (state.previewOn) refreshPreview();
      });
    };
    guardDirty().then(go).catch(function (e) { if (e) toast(e.message, "bad"); });
  }

  function guardDirty() {
    if (!state.dirty || !state.file) return Promise.resolve();
    if (confirm("Plik " + state.file + " ma niezapisane zmiany. Zapisać przed przejściem dalej?")) {
      return saveCurrent();
    }
    setDirty(false);
    return Promise.resolve();
  }

  function saveCurrent() {
    if (!state.file) return Promise.resolve();
    return Store.writeFile(state.project.id, state.file, codeEl.value).then(function () {
      setDirty(false);
      toast("Zapisano " + state.file, "ok");
      return reloadProject();
    }).then(function () {
      if (state.previewOn) refreshPreview();
    }).catch(function (e) { toast(e.message, "bad"); });
  }

  function closeEditor(silent) {
    if (!silent && state.dirty && !confirm("Zamknąć bez zapisywania zmian?")) return;
    state.file = null;
    setDirty(false);
    $("editorPanel").hidden = true;
    codeEl.value = "";
    if (state.project) renderFiles();
  }

  /* =====================================================================
     Podgląd
     ===================================================================== */

  function collectFileMap() {
    var files = (state.project.files || []).filter(function (f) { return f.name !== state.file; });
    return Promise.all(files.map(function (f) {
      return Store.readFile(state.project.id, f.name).then(function (c) { return [f.name, c]; })
        .catch(function () { return null; });
    })).then(function (pairs) {
      var map = {};
      pairs.filter(Boolean).forEach(function (p) { map[p[0]] = p[1]; });
      return map;
    });
  }

  function buildPreviewDoc() {
    var name = state.file || "";
    var ext = KB.extOf(name);
    var body = codeEl.value;
    if (ext === "md") {
      return Promise.resolve(
        '<!doctype html><meta charset="utf-8"><style>body{font:15px/1.6 system-ui;max-width:760px;margin:32px auto;padding:0 20px;color:#1c1c22}' +
        "pre{background:#f4f4f8;padding:12px;border-radius:8px;overflow:auto}code{font-family:monospace}</style>" +
        KB.renderMarkdown(body)
      );
    }
    if (ext === "svg") {
      return Promise.resolve('<!doctype html><meta charset="utf-8"><style>body{margin:0;display:grid;place-items:center;height:100vh;background:#fff}svg{max-width:90%;max-height:90%}</style>' + body);
    }
    if (ext !== "html" && ext !== "xml" && ext !== "vue") {
      return Promise.resolve(
        '<!doctype html><meta charset="utf-8"><style>body{margin:0;font:13px/1.6 ui-monospace,monospace;white-space:pre-wrap;padding:16px;color:#1c1c22}</style>' +
        "<pre>" + KB.escapeHtml(body) + "</pre>"
      );
    }
    return collectFileMap().then(function (map) { return KB.inlineHtml(body, map); });
  }

  function refreshPreview() {
    if (!state.previewOn || !state.file) return;
    buildPreviewDoc().then(function (doc) { $("previewFrame").srcdoc = doc; });
  }

  function togglePreview() {
    state.previewOn = !state.previewOn;
    $("previewPane").hidden = !state.previewOn;
    $("editorBody").classList.toggle("with-preview", state.previewOn);
    $("btnTogglePreview").classList.toggle("btn-ok", state.previewOn);
    if (state.previewOn) refreshPreview();
  }

  function openInTab() {
    if (!state.file) return;
    buildPreviewDoc().then(function (doc) {
      var blob = new Blob([doc], { type: "text/html;charset=utf-8" });
      var url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener");
      setTimeout(function () { URL.revokeObjectURL(url); }, 20000);
    });
  }

  /* =====================================================================
     Nowy plik / wklejanie kodu
     ===================================================================== */

  function fillExtensions() {
    var sel = $("selExt");
    KB.EXTENSIONS.forEach(function (e) {
      var opt = document.createElement("option");
      opt.value = e.ext;
      opt.textContent = e.label + " (." + e.ext + ")";
      sel.appendChild(opt);
    });
    sel.value = "html";
  }

  function openFileModal() {
    $("inpFileName").value = "";
    $("inpFileContent").value = "";
    $("selExt").value = "html";
    $("detectHint").textContent = "Rozszerzenie zostanie rozpoznane automatycznie po wklejeniu kodu — możesz je nadpisać ręcznie.";
    openModal("modalFile");
    setTimeout(function () { $("inpFileContent").focus(); }, 60);
  }

  function autoDetect() {
    var code = $("inpFileContent").value;
    var ext = KB.detectExtension(code);
    if (!ext) return;
    var meta = KB.EXT_MAP[ext];
    $("selExt").value = ext;
    $("detectHint").textContent = "Rozpoznano: " + (meta ? meta.label : ext.toUpperCase()) +
      " — plik zostanie zapisany z rozszerzeniem ." + ext + ". Możesz to zmienić powyżej.";
  }

  function saveNewFile() {
    var ext = $("selExt").value;
    var raw = ($("inpFileName").value || "").trim();
    var content = $("inpFileContent").value;
    if (!content.trim()) { toast("Wklej najpierw jakiś kod.", "bad"); return; }

    var name = KB.safeFileName(raw || defaultName(ext));
    if (KB.extOf(name) !== ext) name = name.replace(/\.[^.]*$/, "") + "." + ext;

    var exists = (state.project.files || []).some(function (f) { return f.name === name; });
    if (exists && !confirm("Plik " + name + " już istnieje. Nadpisać?")) return;

    Store.writeFile(state.project.id, name, content).then(function () {
      closeModal("modalFile");
      toast("Zapisano " + name, "ok");
      return reloadProject().then(function () { openFile(name); });
    }).catch(function (e) { toast(e.message, "bad"); });
  }

  function defaultName(ext) {
    if (ext === "html") return "index.html";
    if (ext === "css") return "styles.css";
    if (ext === "js") return "script.js";
    if (ext === "py") return "main.py";
    if (ext === "md") return "README.md";
    return "plik." + ext;
  }

  /* =====================================================================
     Markdown → osobne pliki
     ===================================================================== */

  var mdFiles = [];

  function openMarkdownModal(content) {
    $("inpMarkdown").value = content || "";
    $("mdResult").hidden = true;
    $("btnMdSave").disabled = true;
    $("chkMdProse").checked = false;
    mdFiles = [];
    openModal("modalMarkdown");
    if (content) analyzeMarkdown();
    else setTimeout(function () { $("inpMarkdown").focus(); }, 60);
  }

  function analyzeMarkdown() {
    var text = $("inpMarkdown").value;
    if (!text.trim()) { toast("Wklej najpierw treść pliku .md", "bad"); return; }

    var result = KB.splitMarkdown(text);
    mdFiles = result.files;
    window.__mdProse = result.prose;

    if (!mdFiles.length) {
      $("mdResult").hidden = true;
      $("btnMdSave").disabled = true;
      toast("Nie znaleziono bloków kodu (```) w tym dokumencie.", "bad");
      return;
    }

    /* nie nadpisujemy istniejących plików bez ostrzeżenia — dokładamy sufiks */
    var existing = {};
    (state.project.files || []).forEach(function (f) { existing[f.name.toLowerCase()] = true; });

    renderMarkdownList(existing);
    $("mdResult").hidden = false;
    $("btnMdSave").disabled = false;
    $("mdCount").textContent = mdFiles.length;
    $("chkMdProse").checked = false;
    $("chkMdProse").disabled = !result.prose;
  }

  function renderMarkdownList(existing) {
    var box = $("mdList");
    box.innerHTML = "";
    mdFiles.forEach(function (f, i) {
      var row = document.createElement("div");
      row.className = "md-row" + (f.selected ? "" : " off");

      var check = document.createElement("input");
      check.type = "checkbox";
      check.checked = f.selected;
      check.addEventListener("change", function () {
        f.selected = check.checked;
        row.classList.toggle("off", !check.checked);
      });

      var middle = document.createElement("div");
      var name = document.createElement("input");
      name.className = "field md-name";
      name.value = f.name;
      name.addEventListener("input", function () { f.name = name.value; });
      var info = document.createElement("div");
      info.className = "md-info";
      var lines = f.content.split("\n").length;
      info.textContent = (f.lang || "?") + " · " + KB.fmtSize(f.size) + " · " + lines + " linii" +
        (f.heading ? " · z sekcji „" + f.heading + "”" : "") +
        (existing[f.name.toLowerCase()] ? " · ⚠️ plik o tej nazwie już istnieje" : "");
      middle.appendChild(name);
      middle.appendChild(info);

      var side = document.createElement("div");
      side.className = "md-side";
      var chip = document.createElement("span");
      chip.className = "ext-chip";
      chip.textContent = (f.ext || "?").slice(0, 4).toUpperCase();
      chip.style.background = extColor(f.ext);
      var peek = document.createElement("button");
      peek.className = "btn btn-sm";
      peek.textContent = "👁️";
      peek.title = "Podejrzyj początek kodu";
      peek.addEventListener("click", function () {
        alert(f.content.slice(0, 1200) + (f.content.length > 1200 ? "\n\n… (skrócono)" : ""));
      });
      side.appendChild(chip);
      side.appendChild(peek);

      row.appendChild(check);
      row.appendChild(middle);
      row.appendChild(side);
      box.appendChild(row);
      void i;
    });
  }

  function toggleAllMd(on) {
    mdFiles.forEach(function (f) { f.selected = on; });
    var existing = {};
    (state.project.files || []).forEach(function (f) { existing[f.name.toLowerCase()] = true; });
    renderMarkdownList(existing);
  }

  function saveMarkdownFiles() {
    var chosen = mdFiles.filter(function (f) { return f.selected && f.name.trim(); });
    if (!chosen.length) { toast("Zaznacz przynajmniej jeden blok.", "bad"); return; }

    var jobs = chosen.map(function (f) { return { name: KB.safeFileName(f.name), content: f.content }; });
    if ($("chkMdProse").checked && window.__mdProse) {
      jobs.push({ name: "README.md", content: window.__mdProse });
    }

    jobs.reduce(function (chain, job) {
      return chain.then(function () { return Store.writeFile(state.project.id, job.name, job.content); });
    }, Promise.resolve()).then(function () {
      closeModal("modalMarkdown");
      toast("Zapisano plików: " + jobs.length, "ok");
      return reloadProject();
    }).then(function () {
      var first = jobs.filter(function (j) { return KB.extOf(j.name) === "html"; })[0] || jobs[0];
      if (first) openFile(first.name);
    }).catch(function (e) { toast(e.message, "bad"); });
  }

  /* =====================================================================
     Wgrywanie plików (przycisk i przeciąganie)
     ===================================================================== */

  var BINARY = /\.(png|jpe?g|gif|webp|ico|bmp|pdf|zip|rar|7z|mp[34]|mov|avi|woff2?|ttf|otf|exe|dll)$/i;

  function importFiles(fileList) {
    if (!state.project) { toast("Najpierw wybierz projekt.", "bad"); return; }
    var files = Array.prototype.slice.call(fileList);

    /* pojedynczy plik .md — proponujemy rozbicie na osobne pliki z kodem */
    if (files.length === 1 && /\.(md|markdown)$/i.test(files[0].name)) {
      files[0].text().then(function (text) {
        if (KB.splitMarkdown(text).files.length &&
            confirm('Plik "' + files[0].name + '" to Markdown z blokami kodu.\n\n' +
                    "OK — rozbij go na osobne pliki (HTML, CSS, JS…).\n" +
                    "Anuluj — zapisz jako jeden plik .md.")) {
          openMarkdownModal(text);
        } else {
          Store.writeFile(state.project.id, KB.safeFileName(files[0].name), text)
            .then(reloadProject)
            .then(function () { toast("Zapisano " + files[0].name, "ok"); });
        }
      });
      return;
    }

    var accepted = files.filter(function (f) { return !BINARY.test(f.name); });
    var skipped = files.length - accepted.length;

    Promise.all(accepted.map(function (f) {
      return f.text().then(function (text) {
        return Store.writeFile(state.project.id, KB.safeFileName(f.name), text);
      });
    })).then(function () {
      if (accepted.length) toast("Dodano plików: " + accepted.length, "ok");
      if (skipped) toast("Pominięto " + skipped + " plików binarnych (obsługiwany jest tekst).", "bad");
      return reloadProject();
    }).catch(function (e) { toast(e.message, "bad"); });
  }

  /* =====================================================================
     ZIP i kopia zapasowa
     ===================================================================== */

  function downloadZip() {
    var p = state.project;
    Promise.all((p.files || []).map(function (f) {
      return Store.readFile(p.id, f.name).then(function (c) {
        return { name: f.name, content: c, modified: f.modified };
      });
    })).then(function (files) {
      if (!files.length) { toast("Projekt nie ma plików.", "bad"); return; }
      KB.downloadBlob(KB.makeZip(files), KB.safeFileName(p.name || "projekt") + ".zip");
      toast("Pobrano archiwum ZIP", "ok");
    }).catch(function (e) { toast(e.message, "bad"); });
  }

  function exportAll() {
    Store.listProjects().then(function (projects) {
      return Promise.all(projects.map(function (p) {
        return Store.getProject(p.id).then(function (full) {
          return Promise.all((full.files || []).map(function (f) {
            return Store.readFile(p.id, f.name).then(function (c) { return { name: f.name, content: c }; });
          })).then(function (files) {
            return { name: full.name, description: full.description, created: full.created, files: files };
          });
        });
      }));
    }).then(function (data) {
      KB.downloadText(JSON.stringify({ app: "kodbox", v: 1, exported: new Date().toISOString(), projects: data }, null, 2),
        "kodbox-kopia.json");
      toast("Zapisano kopię wszystkich projektów", "ok");
    }).catch(function (e) { toast(e.message, "bad"); });
  }

  function importBackup(file) {
    file.text().then(function (text) {
      var data = JSON.parse(text);
      var projects = data.projects || [];
      if (!projects.length) throw new Error("Plik nie zawiera projektów.");
      return projects.reduce(function (chain, p) {
        return chain.then(function () {
          return Store.createProject(p.name || "Projekt", p.description || "").then(function (created) {
            return (p.files || []).reduce(function (c2, f) {
              return c2.then(function () { return Store.writeFile(created.id, KB.safeFileName(f.name), f.content || ""); });
            }, Promise.resolve());
          });
        });
      }, Promise.resolve()).then(function () { return projects.length; });
    }).then(function (count) {
      toast("Zaimportowano projektów: " + count, "ok");
      return refreshProjects();
    }).catch(function (e) { toast("Import nieudany: " + e.message, "bad"); });
  }

  /* =====================================================================
     Udostępnianie
     ===================================================================== */

  function shareProject() {
    if (!(state.project.files || []).length) { toast("Projekt nie ma plików do udostępnienia.", "bad"); return; }
    Store.createShare(state.project.id).then(function (res) {
      $("shareLink").textContent = res.url;
      $("shareDesc").textContent = res.inline
        ? "Link samodzielny: cała zawartość projektu jest skompresowana i zaszyta w adresie. Nic nie trafia na serwer — działa u każdego, kto ma ten link."
        : "Link obsługiwany przez serwer: odbiorca widzi listę plików i może je pobrać. Link działa, dopóki projekt istnieje na serwerze.";
      var note = $("shareNote");
      if (res.inline && res.url.length > 30000) {
        note.className = "share-note warn";
        note.textContent = "Uwaga: link ma " + res.url.length.toLocaleString("pl-PL") +
          " znaków. Część komunikatorów skraca tak długie adresy — przy większych projektach pewniejsze jest wysłanie archiwum ZIP albo uruchomienie backendu z katalogu server/.";
      } else {
        note.className = "share-note";
        note.textContent = "Długość linku: " + res.url.length.toLocaleString("pl-PL") + " znaków.";
      }
      openModal("modalShare");
      return reloadProject();
    }).catch(function (e) { toast(e.message, "bad"); });
  }

  function copyShare() {
    var text = $("shareLink").textContent;
    var done = function () { toast("Link skopiowany", "ok"); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, fallbackCopy);
    } else fallbackCopy();

    function fallbackCopy() {
      var ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); done(); } catch (e) { toast("Skopiuj link ręcznie.", "bad"); }
      ta.remove();
    }
  }

  /* =====================================================================
     Import projektu z linku udostępniania (#import=…)
     ===================================================================== */

  function handleImportHash() {
    var m = location.hash.match(/^#import=(.+)$/);
    if (!m) return Promise.resolve(false);
    history.replaceState(null, "", location.pathname + location.search);
    return KB.decodePayload(decodeURIComponent(m[1])).then(function (data) {
      return Store.createProject(data.name || "Projekt z linku", data.desc || "").then(function (project) {
        return (data.files || []).reduce(function (chain, f) {
          return chain.then(function () { return Store.writeFile(project.id, KB.safeFileName(f.n), f.c || ""); });
        }, Promise.resolve()).then(function () { return project.id; });
      });
    }).then(function (id) {
      toast("Zaimportowano udostępniony projekt", "ok");
      return refreshProjects(id).then(function () { return true; });
    }).catch(function (e) {
      toast("Nie udało się zaimportować linku: " + e.message, "bad");
      return false;
    });
  }

  /* =====================================================================
     Modale
     ===================================================================== */

  function openModal(id) { $(id).hidden = false; }
  function closeModal(id) { $(id).hidden = true; }

  document.querySelectorAll("[data-close]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var back = btn.closest(".modal-back");
      if (back) back.hidden = true;
    });
  });
  document.querySelectorAll(".modal-back").forEach(function (back) {
    back.addEventListener("mousedown", function (e) { if (e.target === back) back.hidden = true; });
  });

  /* =====================================================================
     Tryb zapisu (lokalny / serwerowy)
     ===================================================================== */

  function applyStore(store) {
    Store = store;
    var badge = $("modeBadge");
    badge.dataset.mode = store.kind;
    $("modeLabel").textContent = store.kind === "server" ? "Serwer" : "Zapis lokalny";
    $("statusStore").textContent = store.label;
    state.project = null;
    state.file = null;
    return refreshProjects();
  }

  function connectServer(base, silent) {
    base = (base || "").trim().replace(/\/$/, "");
    if (!base) { toast("Podaj adres serwera.", "bad"); return Promise.resolve(false); }
    $("chipStatus").textContent = "sprawdzam…";
    return pingServer(base).then(function (ok) {
      if (!ok) {
        $("chipStatus").className = "chip";
        $("chipStatus").textContent = "brak połączenia";
        if (!silent) toast("Nie znaleziono serwera pod adresem " + base, "bad");
        return false;
      }
      localStorage.setItem("kodbox.server", base);
      $("chipStatus").className = "chip on";
      $("chipStatus").textContent = "połączono";
      return applyStore(ServerStore(base)).then(function () {
        if (!silent) toast("Połączono z serwerem — pliki zapisują się na dysku.", "ok");
        return true;
      });
    });
  }

  function useLocal(silent) {
    localStorage.removeItem("kodbox.server");
    $("chipStatus").className = "chip";
    $("chipStatus").textContent = "tryb lokalny";
    return applyStore(LocalStore).then(function () {
      if (!silent) toast("Tryb lokalny — pliki trzymane w tej przeglądarce.", "ok");
    });
  }

  /* =====================================================================
     Zdarzenia
     ===================================================================== */

  function bind() {
    $("btnNewProject").addEventListener("click", newProjectModal);
    $("btnNewProject2").addEventListener("click", newProjectModal);
    $("btnSaveProject").addEventListener("click", saveProjectModal);
    $("projectSearch").addEventListener("input", function (e) {
      state.projectFilter = e.target.value;
      renderProjects();
    });
    $("fileSearch").addEventListener("input", function (e) {
      state.fileFilter = e.target.value;
      renderFiles();
    });

    $("btnNewFile").addEventListener("click", openFileModal);
    $("btnSaveNewFile").addEventListener("click", saveNewFile);
    $("inpFileContent").addEventListener("paste", function () { setTimeout(autoDetect, 30); });
    $("inpFileContent").addEventListener("blur", autoDetect);

    $("btnMarkdown").addEventListener("click", function () { openMarkdownModal(""); });
    $("btnMdAnalyze").addEventListener("click", analyzeMarkdown);
    $("btnMdSave").addEventListener("click", saveMarkdownFiles);
    $("btnMdClear").addEventListener("click", function () {
      $("inpMarkdown").value = "";
      $("mdResult").hidden = true;
      $("btnMdSave").disabled = true;
      mdFiles = [];
    });
    $("btnMdAll").addEventListener("click", function () { toggleAllMd(true); });
    $("btnMdNone").addEventListener("click", function () { toggleAllMd(false); });
    $("btnMdPickFile").addEventListener("click", function () { $("mdPicker").click(); });
    $("mdPicker").addEventListener("change", function (e) {
      var file = e.target.files[0];
      if (file) file.text().then(function (text) { $("inpMarkdown").value = text; analyzeMarkdown(); });
      e.target.value = "";
    });
    $("inpMarkdown").addEventListener("paste", function () { setTimeout(analyzeMarkdown, 40); });

    $("btnUpload").addEventListener("click", function () { $("filePicker").click(); });
    $("filePicker").addEventListener("change", function (e) {
      if (e.target.files.length) importFiles(e.target.files);
      e.target.value = "";
    });

    $("btnShare").addEventListener("click", shareProject);
    $("btnCopyShare").addEventListener("click", copyShare);
    $("btnOpenShare").addEventListener("click", function () {
      window.open($("shareLink").textContent, "_blank", "noopener");
    });
    $("btnZip").addEventListener("click", downloadZip);
    $("btnExportAll").addEventListener("click", exportAll);
    $("btnImportProject").addEventListener("click", function () { $("jsonPicker").click(); });
    $("jsonPicker").addEventListener("change", function (e) {
      if (e.target.files[0]) importBackup(e.target.files[0]);
      e.target.value = "";
    });

    $("btnRenameProject").addEventListener("click", function () {
      var name = prompt("Nazwa projektu:", state.project.name);
      if (!name) return;
      var desc = prompt("Opis projektu:", state.project.description || "");
      Store.updateProject(state.project.id, { name: name, description: desc || "" }).then(function () {
        return refreshProjects(state.project.id);
      }).then(function () { toast("Zaktualizowano projekt", "ok"); })
        .catch(function (e) { toast(e.message, "bad"); });
    });

    $("btnDeleteProject").addEventListener("click", function () {
      if (!confirm('Usunąć projekt "' + state.project.name + '" wraz ze wszystkimi plikami?')) return;
      Store.deleteProject(state.project.id).then(function () {
        state.project = null;
        toast("Projekt usunięty", "ok");
        return refreshProjects();
      }).then(function () { if (!state.projects.length) showEmpty(); })
        .catch(function (e) { toast(e.message, "bad"); });
    });

    $("btnSave").addEventListener("click", saveCurrent);
    $("btnCloseEditor").addEventListener("click", function () { closeEditor(false); });
    $("btnTogglePreview").addEventListener("click", togglePreview);
    $("btnRefreshPreview").addEventListener("click", refreshPreview);
    $("btnOpenTab").addEventListener("click", openInTab);
    $("btnDownloadCurrent").addEventListener("click", function () {
      if (state.file) KB.downloadText(codeEl.value, state.file);
    });
    $("btnCopyCode").addEventListener("click", function () {
      navigator.clipboard.writeText(codeEl.value).then(function () { toast("Kod skopiowany", "ok"); });
    });

    var previewTimer = null;
    codeEl.addEventListener("input", function () {
      setDirty(true);
      paintEditor();
      if (state.previewOn) {
        clearTimeout(previewTimer);
        previewTimer = setTimeout(refreshPreview, 500);
      }
    });
    codeEl.addEventListener("scroll", syncScroll);
    codeEl.addEventListener("keydown", function (e) {
      if (e.key === "Tab") {
        e.preventDefault();
        var s = codeEl.selectionStart;
        var t = codeEl.selectionEnd;
        codeEl.value = codeEl.value.slice(0, s) + "  " + codeEl.value.slice(t);
        codeEl.selectionStart = codeEl.selectionEnd = s + 2;
        setDirty(true);
        paintEditor();
      }
    });

    document.addEventListener("keydown", function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (state.file) saveCurrent();
      }
      if (e.key === "Escape") {
        document.querySelectorAll(".modal-back").forEach(function (m) { m.hidden = true; });
      }
    });

    $("btnSettings").addEventListener("click", function () {
      $("inpServer").value = Store.kind === "server" ? Store.base : (localStorage.getItem("kodbox.server") || "");
      openModal("modalSettings");
    });
    $("modeBadge").addEventListener("click", function () { $("btnSettings").click(); });
    $("btnTestServer").addEventListener("click", function () { connectServer($("inpServer").value, false); });
    $("btnUseLocal").addEventListener("click", function () { useLocal(false); });
    $("btnHelp").addEventListener("click", function () { openModal("modalHelp"); });

    // przeciąganie plików
    var dragDepth = 0;
    window.addEventListener("dragenter", function (e) {
      if (!e.dataTransfer || Array.prototype.indexOf.call(e.dataTransfer.types, "Files") < 0) return;
      dragDepth++;
      $("dropzone").hidden = false;
    });
    window.addEventListener("dragover", function (e) { e.preventDefault(); });
    window.addEventListener("dragleave", function () {
      dragDepth = Math.max(0, dragDepth - 1);
      if (!dragDepth) $("dropzone").hidden = true;
    });
    window.addEventListener("drop", function (e) {
      e.preventDefault();
      dragDepth = 0;
      $("dropzone").hidden = true;
      if (e.dataTransfer && e.dataTransfer.files.length) importFiles(e.dataTransfer.files);
    });

    window.addEventListener("beforeunload", function (e) {
      if (state.dirty) { e.preventDefault(); e.returnValue = ""; }
    });
  }

  var editingProjectId = null;

  function newProjectModal() {
    editingProjectId = null;
    $("projectModalTitle").textContent = "Nowy projekt";
    $("inpProjectName").value = "";
    $("inpProjectDesc").value = "";
    openModal("modalProject");
    setTimeout(function () { $("inpProjectName").focus(); }, 60);
  }

  function saveProjectModal() {
    var name = ($("inpProjectName").value || "").trim();
    if (!name) { toast("Podaj nazwę projektu.", "bad"); return; }
    var desc = ($("inpProjectDesc").value || "").trim();
    var op = editingProjectId
      ? Store.updateProject(editingProjectId, { name: name, description: desc })
      : Store.createProject(name, desc);
    op.then(function (project) {
      closeModal("modalProject");
      toast("Projekt zapisany", "ok");
      return refreshProjects(project.id);
    }).catch(function (e) { toast(e.message, "bad"); });
  }

  /* =====================================================================
     Start
     ===================================================================== */

  function start() {
    fillExtensions();
    bind();

    var saved = localStorage.getItem("kodbox.server");
    var candidate = saved || (/^https?:$/.test(location.protocol) ? location.origin : "");

    var boot = candidate
      ? pingServer(candidate).then(function (ok) {
          return ok ? applyStore(ServerStore(candidate.replace(/\/$/, ""))) : applyStore(LocalStore);
        })
      : applyStore(LocalStore);

    boot.then(function () {
      return handleImportHash();
    }).then(function () {
      if (Store.kind === "local" && !state.projects.length) return seedDemo();
      return null;
    }).catch(function (e) {
      toast("Błąd startu: " + e.message, "bad");
    });
  }

  /** Pierwsze uruchomienie: przykładowy projekt, żeby było co kliknąć. */
  function seedDemo() {
    if (localStorage.getItem("kodbox.seeded")) return Promise.resolve();
    localStorage.setItem("kodbox.seeded", "1");
    return Store.createProject("Przykład — wizytówka", "Projekt startowy: HTML + CSS + JS. Otwórz index.html i włącz podgląd.")
      .then(function (p) {
        var files = [
          ["index.html", '<!DOCTYPE html>\n<html lang="pl">\n<head>\n  <meta charset="UTF-8">\n  <title>Wizytówka</title>\n  <link rel="stylesheet" href="styles.css">\n</head>\n<body>\n  <main>\n    <h1>Cześć, tu KodBox</h1>\n    <p>Ten plik jest zapisany w projekcie. Kliknij <strong>Podgląd</strong>, żeby zobaczyć go na żywo.</p>\n    <button id="btn">Kliknij mnie</button>\n  </main>\n  <script src="script.js"><\/script>\n</body>\n</html>\n'],
          ["styles.css", "body {\n  margin: 0;\n  min-height: 100vh;\n  display: grid;\n  place-items: center;\n  font-family: system-ui, sans-serif;\n  background: linear-gradient(135deg, #6c63ff, #b06cff);\n  color: #fff;\n}\nmain { text-align: center; padding: 32px; }\nbutton {\n  margin-top: 18px;\n  padding: 12px 22px;\n  border: 0;\n  border-radius: 10px;\n  background: #fff;\n  color: #4b45c6;\n  font-weight: 700;\n  cursor: pointer;\n}\n"],
          ["script.js", 'document.getElementById("btn").addEventListener("click", function () {\n  alert("Podgląd działa — skrypty z projektu są wstawiane automatycznie.");\n});\n'],
          ["README.md", "# Przykładowy projekt\n\n- Wklej własny kod przyciskiem **Wklej kod / nowy plik**.\n- Pobierz projekt jako **ZIP** albo wygeneruj **link do udostępnienia**.\n- Chcesz zapisywać pliki na dysku serwera? Uruchom backend z katalogu `server/`.\n"]
        ];
        return files.reduce(function (chain, f) {
          return chain.then(function () { return Store.writeFile(p.id, f[0], f[1]); });
        }, Promise.resolve()).then(function () { return refreshProjects(p.id); });
      });
  }

  start();
})();
