(function () {
  var slips = [
    { id: "door", inn: "○ □", out: "△", ask: "Is the door shut?", answer: "Yes." },
    { id: "sky", inn: "□ △", out: "○", ask: "What is the sky like?", answer: "Clear." },
    { id: "name", inn: "△ ○", out: "□", ask: "What is your name?", answer: "I am in the room." }
  ];
  var shapes = ["○", "□", "△"];
  var current = "door";

  var root = document.querySelector("[data-room]");
  var slipRow = root.querySelector("[data-slips]");
  var replies = root.querySelector("[data-replies]");
  var rules = root.querySelector("[data-rule-list]");
  var inside = root.querySelector("[data-inside]");
  var outside = root.querySelector("[data-outside]");

  slips.forEach(function (slip, i) {
    var button = document.createElement("button");
    button.type = "button";
    button.dataset.slip = slip.id;
    button.textContent = slip.inn;
    button.setAttribute("aria-pressed", i === 0 ? "true" : "false");
    slipRow.appendChild(button);
  });

  shapes.forEach(function (shape) {
    var button = document.createElement("button");
    button.type = "button";
    button.dataset.reply = shape;
    button.textContent = "Hand back " + shape;
    replies.appendChild(button);
  });

  function paint() {
    var slip = slips.filter(function (s) { return s.id === current; })[0];
    rules.innerHTML = slips.map(function (s) {
      var mark = s.id === current ? "<b>" : "";
      var end = s.id === current ? "</b>" : "";
      return "<div>" + mark + s.inn + " → " + s.out + end + "</div>";
    }).join("");
    inside.textContent = "The slip shows " + slip.inn + ". The book says the reply is " + slip.out + ". You do not need the English.";
    outside.hidden = true;
    outside.textContent = "";
  }

  slipRow.addEventListener("click", function (event) {
    var button = event.target.closest("[data-slip]");
    if (!button) return;
    current = button.dataset.slip;
    slipRow.querySelectorAll("[data-slip]").forEach(function (el) {
      el.setAttribute("aria-pressed", el === button ? "true" : "false");
    });
    paint();
  });

  replies.addEventListener("click", function (event) {
    var button = event.target.closest("[data-reply]");
    if (!button) return;
    var slip = slips.filter(function (s) { return s.id === current; })[0];
    if (button.dataset.reply !== slip.out) {
      inside.textContent = "The book does not say " + button.dataset.reply + ". It says " + slip.out + ".";
      outside.hidden = true;
      return;
    }
    inside.textContent = "You copied " + slip.out + " and pushed it back under the door.";
    outside.hidden = false;
    outside.innerHTML = "<b>From the hallway.</b> The question was “" + slip.ask + "” The reply reads “" + slip.answer + "” You never used either sentence.";
  });

  paint();

  var notes = {
    person: "If understanding has to be something the person can report, this person has nothing to report. They matched shapes. Searle treats a computer program the same way: the steps can be right and the meanings can still be absent.",
    room: "The systems reply says you asked the wrong part. The person is a piece of the system, the way a single neuron is a piece of a brain. On this view the room as a whole might understand even though the person does not. The demo still only shows the book being followed.",
    robot: "The robot reply sends the same rule book out into a body that can bump into doors and see skies. Then a shape might be tied to something outside the paper. That is the symbol-grounding worry in another costume. This room has no body."
  };

  var who = document.querySelector("[data-who]");
  var whoNote = who.querySelector("[data-who-note]");
  whoNote.textContent = notes.person;
  who.addEventListener("click", function (event) {
    var button = event.target.closest("button[data-who]");
    if (!button) return;
    who.querySelectorAll("[data-who]").forEach(function (el) {
      el.setAttribute("aria-pressed", el === button ? "true" : "false");
    });
    whoNote.textContent = notes[button.dataset.who];
  });
})();
