(function () {
  var cases = {
    sparse: {
      marks: { "2-1": 1, "3-1": 1, "3-5": 1 },
      note: "Sparse paints three cells: (2, 1), (3, 1), and (3, 5). The other twenty-one stay empty."
    },
    single: {
      marks: { "3-3": 1 },
      note: "Single paints one cell: row 3, column 3."
    },
    other: {
      marks: { "3-1": 1 },
      note: "Other paints one cell: row 3, column 1."
    }
  };

  var root = document.querySelector("[data-cases]");
  var grid = root.querySelector("[data-case-grid]");
  var note = root.querySelector("[data-case-note]");
  var buttons = [];
  var r, c, cell;
  for (r = 0; r < 4; r++) {
    for (c = 0; c < 6; c++) {
      cell = document.createElement("span");
      cell.dataset.r = String(r);
      cell.dataset.c = String(c);
      grid.appendChild(cell);
      buttons.push(cell);
    }
  }

  function paint(id) {
    var marks = cases[id].marks;
    buttons.forEach(function (el) {
      var on = marks[el.dataset.r + "-" + el.dataset.c];
      el.classList.toggle("on", !!on);
    });
    note.textContent = cases[id].note;
  }

  root.addEventListener("click", function (event) {
    var button = event.target.closest("button[data-case]");
    if (!button) return;
    root.querySelectorAll("button[data-case]").forEach(function (el) {
      el.setAttribute("aria-pressed", el === button ? "true" : "false");
    });
    paint(button.dataset.case);
  });
  paint("sparse");

  var looks = {
    question: { q: 86, g: 9, note: "Question puts 86 on the left bar and 9 on the right." },
    guess: { q: 12, g: 81, note: "Guess puts 12 on the left bar and 81 on the right." }
  };
  var look = document.querySelector("[data-look]");
  var qBar = look.querySelector(".look-q");
  var gBar = look.querySelector(".look-g");
  var qNum = look.querySelector("[data-look-q]");
  var gNum = look.querySelector("[data-look-g]");
  var lookNote = look.querySelector("[data-look-note]");

  function showLook(id) {
    var row = looks[id];
    qBar.style.height = row.q + "%";
    gBar.style.height = row.g + "%";
    qNum.textContent = String(row.q);
    gNum.textContent = String(row.g);
    lookNote.textContent = row.note;
  }

  look.addEventListener("click", function (event) {
    var button = event.target.closest("button[data-look]");
    if (!button) return;
    look.querySelectorAll("button[data-look]").forEach(function (el) {
      el.setAttribute("aria-pressed", el === button ? "true" : "false");
    });
    showLook(button.dataset.look);
  });
  showLook("question");
})();
