/* Three pictures drawn from formulas. The button only picks which formula. */
(function () {
  var N = 12;
  var copy = {
    ring: "Ring. Larger values sit on a circle around the middle. The script draws that circle. It does not read a network.",
    steps: "Steps. The lower triangle is light and the upper triangle is dark. The split is the line where the column index passes the row index.",
    cross: "Cross. A vertical band and a horizontal band cross in the middle. Both bands are the same formula."
  };

  function value(kind, i, j) {
    var x = j - 5.5;
    var y = i - 5.5;
    if (kind === "ring") {
      var d = Math.hypot(x, y);
      return Math.exp(-Math.pow(d - 3.7, 2) / 0.85);
    }
    if (kind === "steps") return j > i ? 0.92 : 0.12;
    var band = Math.min(Math.abs(x), Math.abs(y));
    return Math.exp(-(band * band) / 1.15);
  }

  function color(t) {
    var u = t < 0 ? 0 : t > 1 ? 1 : t;
    var r = Math.round(247 + (17 - 247) * u);
    var g = Math.round(249 + (134 - 249) * u);
    var b = Math.round(245 + (89 - 245) * u);
    return "rgb(" + r + "," + g + "," + b + ")";
  }

  function paint(canvas, kind) {
    var css = canvas.clientWidth || 320;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var size = Math.round(css * dpr);
    if (canvas.width !== size) {
      canvas.width = size;
      canvas.height = size;
    }
    var ctx = canvas.getContext("2d");
    var cell = size / N;
    var i, j, v;
    ctx.clearRect(0, 0, size, size);
    for (i = 0; i < N; i++) {
      for (j = 0; j < N; j++) {
        v = value(kind, i, j);
        ctx.fillStyle = color(v);
        ctx.fillRect(j * cell + 1, i * cell + 1, cell - 2, cell - 2);
      }
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    var root = document.querySelector("[data-patterns]");
    if (!root) return;
    var canvas = root.querySelector("canvas");
    var note = root.querySelector("[data-pattern-note]");
    var kind = "ring";

    function draw() {
      paint(canvas, kind);
      note.textContent = copy[kind];
    }

    root.querySelectorAll(".switch button").forEach(function (btn) {
      btn.addEventListener("click", function () {
        kind = btn.dataset.pattern;
        root.querySelectorAll(".switch button").forEach(function (b) {
          b.setAttribute("aria-pressed", b === btn ? "true" : "false");
        });
        draw();
      });
    });

    var png = root.querySelector("[data-download-png]");
    if (png) {
      png.addEventListener("click", function () {
        draw();
        var a = document.createElement("a");
        a.href = canvas.toDataURL("image/png");
        a.download = "mock-pattern-" + kind + ".png";
        a.click();
      });
    }

    draw();
    window.addEventListener("resize", draw);
  });
})();
