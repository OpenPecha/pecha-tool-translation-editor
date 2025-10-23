import Quill from "quill";
import emitter from "@/services/eventBus";

const Inline = Quill.import("blots/inline");

class AnnotationBlot extends Inline {
  static blotName = "annotation";
  static tagName = "span";
  static className = "ql-annotation";

  static create(value: any) {
    const node = super.create();
    node.setAttribute("data-options", JSON.stringify(value.options));
    node.setAttribute("data-id", value.id);
    node.addEventListener("click", (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const rect = (event.target as HTMLElement).getBoundingClientRect();
      const target = event.target as HTMLElement;

      // Get the blot first
      const blot = Quill.find(target);
      if (!blot) return;

      // Get the Scroll object and then the Quill instance
      const scroll = Quill.find(target.closest(".ql-editor") as Node);
      if (!scroll || !scroll.domNode) return;

      // Get the Quill instance from the scroll's domNode
      const quill = Quill.find(scroll.domNode.parentNode as Node);

      // Get the index of the blot in the document
      const index = quill.getIndex(blot);
      const length = blot.length();
      const originalText = target.textContent || "";

      const popupData = {
        id: value.id,
        options: value.options,
        position: {
          top: rect.bottom + window.scrollY + 5,
          left: rect.left + window.scrollX,
        },
        index: index,
        length: length,
        originalText: originalText,
      };

      emitter.emit("showAnnotationPopup", popupData);
    });
    return node;
  }

  static formats(node: HTMLElement) {
    return {
      id: node.getAttribute("data-id"),
      options: JSON.parse(node.getAttribute("data-options") || "[]"),
    };
  }
}

export default AnnotationBlot;
