import Quill from "quill";

const Block = Quill.import("blots/block");

export class CustomParagraph extends Block {
  static blotName = "custom-paragraph";
  static tagName = "p";

  static create(value) {
    const node = super.create();
    if (value) {
      node.setAttribute("data-type", value);
    }
    return node;
  }

  static formats(node) {
    return node.getAttribute("data-type");
  }

  format(name, value) {
    if (name === "custom-paragraph") {
      if (value) {
        // Only set attribute if it doesn't already exist
        if (!this.domNode.hasAttribute("data-type")) {
          this.domNode.setAttribute("data-type", value);
        } else {
          // If attribute exists, remove it to toggle off
          this.domNode.removeAttribute("data-type");
        }
      } else {
        this.domNode.removeAttribute("data-type");
      }
    } else {
      super.format(name, value);
    }
  }
}
