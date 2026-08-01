/* KodBox — strona odbiorcy udostępnionego projektu.
   Cała zawartość projektu jest zaszyta w adresie (fragment po #), nic nie idzie na serwer. */

(function () {
  "use strict";

  var KB = window.KB;
  var $ = function (id) { return document.getElementById(id); };

  var project = null;
  var current = null;
  var previewOn = false;

  function toast(msg, kind) {
    var box = document.createElement("div");
    box.className = "toast" + (kind ? " " + kind : "");
    box.textContent = msg;
    $("toasts").appendChild(box);
    setTimeout(function () { box.remove(); }, 3200);
  }

  function fileMap(exclude) {
    var map = {};
    project.files.forEach(function (f) { if (f.n !== exclude) map[f.n] = f.c; });
    return map;
  }

  function renderList() {
    var box = $("files");
    box.innerHTML = "";
    project.files.forEach(function (f) {
      var row = document.createElement("div");
      row.className = "row";
      row.innerHTML =
        '<span class="ext-chip"></span>' +
        '<span class="grow"><span class="nm"></span><div class="mt"></div></span>';
      var ext = KB.extOf(f.n) || "?";
      row.querySelector(".ext-chip").textContent = ext.slice(0, 4).toUpperCase();
      row.querySelector(".nm").textContent = f.n;
      row.querySelector(".mt").textContent = KB.fmtSize(KB.byteLength(f.c));

      var openBtn = document.createElement("button");
      openBtn.className = "btn btn-sm";
      openBtn.textContent = "Otwórz";
      openBtn.addEventListener("click", function () { openFile(f.n); });

      var dl = document.createElement("button");
      dl.className = "btn btn-sm";
      dl.textContent = "⬇️ Pobierz";
      dl.addEventListener("click", function () { KB.downloadText(f.c, f.n); });

      row.appendChild(openBtn);
      row.appendChild(dl);
      box.appendChild(row);
    });
  }

  function openFile(name) {
    current = project.files.filter(function (f) { return f.n === name; })[0];
    if (!current) return;
    $("viewer").classList.add("on");
    $("viewName").textContent = name;
    $("viewCode").textContent = current.c;
    var previewable = ["html", "xml", "svg", "md", "vue"].indexOf(KB.extOf(name)) >= 0;
    $("btnPreviewToggle").hidden = !previewable;
    previewOn = false;
    $("viewFrame").hidden = true;
    $("viewCode").hidden = false;
    $("viewer").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function previewDoc(file) {
    var ext = KB.extOf(file.n);
    if (ext === "md") {
      return '<!doctype html><meta charset="utf-8"><style>body{font:15px/1.6 system-ui;max-width:760px;margin:32px auto;padding:0 20px}' +
        "pre{background:#f4f4f8;padding:12px;border-radius:8px;overflow:auto}</style>" + KB.renderMarkdown(file.c);
    }
    if (ext === "svg") {
      return '<!doctype html><meta charset="utf-8"><style>body{margin:0;display:grid;place-items:center;height:100vh}svg{max-width:90%;max-height:90%}</style>' + file.c;
    }
    return KB.inlineHtml(file.c, fileMap(file.n));
  }

  function bind() {
    $("btnPreviewToggle").addEventListener("click", function () {
      if (!current) return;
      previewOn = !previewOn;
      $("viewFrame").hidden = !previewOn;
      $("viewCode").hidden = previewOn;
      $("btnPreviewToggle").textContent = previewOn ? "📄 Pokaż kod" : "👁️ Podgląd strony";
      if (previewOn) $("viewFrame").srcdoc = previewDoc(current);
    });

    $("btnDownloadOne").addEventListener("click", function () {
      if (current) KB.downloadText(current.c, current.n);
    });

    $("btnCopyOne").addEventListener("click", function () {
      if (!current) return;
      navigator.clipboard.writeText(current.c).then(
        function () { toast("Kod skopiowany", "ok"); },
        function () { toast("Nie udało się skopiować — zaznacz kod ręcznie.", "bad"); }
      );
    });

    $("btnZip").addEventListener("click", function () {
      if (!project || !project.files.length) return;
      var files = project.files.map(function (f) { return { name: f.n, content: f.c }; });
      KB.downloadBlob(KB.makeZip(files), KB.safeFileName(project.name || "projekt") + ".zip");
    });

    $("btnImport").addEventListener("click", function () {
      var payload = location.hash.slice(1);
      location.href = new URL("index.html", location.href).href + "#import=" + payload;
    });
  }

  function start() {
    bind();
    var payload = location.hash.slice(1);
    if (!payload) {
      $("title").textContent = "Brak danych projektu";
      $("desc").textContent = "Ten adres nie zawiera zaszytego projektu. Poproś nadawcę o pełny link (razem z częścią po znaku #).";
      $("btnZip").disabled = $("btnImport").disabled = true;
      return;
    }
    KB.decodePayload(payload).then(function (data) {
      project = { name: data.name || "Udostępniony projekt", desc: data.desc || "", files: data.files || [] };
      document.title = project.name + " — KodBox";
      $("title").textContent = project.name;
      $("desc").textContent = project.desc;
      $("notice").textContent = "Projekt zawiera " + project.files.length +
        " plików. Wszystko odczytano z linku — żadne dane nie zostały pobrane z serwera.";
      renderList();
    }).catch(function (e) {
      $("title").textContent = "Nie udało się odczytać linku";
      $("desc").textContent = "Link jest uszkodzony lub niepełny (" + e.message + ").";
      $("btnZip").disabled = $("btnImport").disabled = true;
    });
  }

  start();
})();
