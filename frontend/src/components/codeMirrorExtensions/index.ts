import { Extension } from "@codemirror/state";
import {
  EditorView,
  Decoration,
  DecorationSet,
  ViewPlugin,
  ViewUpdate,
  WidgetType,
} from "@codemirror/view";
import { syntaxHighlighting, HighlightStyle } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import emitter from "@/services/eventBus";

// Comment decoration widget
class CommentWidget extends WidgetType {
  constructor(private commentId: string) {
    super();
  }

  toDOM(): HTMLElement {
    const span = document.createElement("span");
    span.className = "comments";
    span.setAttribute("data-id", this.commentId);
    span.style.backgroundColor = "#fef3c7";
    span.style.padding = "1px 2px";
    span.style.borderRadius = "2px";
    span.style.cursor = "pointer";

    span.addEventListener("click", (event) => {
      const bubbleWidth = 250;
      const bubbleHeight = 200;
      let left = event.pageX + 5;
      let top = event.pageY + 5;

      if (left + bubbleWidth > window.innerWidth) {
        left = window.innerWidth - bubbleWidth - 10;
      }
      if (top + bubbleHeight > window.innerHeight) {
        top = window.innerHeight - bubbleHeight - 10;
      }

      const data = {
        id: this.commentId,
        position: {
          top: top,
          left: left,
        },
      };
      emitter.emit("showCommentBubble", data);
    });

    return span;
  }
}

// Footnote decoration widget
class FootnoteWidget extends WidgetType {
  constructor(private footnoteId: string, private order: string) {
    super();
  }

  toDOM(): HTMLElement {
    const span = document.createElement("span");
    span.className = "footnote";
    span.setAttribute("data-id", this.footnoteId);
    span.setAttribute("data-order", this.order);
    span.style.backgroundColor = "#e0f2fe";
    span.style.padding = "1px 2px";
    span.style.borderRadius = "2px";
    span.style.cursor = "pointer";
    span.style.fontSize = "0.8em";
    span.style.verticalAlign = "super";
    span.textContent = this.order;

    span.addEventListener("click", (event) => {
      const bubbleWidth = 250;
      const bubbleHeight = 200;
      let left = event.pageX + 5;
      let top = event.pageY + 5;

      if (left + bubbleWidth > window.innerWidth) {
        left = window.innerWidth - bubbleWidth - 10;
      }
      if (top + bubbleHeight > window.innerHeight) {
        top = window.innerHeight - bubbleHeight - 10;
      }

      const data = {
        id: this.footnoteId,
        order: this.order,
        position: {
          top: top,
          left: left,
        },
      };
      emitter.emit("showfootnotebubble", data);
    });

    return span;
  }
}

// Verse decoration widget
class VerseWidget extends WidgetType {
  constructor(private verseNumber: string, private verseId: string) {
    super();
  }

  toDOM(): HTMLElement {
    const span = document.createElement("span");
    span.className = "verse-blot";
    span.setAttribute("data-verse", this.verseNumber);
    span.setAttribute("data-verse-id", this.verseId);
    span.style.fontWeight = "bold";
    span.style.color = "#4f46e5";
    span.textContent = `[${this.verseNumber}]`;
    return span;
  }
}

// Plugin to manage comment decorations
const commentPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet = Decoration.none;

    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.buildDecorations(update.view);
      }
    }

    buildDecorations(view: EditorView): DecorationSet {
      const decorations: ReturnType<typeof Decoration.replace>[] = [];
      const doc = view.state.doc;

      // Look for comment markers in the text
      // This is a simplified version - in practice you'd want to store comment positions
      const text = doc.toString();
      const commentRegex = /\[comment:(\w+)\]/g;
      let match;

      while ((match = commentRegex.exec(text)) !== null) {
        const from = match.index;
        const to = match.index + match[0].length;
        const commentId = match[1];

        decorations.push(
          Decoration.replace({
            widget: new CommentWidget(commentId),
          }).range(from, to)
        );
      }

      return Decoration.set(decorations);
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);

// Plugin to manage footnote decorations
const footnotePlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet = Decoration.none;

    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.buildDecorations(update.view);
      }
    }

    buildDecorations(view: EditorView): DecorationSet {
      const decorations: any[] = [];
      const doc = view.state.doc;

      // Look for footnote markers in the text
      const text = doc.toString();
      const footnoteRegex = /\[footnote:(\w+):(\d+)\]/g;
      let match;

      while ((match = footnoteRegex.exec(text)) !== null) {
        const from = match.index;
        const to = match.index + match[0].length;
        const footnoteId = match[1];
        const order = match[2];

        decorations.push(
          Decoration.replace({
            widget: new FootnoteWidget(footnoteId, order),
          }).range(from, to)
        );
      }

      return Decoration.set(decorations);
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);

// Plugin to manage verse decorations
const versePlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet = Decoration.none;

    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.buildDecorations(update.view);
      }
    }

    buildDecorations(view: EditorView): DecorationSet {
      const decorations: any[] = [];
      const doc = view.state.doc;

      // Look for verse markers in the text
      const text = doc.toString();
      const verseRegex = /\[verse:(\d+):(\w+)\]/g;
      let match;

      while ((match = verseRegex.exec(text)) !== null) {
        const from = match.index;
        const to = match.index + match[0].length;
        const verseNumber = match[1];
        const verseId = match[2];

        decorations.push(
          Decoration.replace({
            widget: new VerseWidget(verseNumber, verseId),
          }).range(from, to)
        );
      }

      return Decoration.set(decorations);
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);

// Header highlighting theme
const headerHighlighting = syntaxHighlighting(
  HighlightStyle.define([
    {
      tag: tags.heading1,
      fontSize: "1.8em",
      fontWeight: "bold",
      color: "#1f2937",
    },
    {
      tag: tags.heading2,
      fontSize: "1.6em",
      fontWeight: "bold",
      color: "#374151",
    },
    {
      tag: tags.heading3,
      fontSize: "1.4em",
      fontWeight: "bold",
      color: "#4b5563",
    },
    {
      tag: tags.heading4,
      fontSize: "1.2em",
      fontWeight: "bold",
      color: "#6b7280",
    },
    {
      tag: tags.heading5,
      fontSize: "1.1em",
      fontWeight: "bold",
      color: "#9ca3af",
    },
    {
      tag: tags.heading6,
      fontSize: "1em",
      fontWeight: "bold",
      color: "#d1d5db",
    },
  ])
);

// Export extension creators
export function createCommentExtension(): Extension {
  return [commentPlugin];
}

export function createFootnoteExtension(): Extension {
  return [footnotePlugin];
}

export function createHeaderExtension(): Extension {
  return [headerHighlighting];
}

export function createVerseExtension(): Extension {
  return [versePlugin];
}
