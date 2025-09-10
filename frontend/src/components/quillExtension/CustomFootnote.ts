import { FootnoteModule, FootnoteSection } from "quill-footnote";
import Quill from "quill";

// Extended FootnoteSection (collapsible)
class CollapsibleFootnoteSection extends FootnoteSection {
  constructor(scroll: any, domNode: HTMLElement, value: any) {
    super(scroll, domNode, value);

    domNode.classList.add("collapsed")
    if (!domNode.querySelector(".footnote-toggle")) {
      
      const header = document.createElement("div");
      header.className = "footnote-toggle bg-neutral-100 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-neutral-600";
      header.innerText = "Footnotes";
      header.style.cursor = "pointer";
      header.setAttribute("contenteditable", "false"); // Make header not editable

      // Handler to toggle collapse
      const toggleCollapse = (e?: Event) => {
        domNode.classList.toggle("collapsed");
        header.innerText = domNode.classList.contains("collapsed")
          ? "Footnotes"
          : "Footnotes";
        if (e) e.stopPropagation();
      };

      header.addEventListener("click", toggleCollapse);

      // Handler to close if click outside
      const handleClickOutside = (event: MouseEvent) => {
        if (!domNode.contains(event.target as Node)) {
          if (!domNode.classList.contains("collapsed")) {
            domNode.classList.add("collapsed");
            header.innerText = "Footnotes";
          }
        }
      };

      // Attach the event listener to the document
      document.addEventListener("mousedown", handleClickOutside);

      // Clean up the event listener when the section is removed from DOM
      // (MutationObserver is used to detect removal)
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.removedNodes.forEach((removed) => {
            if (removed === domNode) {
              document.removeEventListener("mousedown", handleClickOutside);
              observer.disconnect();
            }
          });
        });
      });
      observer.observe(domNode.parentNode || document.body, { childList: true });

      domNode.insertBefore(header, domNode.firstChild);
    }
  }
}

// Extended FootnoteModule (focus new row after insertion)
class CustomFootnoteModule extends FootnoteModule {

  constructor(quill: Quill, options: any) {
    super(quill, options);
  }

  static register(): void {
    super.register();
    Quill.register(CollapsibleFootnoteSection);
  }

  addFootnote(content: string): void {
    const createdAt = Date.now(); // unique ID for this footnote
    super.addFootnote(content);
    // Open the footnote section (remove 'collapsed' class if present)
    const footnoteSection = this.quill.root.querySelector('.footnote-section');
    if (footnoteSection && footnoteSection.classList.contains('collapsed')) {
      footnoteSection.classList.remove('collapsed');
      // Also show all rows if they were hidden
      const rows = footnoteSection.querySelectorAll('.footnote-row');
      rows.forEach((row: Element) => {
        (row as HTMLElement).style.display = "";
      });
    }
    // after insertion, move cursor into new footnote row
    setTimeout(() => {
      const footnoteRow = this.quill.root.querySelector(
        `.footnote-row[data-createdAt="${createdAt}"]`
      ) as HTMLElement | null;

      if (footnoteRow) {
        const blot = Quill.find(footnoteRow);
        if (blot) {
          const index = this.quill.getIndex(blot);
          this.quill.setSelection(index, 0, Quill.sources.USER);
        }
      }
    }, 0);
  }
  deleteFootnote(footnoteNumber: any): void {
    super.deleteFootnote(footnoteNumber);
  }
}

export { CollapsibleFootnoteSection, CustomFootnoteModule };