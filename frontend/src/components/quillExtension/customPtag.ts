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
        this.domNode.setAttribute("data-type", value);
      } else {
        this.domNode.removeAttribute("data-type");
      }
    } else {
      super.format(name, value);
    }
  }
}
