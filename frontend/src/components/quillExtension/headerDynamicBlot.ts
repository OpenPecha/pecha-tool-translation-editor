import Quill from "quill";
const Block = Quill.import("blots/block");

// Factory function to create custom header blots
function createHeaderBlot(level) {
  class HeaderBlot extends Block {
    static blotName = `header${level}`;
    static tagName = `h${level}`; // This will create <h7>, <h8>, etc.

    static create(value) {
      const node = super.create();
      node.setAttribute("data-level", level);
      return node;
    }

    static formats(node) {
      return node.getAttribute("data-level");
    }
  }

  return HeaderBlot;
}
export default createHeaderBlot;
