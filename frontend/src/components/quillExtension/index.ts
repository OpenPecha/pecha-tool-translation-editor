import Quill from "quill";
import QuillCursors from "quill-cursors";
const Inline = Quill.import("blots/inline");

class CommentBlot extends Inline {
    static blotName = "comment";
    static tagName = "span";
    static className = "custom-comment";
  
    static create(value) {
      let node = super.create();

      node.setAttribute("data-id", value.id); // Store unique comment ID
      node.setAttribute("data-comment", value.text); // Store comment text
      node.style.backgroundColor = "lightyellow"; // Highlight
      node.style.cursor = "pointer"; // Show as clickable
      return node;
    }
  
    static formats(node) {
      return {
        id: node.getAttribute("data-id"),
        text: node.getAttribute("data-comment"),
      };
    }
  
    format(name, value) {
      if (name === "comment" && value) {
        this.domNode.setAttribute("data-id", value.id);
        this.domNode.setAttribute("data-comment", value.text);
      } else {
        super.format(name, value);
      }
    }
  }


export default function quill_import(){

    Quill.register("modules/cursors", QuillCursors);
    
    let fonts = Quill.import("attributors/style/font");
    fonts.whitelist = ["initial", "sans-serif", "serif", "monospace", "monlam"];
    Quill.register(fonts, true);
    
    Quill.register('modules/counter', function(quill, options) {
        var container = document.querySelector(options.container);
        quill.on('text-change', function() {
            var text = quill.getText();
            if (options.unit === 'word') {
                container.innerText = text.split(/\s+/).length + ' words';
            } else {
                container.innerText = text.length + ' characters';
            }
        });
    });

    Quill.register(CommentBlot);
}