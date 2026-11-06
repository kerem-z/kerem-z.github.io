(function () {
  var facts = [
    "Light near 650 nanometers is called red in her books.",
    "L cones in the retina respond strongly to that band.",
    "A ripe tomato reflects more of that band than a leaf does.",
    "People use the word “red” for tomatoes, blood, and some sunsets.",
    "She can predict which chip a normal viewer will call red."
  ];
  var root = document.querySelector("[data-mary]");
  var list = root.querySelector("[data-facts]");
  var art = root.querySelector("[data-room-art]");
  var open = false;

  function roomSvg() {
    var disc = open
      ? '<circle cx="250" cy="78" r="26" fill="#c6453a"/>'
      : '<circle cx="250" cy="78" r="26" fill="#d9d4cb" stroke="#1a1a17"/>';
    return '<svg viewBox="0 0 320 150" role="img" aria-label="A small room and a disc outside it.">' +
      '<rect x="16" y="16" width="140" height="112" fill="#f7f4ee" stroke="#1a1a17" stroke-width="1.5"/>' +
      '<rect x="36" y="36" width="64" height="40" fill="#ece8df" stroke="#1a1a17"/>' +
      '<path d="M156 78h48" stroke="#1a1a17" stroke-dasharray="4 3"/>' +
      disc +
      "</svg>";
  }

  function paint() {
    var items = facts.map(function (line) {
      return "<li>" + line + "</li>";
    });
    if (open) {
      items.push('<li style="color:#9a2e28"><b>New.</b> What it is like to see red.</li>');
    }
    list.innerHTML = items.join("");
    art.innerHTML = roomSvg();
  }

  root.querySelector("[data-open]").addEventListener("click", function (event) {
    open = !open;
    event.currentTarget.setAttribute("aria-pressed", open ? "true" : "false");
    event.currentTarget.textContent = open ? "Close the door" : "Open the door";
    paint();
  });

  paint();

  var reply = document.querySelector("[data-reply]");
  var note = reply.querySelector("[data-reply-note]");
  var gloss = {
    fact: "Jackson’s reading: the new line is a fact. It was not in the physical notes. So a complete physical description of the world still leaves something out. The something is what philosophers call a quale, the what-it-is-like of an experience.",
    skill: "The ability reading: the new line is a know-how. Mary can now recognize red, picture it, and remember it. She already had the facts. What she lacked was a skill the books could not train. On this reading the physical list can stay complete."
  };
  note.textContent = gloss.fact;
  reply.addEventListener("click", function (event) {
    var button = event.target.closest("[data-read]");
    if (!button) return;
    reply.querySelectorAll("[data-read]").forEach(function (el) {
      el.setAttribute("aria-pressed", el === button ? "true" : "false");
    });
    note.textContent = gloss[button.dataset.read];
  });
})();
