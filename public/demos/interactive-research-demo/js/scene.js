/* A puck, a block, and two scripted paths. Play runs the path once. */
(function () {
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function point(mode, t) {
    if (mode === "stuck") {
      var u = Math.min(1, t / 0.72);
      var e = 1 - Math.pow(1 - u, 3);
      return { x: 0.12 + (0.46 - 0.12) * e, y: 0.5 };
    }
    var legs = [
      { t: 0.28, a: [0.12, 0.5], b: [0.12, 0.22] },
      { t: 0.62, a: [0.12, 0.22], b: [0.78, 0.22] },
      { t: 0.82, a: [0.78, 0.22], b: [0.78, 0.5] },
      { t: 1, a: [0.78, 0.5], b: [0.88, 0.5] }
    ];
    var prev = 0;
    for (var i = 0; i < legs.length; i++) {
      if (t <= legs[i].t) {
        var span = legs[i].t - prev;
        var k = span === 0 ? 1 : (t - prev) / span;
        return {
          x: legs[i].a[0] + (legs[i].b[0] - legs[i].a[0]) * k,
          y: legs[i].a[1] + (legs[i].b[1] - legs[i].a[1]) * k
        };
      }
      prev = legs[i].t;
    }
    return { x: 0.88, y: 0.5 };
  }

  function draw(canvas, mode, t) {
    var cssW = canvas.clientWidth || 640;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.round(cssW * dpr);
    var h = Math.round(cssW * 0.42 * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    var ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var W = cssW;
    var H = cssW * 0.42;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);

    function X(x) { return x * W; }
    function Y(y) { return y * H; }

    ctx.strokeStyle = "#e1e4e8";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(X(0.08), Y(0.5));
    ctx.lineTo(X(0.92), Y(0.5));
    ctx.stroke();

    ctx.fillStyle = "#d5d8de";
    ctx.fillRect(X(0.5), Y(0.36), X(0.12), Y(0.28));

    ctx.strokeStyle = mode === "stuck" ? "#8b929b" : "#8fc8a9";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    if (mode === "stuck") {
      ctx.moveTo(X(0.12), Y(0.5));
      ctx.lineTo(X(0.46), Y(0.5));
    } else {
      ctx.moveTo(X(0.12), Y(0.5));
      ctx.lineTo(X(0.12), Y(0.22));
      ctx.lineTo(X(0.78), Y(0.22));
      ctx.lineTo(X(0.78), Y(0.5));
      ctx.lineTo(X(0.88), Y(0.5));
    }
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "#118659";
    ctx.beginPath();
    ctx.arc(X(0.88), Y(0.5), 5, 0, Math.PI * 2);
    ctx.fill();

    var p = point(mode, t);
    ctx.fillStyle = mode === "stuck" ? "#3d4450" : "#118659";
    ctx.beginPath();
    ctx.arc(X(p.x), Y(p.y), 7, 0, Math.PI * 2);
    ctx.fill();
    return p;
  }

  document.addEventListener("DOMContentLoaded", function () {
    var root = document.querySelector("[data-scene]");
    if (!root) return;
    var canvas = root.querySelector("canvas");
    var mode = "stuck";
    var t = reduced ? 1 : 0;
    var playing = false;
    var started = 0;
    var status = root.querySelector("[data-scene-status]");

    function label(p) {
      var where = mode === "stuck" ? "stops at the block" : "walks around the block";
      status.textContent = mode + " · " + where + " · x " + p.x.toFixed(2) + ", y " + p.y.toFixed(2);
    }

    function frame(now) {
      if (!playing) return;
      t = Math.min(1, (now - started) / 2400);
      label(draw(canvas, mode, t));
      if (t < 1) requestAnimationFrame(frame);
      else playing = false;
    }

    function show() {
      label(draw(canvas, mode, t));
    }

    root.querySelectorAll(".switch button[data-mode]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        mode = btn.dataset.mode;
        t = reduced ? 1 : 0;
        playing = false;
        root.querySelectorAll(".switch button").forEach(function (b) {
          b.setAttribute("aria-pressed", b === btn ? "true" : "false");
        });
        show();
      });
    });

    root.querySelector("[data-play]").addEventListener("click", function () {
      if (reduced) {
        t = 1;
        show();
        return;
      }
      t = 0;
      playing = true;
      started = performance.now();
      requestAnimationFrame(frame);
    });

    root.querySelector("[data-download-png]").addEventListener("click", function () {
      show();
      var a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = "mock-puck-" + mode + ".png";
      a.click();
    });

    show();
    window.addEventListener("resize", show);
  });
})();
