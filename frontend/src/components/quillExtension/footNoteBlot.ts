import emitter from "@/services/eventBus";
import Quill from "quill";
const Inline = Quill.import("blots/inline");

class footnote extends Inline {
  static blotName = "footnote";
  static tagName = "span";
  static className = "footnote";

  static create(value) {
    const node = super.create();

    // Add hover event listeners for highlighting
    const handleMouseEnter = () => {
      this.highlightFootnoteGroup(value.id, true);
    };
    
    const handleMouseLeave = () => {
      this.highlightFootnoteGroup(value.id, false);
    };

    // Check if this node already has the suggestion
    const existingSuggestionId = node.getAttribute("data-id");
    if (existingSuggestionId === value.id) {
      // If it does, remove the suggestion formatting
      node.removeAttribute("data-id");
      node.removeAttribute("data-order");
      node.removeEventListener("mouseenter", handleMouseEnter);
      node.removeEventListener("mouseleave", handleMouseLeave);
      return node;
    }
    if (value.id && value.order) {
      node.setAttribute("data-id", value.id);
      node.setAttribute("data-order", value.order);
    }
    
    node.addEventListener("mouseenter", handleMouseEnter);
    node.addEventListener("mouseleave", handleMouseLeave);
    
    // Otherwise add the new suggestion
    node.addEventListener("click", (event) => {
      const __data = {
        id: value.id,
        order: value.order,
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

  static highlightFootnoteGroup(footnoteId, isHighlighted) {
    // Find all spans with the same footnote ID across the entire document
    const allFootnoteSpans = document.querySelectorAll(
      `span.footnote[data-id="${footnoteId}"]`
    );
    
    allFootnoteSpans.forEach((span) => {
      if (isHighlighted) {
        span.classList.add("footnote-highlighted");
      } else {
        span.classList.remove("footnote-highlighted");
      }
    });
  }

  delete() {
    this.domNode.replaceWith(document.createTextNode(this.domNode.innerText));
  }
}

export default footnote;
