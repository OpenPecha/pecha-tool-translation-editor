import Quill from "quill";
import QuillCursors from "quill-cursors";

import SuggestionBlot from "./suggestionBlot";
import { CustomParagraph } from "./customPtag";

export default function quill_import() {
  Quill.register("modules/cursors", QuillCursors);
  const fonts = Quill.import("attributors/style/font");
  const Block = Quill.import("blots/block");
  fonts.whitelist = ["initial", "sans-serif", "serif", "monospace", "monlam"];
  Block.tagName = "p";
  Quill.register(fonts, true);
  Quill.register(Block, true);
  Quill.register("modules/counter", function (quill, options) {
    var container = document.querySelector(options.container);
    quill.on("text-change", function () {
      var text = quill.getText();
      if (options.unit === "word") {
        container.innerText = text.split(/\s+/).length + " words";
      } else {
        container.innerText = text.length + " characters";
      }
    });
  });
  Quill.register(CustomParagraph);
  Quill.register(SuggestionBlot);
}
