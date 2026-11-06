/* Expand a figure, paint the hover grid, copy the demo citation. */
(function () {
  var BIB = [
    "@misc{zengin2026mocknotebook,",
    "  title        = {A Toy Network, a Stuck Puck, and a Score That Is Not Real},",
    "  author       = {Zengin, Kerem},",
    "  year         = {2026},",
    "  month        = nov,",
    "  howpublished = {\\url{https://kerem-z.github.io/blog/interactive-note/}},",
    "  note         = {Design mock. Numbers and pictures are invented.}"
  ].join("\n");

  var painted = { "1-2": 1, "1-3": 1, "2-1": 1, "2-4": 1, "3-2": 1, "3-5": 1, "0-4": 1, "3-0": 1 };

  function closeOpen() {
    document.querySelectorAll("figure.is-expanded").forEach(function (fig) {
      fig.classList.remove("is-expanded");
      var btn = fig.querySelector("[data-expand]");
      if (btn) btn.textContent = "Expand";
    });
    document.body.style.overflow = "";
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("[data-expand]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var fig = btn.closest("figure");
        var open = fig.classList.contains("is-expanded");
        closeOpen();
        if (!open) {
          fig.classList.add("is-expanded");
          btn.textContent = "Close";
          document.body.style.overflow = "hidden";
        }
      });
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeOpen();
    });

    var cells = document.querySelector("[data-cells]");
    var readout = document.querySelector("[data-cell-readout]");
    if (cells) {
      var r, c, b;
      for (r = 0; r < 4; r++) {
        for (c = 0; c < 6; c++) {
          b = document.createElement("button");
          b.type = "button";
          b.dataset.r = String(r);
          b.dataset.c = String(c);
          if (painted[r + "-" + c]) b.classList.add("on");
          b.setAttribute("aria-label", "Row " + r + ", column " + c);
          cells.appendChild(b);
        }
      }
      function readCell(t) {
        if (!t) return;
        var mark = t.classList.contains("on") ? "painted by the script" : "left empty";
        readout.textContent = "row " + t.dataset.r + ", column " + t.dataset.c + " — " + mark;
      }
      cells.addEventListener("pointerover", function (e) { readCell(e.target.closest("button")); });
      cells.addEventListener("focusin", function (e) { readCell(e.target.closest("button")); });
      cells.addEventListener("click", function (e) { readCell(e.target.closest("button")); });
    }

    var copyBtn = document.querySelector("[data-copy-bib]");
    var status = document.querySelector("[data-copy-status]");
    var pre = document.querySelector("[data-bib]");
    if (pre) pre.textContent = BIB;
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        function done(ok) {
          if (status) status.textContent = ok ? "Copied." : "Select the text and copy it.";
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(BIB).then(function () { done(true); }, function () { done(false); });
        } else done(false);
      });
    }
    var dl = document.querySelector("[data-download-bib]");
    if (dl) {
      dl.addEventListener("click", function () {
        var blob = new Blob([BIB + "\n"], { type: "text/plain" });
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "mock-notebook.bib";
        a.click();
        URL.revokeObjectURL(a.href);
      });
    }
  });
})();
