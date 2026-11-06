/* The slider, the chart, and the table all use one made-up formula. */
(function () {
  function score(n) {
    return 12 + 29 * (1 - Math.exp(-n / 18));
  }

  function draw(svg, n, samples) {
    var W = 640;
    var H = 280;
    var m = { l: 44, r: 12, t: 16, b: 32 };
    var iw = W - m.l - m.r;
    var ih = H - m.t - m.b;
    function X(v) { return m.l + (v / 50) * iw; }
    function Y(v) { return m.t + (1 - (v - 10) / 34) * ih; }

    var d = "";
    var i;
    for (i = 0; i <= 50; i++) {
      d += (i === 0 ? "M" : "L") + X(i).toFixed(1) + " " + Y(score(i)).toFixed(1);
    }

    var grid = "";
    [10, 20, 30, 40].forEach(function (g) {
      grid += '<line x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + Y(g) + '" y2="' + Y(g) + '" stroke="#eceff2"/>';
      grid += '<text x="' + (m.l - 6) + '" y="' + (Y(g) + 4) + '" text-anchor="end" font-size="12" fill="#777">' + g + "</text>";
    });
    [0, 10, 25, 50].forEach(function (x) {
      grid += '<text x="' + X(x) + '" y="' + (H - 10) + '" text-anchor="middle" font-size="12" fill="#777">' + x + "</text>";
    });

    var dots = samples.map(function (s) {
      var on = Math.abs(s.n - n) < 0.6;
      return '<circle cx="' + X(s.n) + '" cy="' + Y(s.score) + '" r="' + (on ? 5 : 3.5) + '" fill="' + (on ? "#03623f" : "#118659") + '"/>';
    }).join("");

    svg.innerHTML =
      grid +
      '<path d="' + d + '" fill="none" stroke="#118659" stroke-width="2"/>' +
      '<line x1="' + X(n) + '" x2="' + X(n) + '" y1="' + m.t + '" y2="' + (m.t + ih) + '" stroke="#222" stroke-dasharray="3 3"/>' +
      '<circle cx="' + X(n) + '" cy="' + Y(score(n)) + '" r="5.5" fill="#fff" stroke="#118659" stroke-width="2"/>' +
      dots;
  }

  document.addEventListener("DOMContentLoaded", function () {
    var root = document.querySelector("[data-budget]");
    if (!root) return;
    var svg = root.querySelector("svg");
    var slider = root.querySelector("input");
    var out = root.querySelector("output");
    var table = root.querySelector("tbody");

    fetch("data/budget.json")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        data.samples.forEach(function (s) {
          var tr = document.createElement("tr");
          tr.dataset.n = String(s.n);
          tr.innerHTML = "<td>" + s.n + "</td><td>" + s.score.toFixed(2) + "</td><td>invented</td>";
          table.appendChild(tr);
        });

        function update() {
          var n = +slider.value;
          var s = score(n);
          out.textContent = "s(" + n + ") = " + s.toFixed(2);
          draw(svg, n, data.samples);
          table.querySelectorAll("tr").forEach(function (tr) {
            tr.classList.toggle("is-on", Math.abs(+tr.dataset.n - n) < 0.6);
          });
        }

        slider.addEventListener("input", update);
        update();

        root.querySelector("[data-download-svg]").addEventListener("click", function () {
          var blob = new Blob([svg.outerHTML], { type: "image/svg+xml" });
          var a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = "mock-score.svg";
          a.click();
          URL.revokeObjectURL(a.href);
        });
      })
      .catch(function () {
        out.textContent = "The sample file did not load.";
      });
  });
})();
