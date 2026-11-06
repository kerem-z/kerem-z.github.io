/* Teaser: a scrolling number wall from local JSON, and a bar that grows once. */
(function () {
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function wall(el) {
    fetch("data/wall.json")
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function (data) {
        var rows = data.rows.map(function (row) {
          var cells = row.values.map(function (v, i) {
            return row.marks.indexOf(i) >= 0 ? "<mark>" + v + "</mark>" : v;
          }).join(" ");
          return '<div class="tz-row"><span class="tz-rl">' + row.name + "</span> " + cells + "</div>";
        }).join("");
        el.innerHTML = '<div class="tz-scroll">' + rows + rows + "</div>";
      })
      .catch(function () {
        el.textContent = "The number list did not load. Open this page from a local server.";
      });
  }

  function grow(el) {
    var from = +el.dataset.from;
    var to = +el.dataset.to;
    var max = +el.dataset.max;
    var bar = el.querySelector(".tz-bar-after");
    var num = bar.querySelector(".tz-v");
    var out = document.querySelector("[data-teaser-score]");
    if (reduced) {
      bar.style.height = (to / max) * 100 + "%";
      num.textContent = to.toFixed(1);
      if (out) out.textContent = to.toFixed(1);
      return;
    }
    var t0 = Date.now();
    var step = function () {
      var k = Math.min(1, (Date.now() - t0) / 1400);
      var e = 1 - Math.pow(1 - k, 3);
      var v = from + (to - from) * e;
      bar.style.height = (v / max) * 100 + "%";
      num.textContent = v.toFixed(1);
      if (out) out.textContent = v.toFixed(1);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".tz-wall").forEach(wall);
    if (reduced) {
      document.querySelectorAll(".tz-scene svg").forEach(function (svg) {
        svg.pauseAnimations();
        svg.setCurrentTime(3.4);
      });
    }
    var bars = document.querySelector(".tz-bars");
    if (!bars) return;
    var after = bars.querySelector(".tz-bar-after");
    after.style.height = (+bars.dataset.from / +bars.dataset.max) * 100 + "%";
    after.querySelector(".tz-v").textContent = (+bars.dataset.from).toFixed(1);
    if (reduced) {
      grow(bars);
      return;
    }
    if (!("IntersectionObserver" in window)) {
      grow(bars);
      return;
    }
    var seen = false;
    var obs = new IntersectionObserver(function (entries) {
      if (seen || !entries[0].isIntersecting) return;
      seen = true;
      obs.disconnect();
      grow(bars);
    }, { threshold: 0.4 });
    obs.observe(bars);
  });
})();
