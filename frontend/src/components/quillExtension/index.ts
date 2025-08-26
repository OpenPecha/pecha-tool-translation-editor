import Quill from "quill";

import CommentBlot from "./commentBlot";
import CustomParagraph from "./customPtag";
import HeaderNBlot from "./headerDynamicBlot";
import { MAX_HEADING_LEVEL } from "@/utils/editorConfig";
import { CustomFootnoteModule, CollapsibleFootnoteSection } from "./CustomFootnote";
import {
  BoldIcon,
  ItalicIcon,
  RedoIcon,
  underlineIcon,
  UndoIcon,
  FootnoteIcon
} from "../Toolbar/ToolbarIcons";

const customHeaders: any[] = [];
export default function quill_import() {
  // Quill.register("modules/cursors", QuillCursors);
  const fonts = Quill.import("attributors/style/font");
  const Block = Quill.import("blots/block");
  Block.tagName = "p";
  fonts.whitelist = ["initial", "sans-serif", "serif", "monospace", "monlam"];
  Quill.register("modules/counter", function (quill: any, options: any) {
    const container = document.querySelector(options.container);
    if (container)
      quill.on("text-change", function () {
        const text = quill.getText();
        if (options.unit === "word") {
          container.innerText = text.split(/\s+/).length + " words";
        } else {
          container.innerText = text?.length;
        }
      });
  });
  Quill.register(fonts, true);
  Quill.register(Block, true);
  Quill.register(CustomParagraph);
  Quill.register(CommentBlot);
  Quill.register("modules/footnote", CustomFootnoteModule);
  Quill.register(CollapsibleFootnoteSection, true);
  const icons:any = Quill.import("ui/icons");
  icons.bold = BoldIcon();
  icons.italic = ItalicIcon();
  icons.underline = underlineIcon();
  icons.footnote = FootnoteIcon();
  icons.undo = UndoIcon();
  icons.redo = RedoIcon();
  // Generate and register custom header blots
  for (let i = 1; i <= MAX_HEADING_LEVEL; i++) {
    const CustomHeader = HeaderNBlot(i);
    Quill.register(CustomHeader);
    customHeaders.push(CustomHeader);
  }
}
