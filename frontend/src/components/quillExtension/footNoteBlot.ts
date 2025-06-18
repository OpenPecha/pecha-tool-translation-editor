import emitter from "@/services/eventBus";
import Quill from "quill";
const Inline = Quill.import("blots/inline");

class footnote extends Inline {
  static blotName = "footnote";
  static tagName = "span";
  static className = "footnote";

  static create(value) {
    const node = super.create();

    // Check if this node already has the suggestion
    const existingSuggestionId = node.getAttribute("data-id");
    if (existingSuggestionId === value.id) {
      // If it does, remove the suggestion formatting
      node.removeAttribute("data-id");
      node.removeAttribute("data-order");
      node.removeEventListener("click", this.handleClick);
      return node;
    }
    if (value.id && value.order) {
      node.setAttribute("data-id", value.id);
      node.setAttribute("data-order", value.order);
    }
    // Otherwise add the new suggestion
    node.addEventListener("click", (event) => {
      // Positioning logic
      const bubbleWidth = 250;
      const bubbleHeight = 200;
      let left = event.pageX + 5;
      let top = event.pageY + 5;

      // Ensure bubble stays within the viewport
      if (left + bubbleWidth > window.innerWidth) {
        left = window.innerWidth - bubbleWidth - 10;
      }
      if (top + bubbleHeight > window.innerHeight) {
        top = window.innerHeight - bubbleHeight - 10;
      }

      const __data = {
        id: value.id,
        order: value.order,
        position: {
          top: top,
          left: left,
        },
      };
      emitter.emit("showfootnotebubble", __data);
    });

    return node;
  }

  static formats(node) {
    return {
      id: node.getAttribute("data-id"),
      order: node.getAttribute("data-order"),
    };
  }

  delete() {
    this.domNode.replaceWith(document.createTextNode(this.domNode.innerText));
  }
}

export default footnote;
