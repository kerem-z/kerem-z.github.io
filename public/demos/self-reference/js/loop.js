(function () {
  var liar = document.querySelector("[data-liar]");
  var liarNote = liar.querySelector("[data-liar-note]");
  var liarText = {
    true: "If the sentence is true, then what it says holds. What it says is that it is false. So the choice “true” flips to false.",
    false: "If the sentence is false, then what it says does not hold. What it says is that it is false. So the choice “false” flips to true."
  };
  liar.addEventListener("click", function (event) {
    var button = event.target.closest("[data-value]");
    if (!button) return;
    liar.querySelectorAll("[data-value]").forEach(function (el) {
      el.setAttribute("aria-pressed", el === button ? "true" : "false");
    });
    liarNote.textContent = liarText[button.dataset.value];
  });

  var svg = document.querySelector("[data-loop] svg");
  svg.innerHTML = [
    '<rect x="28" y="58" width="88" height="48" fill="#fff" stroke="#1a1a17" stroke-width="1.5"/>',
    '<text x="72" y="86" text-anchor="middle" font-family="Source Sans 3, sans-serif" font-size="14" fill="#1a1a17">left</text>',
    '<rect x="224" y="58" width="88" height="48" fill="#fff" stroke="#1a1a17" stroke-width="1.5"/>',
    '<text x="268" y="86" text-anchor="middle" font-family="Source Sans 3, sans-serif" font-size="14" fill="#1a1a17">right</text>',
    '<path d="M116 70 C170 18 170 18 224 70" fill="none" stroke="#118659" stroke-width="1.6"/>',
    '<path d="M210 64 L224 70 L214 82" fill="none" stroke="#118659" stroke-width="1.6"/>',
    '<path d="M224 100 C170 156 170 156 116 100" fill="none" stroke="#118659" stroke-width="1.6"/>',
    '<path d="M130 112 L116 100 L128 88" fill="none" stroke="#118659" stroke-width="1.6"/>'
  ].join("");
  document.querySelector("[data-loop-note]").textContent = "Start at the left box. The upper arrow says the left box is what draws the right one. The lower arrow says the right box is what draws the left one. There is no first mark.";

  var template = "var template = %;\nfunction show() {\n  return template.replace(\"%\", JSON.stringify(template));\n}\nshow();";

  function fill(source) {
    return source.replace("%", JSON.stringify(source));
  }

  var quine = document.querySelector("[data-quine]");
  var programOut = quine.querySelector("[data-program]");
  var outputOut = quine.querySelector("[data-output]");
  programOut.textContent = "Template, with a hole:\n" + template;
  outputOut.textContent = "The hole is still empty. The printed text is not ready.";
  quine.querySelector("[data-run]").addEventListener("click", function () {
    var program = fill(template);
    var printed = fill(template);
    programOut.textContent = "Program:\n" + program;
    outputOut.textContent = printed === program
      ? "What it prints:\n" + printed + "\n\nThe two blocks are the same text."
      : "The two blocks differ. That would mean the fill failed.";
  });
})();
