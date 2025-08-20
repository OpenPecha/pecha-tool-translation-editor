import emitter from "@/services/eventBus";
import Quill from "quill";
const Inline = Quill.import("blots/inline") as any;

interface FootnoteValue {
  id: string;
  order: string;
  nestedType?: string;
  parentId?: string;
  childrenIds?: string[];
}

class footnote extends Inline {
  static blotName = "footnote";
  static tagName = "span";
  static className = "footnote";
  
  declare domNode: HTMLElement;

  static create(value: FootnoteValue): HTMLElement {
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
      node.removeAttribute("data-nested-type");
      node.removeAttribute("data-parent-id");
      node.removeAttribute("data-children-ids");
      node.removeEventListener("mouseenter", handleMouseEnter);
      node.removeEventListener("mouseleave", handleMouseLeave);
      return node;
    }
    if (value.id && value.order) {
      node.setAttribute("data-id", value.id);
      node.setAttribute("data-order", value.order);
      
      // Add nested footnote attributes (for hover logic only, no visual styling)
      if (value.nestedType) {
        node.setAttribute("data-nested-type", value.nestedType);
      }
      if (value.parentId) {
        node.setAttribute("data-parent-id", value.parentId);
      }
      if (value.childrenIds && value.childrenIds.length > 0) {
        node.setAttribute("data-children-ids", value.childrenIds.join(","));
      }
    }
    
    node.addEventListener("mouseenter", handleMouseEnter);
    node.addEventListener("mouseleave", handleMouseLeave);
    
    // Otherwise add the new suggestion
    node.addEventListener("click", (_event: Event) => {
      const __data = {
        id: value.id,
        order: value.order,
      };
      emitter.emit("showfootnotebubble", __data);
    });

    return node;
  }

  static formats(node: HTMLElement): FootnoteValue {
    return {
      id: node.getAttribute("data-id") || "",
      order: node.getAttribute("data-order") || "",
      nestedType: node.getAttribute("data-nested-type") || undefined,
      parentId: node.getAttribute("data-parent-id") || undefined,
      childrenIds: node.getAttribute("data-children-ids")?.split(",").filter(Boolean) || [],
    };
  }

  static highlightFootnoteGroup(footnoteId: string, isHighlighted: boolean): void {
    // Find all spans with the same footnote ID across the entire document
    const allFootnoteSpans = document.querySelectorAll(
      `span.footnote[data-id="${footnoteId}"]`
    );
    
         allFootnoteSpans.forEach((span) => {
       const nestedType = span.getAttribute("data-nested-type");
       const childrenIds = span.getAttribute("data-children-ids")?.split(",").filter(Boolean) || [];
      
      if (isHighlighted) {
        // All footnotes use the same base highlighting
        span.classList.add("footnote-highlighted");
        
        // When hovering over parent, highlight children with different style
        if (nestedType === "parent") {
          childrenIds.forEach(childId => {
            const childSpans = document.querySelectorAll(`span.footnote[data-id="${childId}"]`);
            childSpans.forEach(childSpan => {
              childSpan.classList.add("footnote-inner-highlighted");
            });
          });
        }
        
                 // When hovering over nested footnote, DO NOT highlight parent
         // Only the inner footnote itself gets highlighted
      } else {
        // Remove all highlighting classes
        span.classList.remove("footnote-highlighted", "footnote-inner-highlighted");
        
        // Remove highlighting from children if this is a parent
        if (nestedType === "parent") {
          childrenIds.forEach(childId => {
            const childSpans = document.querySelectorAll(`span.footnote[data-id="${childId}"]`);
            childSpans.forEach(childSpan => {
              childSpan.classList.remove("footnote-inner-highlighted");
            });
          });
        }
        
                 // No need to remove parent highlighting since we don't add it when hovering nested
      }
    });
  }

  delete(): void {
    this.domNode.replaceWith(document.createTextNode(this.domNode.innerText));
  }
}

export default footnote;
