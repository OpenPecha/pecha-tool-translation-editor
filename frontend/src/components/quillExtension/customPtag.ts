import Quill from "quill";

const Block = Quill.import("blots/block");

class CustomParagraph extends Block {
  static blotName = "paragraph";

  static create(value: any) {
    const tagName = value === "section" || value?.["data-type"] === "section" ? "section" : "p";
    const node = document.createElement(tagName);

    const dataType = typeof value === "string" ? value : value?.["data-type"];
    if (dataType) {
      node.setAttribute("data-type", dataType);
    }

    return node;
  }

  static formats(node: HTMLElement) {
    const dataType = node.getAttribute("data-type");
    return dataType ? { "data-type": dataType } : null;
  }
}

export default CustomParagraph;
