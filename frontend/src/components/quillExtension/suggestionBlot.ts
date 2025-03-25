import Quill from "quill";
const Inline = Quill.import("blots/inline");

class SuggestionBlot extends Inline {
  static blotName = "suggest";
  static tagName = "span";
  static className = "suggestion";

  static create(value) {
    let node = super.create();
    node.setAttribute("data-id", value.id); // Store unique comment ID
    node.style.backgroundColor = "pink"; // Highlight
    node.style.cursor = "pointer"; // Show as clickable
    node.addEventListener("click", (event) => {
      fetchSuggestsByThread(value.id).then((data) => {
        showSuggestionBubble(event, data);
      });
    });

    return node;
  }

  static formats(node) {
    return {
      id: node.getAttribute("data-id"),
    };
  }

  format(name, value) {
    if (name === "suggest" && value) {
      this.domNode.setAttribute("data-id", value.id);
    } else {
      super.format(name, value);
    }
  }
  delete() {
    this.domNode.replaceWith(document.createTextNode(this.domNode.innerText));
  }
}

export default SuggestionBlot;
