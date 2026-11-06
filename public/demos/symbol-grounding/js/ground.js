/* Two small demos: a word that only names other words, and a circle you can open. */
(function () {
  var chain = [
    { id: "apple", word: "apple", next: "a kind of fruit", ground: "apple" },
    { id: "fruit", word: "fruit", next: "food from a plant", ground: null },
    { id: "food", word: "food", next: "what you eat", ground: null },
    { id: "eat", word: "eat", next: "what an apple is for", ground: null }
  ];

  function appleSvg() {
    return '<svg viewBox="0 0 80 90" aria-hidden="true"><path fill="#c6453a" d="M40 28c8-10 22-8 24 2 6 2 12 10 10 22-3 18-14 30-24 30S26 70 22 52C18 36 26 26 40 28z"/><path fill="none" stroke="#3d6b3a" stroke-width="2" d="M40 28c2-10 10-16 16-16"/><path fill="#3d6b3a" d="M46 16c6 2 10 8 8 14-6-2-10-8-8-14z"/></svg>';
  }

  function paintReadout(root) {
    var mode = root.querySelector("[data-mode][aria-pressed='true']").dataset.mode;
    var id = root.querySelector("[data-word][aria-pressed='true']").dataset.word;
    var item = chain.filter(function (x) { return x.id === id; })[0];
    var words = root.querySelector("[data-words-out]");
    var pic = root.querySelector("[data-pic]");
    words.textContent = item.word + " → " + item.next;
    if (mode === "ground" && item.ground === "apple") {
      pic.innerHTML = appleSvg() + "<p>The word also sits next to an apple you can see.</p>";
    } else if (mode === "ground") {
      pic.innerHTML = "<p>This one is still only a word. The apple is the link that leaves the list.</p>";
    } else {
      pic.innerHTML = "<p>No picture. The next line is another word, and the words come back around.</p>";
    }
  }

  function drawCycle(svg, open) {
    var nodes = [
      { id: "apple", x: 160, y: 36, label: "apple" },
      { id: "fruit", x: 300, y: 110, label: "fruit" },
      { id: "food", x: 160, y: 184, label: "food" },
      { id: "plant", x: 20, y: 110, label: "plant" }
    ];
    var edges = [[0, 1], [1, 2], [2, 3], [3, 0]];
    var lines = edges.map(function (e) {
      var a = nodes[e[0]];
      var b = nodes[e[1]];
      return '<line x1="' + a.x + '" y1="' + a.y + '" x2="' + b.x + '" y2="' + b.y + '" stroke="#c9ced6" stroke-width="1.5" marker-end="url(#arrow)"/>';
    }).join("");
    var circles = nodes.map(function (n) {
      var on = open && n.id === "apple";
      return '<g><circle cx="' + n.x + '" cy="' + n.y + '" r="22" fill="' + (on ? "#dbece2" : "#fff") + '" stroke="' + (on ? "#2e996a" : "#c9ced6") + '"/><text x="' + n.x + '" y="' + (n.y + 4) + '" text-anchor="middle" font-size="12" font-family="Source Sans 3, sans-serif" fill="#222">' + n.label + "</text></g>";
    }).join("");
    var drop = open
      ? '<path d="M160 58 C160 100 70 100 70 130" fill="none" stroke="#118659" stroke-width="1.5" stroke-dasharray="4 3"/><circle cx="70" cy="148" r="16" fill="#c6453a"/><path d="M70 134c2-6 8-8 8-2" fill="none" stroke="#3d6b3a" stroke-width="2"/>'
      : "";
    svg.innerHTML =
      '<defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6 Z" fill="#c9ced6"/></marker></defs>' +
      lines + circles + drop;
  }

  document.addEventListener("DOMContentLoaded", function () {
    var lex = document.querySelector("[data-lex]");
    if (lex) {
      var words = lex.querySelector("[data-word-row]");
      chain.forEach(function (item, i) {
        var b = document.createElement("button");
        b.type = "button";
        b.dataset.word = item.id;
        b.textContent = item.word;
        b.setAttribute("aria-pressed", i === 0 ? "true" : "false");
        words.appendChild(b);
      });
      lex.addEventListener("click", function (e) {
        var btn = e.target.closest("button");
        if (!btn) return;
        var group = btn.dataset.mode ? "[data-mode]" : "[data-word]";
        lex.querySelectorAll(group).forEach(function (b) {
          b.setAttribute("aria-pressed", b === btn ? "true" : "false");
        });
        paintReadout(lex);
      });
      paintReadout(lex);
    }

    var cycle = document.querySelector("[data-cycle]");
    if (!cycle) return;
    var svg = cycle.querySelector("svg");
    var note = cycle.querySelector("[data-cycle-note]");
    var open = false;
    function show() {
      drawCycle(svg, open);
      note.textContent = open
        ? "The apple word still leads to fruit, and the circle of words is still there. One dashed line also leaves it."
        : "Four words, and each one only names the next. Nothing in the circle is an apple you could pick up.";
    }
    cycle.querySelector("[data-ground]").addEventListener("click", function (e) {
      open = !open;
      e.currentTarget.textContent = open ? "Lift the ground" : "Ground the apple";
      e.currentTarget.setAttribute("aria-pressed", open ? "true" : "false");
      show();
    });
    show();
  });
})();
