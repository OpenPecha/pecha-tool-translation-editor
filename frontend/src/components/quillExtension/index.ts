import Quill from "quill";
import QuillCursors from "quill-cursors";
import TextSuggestionModule from "./suggestionModule";
import { createSuggest, fetchSuggestsByThread } from "../../api/suggest";
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
  }

function createBubbleMenu() {
    let bubble = document.createElement("div");
    bubble.id = "suggestion-bubble";
    bubble.style.position = "absolute";
    bubble.style.background = "#fff";
    bubble.style.border = "1px solid #ccc";
    bubble.style.padding = "8px";
    bubble.style.boxShadow = "0px 2px 10px rgba(0,0,0,0.1)";
    bubble.style.display = "none";
    bubble.style.zIndex = "1000";
    bubble.style.borderRadius = "5px";
    document.body.appendChild(bubble);
    return bubble;
}

const suggestionBubble = createBubbleMenu();

function showSuggestionBubble(event, data) {
  if (!data || data.length === 0) return;
  console.log(data)

  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
  const token = localStorage.getItem("token") || "";

  // Create suggestion items
  const suggestionItems = data.map(suggestion => {
      const createdAt = new Date(suggestion.createdAt).toLocaleString();
      return `
          <div style="border-bottom: 1px solid #ddd; padding: 8px 0;">
              <div style="font-weight: bold; color: #007BFF;">
                  ${suggestion.user.username}
              </div>
              <div style="color: #333;">
                  "${suggestion.content}"
              </div>
              <div style="font-size: 12px; color: gray;">
                  Added on: ${createdAt}
              </div>
          </div>
      `;
  }).join("");

  // Generate the suggestion bubble content
  suggestionBubble.innerHTML = `
      <div style="max-height: 200px; overflow-y: auto; padding-bottom: 10px;">
          ${suggestionItems}
      </div>
      <textarea id="newSuggestionInput" placeholder="Write a new suggestion..." 
          style="width: 100%; height: 50px; border: 1px solid #ccc; padding: 5px; border-radius: 5px;">
      </textarea>
      <button id="submitSuggestionBtn" 
          style="margin-top: 5px; width: 100%; padding: 8px; background: #007BFF; color: white; border: none; border-radius: 5px; cursor: pointer;">
          Submit Suggestion
      </button>
  `;

  // Positioning logic
  const bubbleWidth = 300;
  const bubbleHeight = 250;
  let left = event.pageX + 10;
  let top = event.pageY + 10;

  // Ensure bubble stays within the viewport
  if (left + bubbleWidth > window.innerWidth) {
      left = window.innerWidth - bubbleWidth - 20;
  }
  if (top + bubbleHeight > window.innerHeight) {
      top = window.innerHeight - bubbleHeight - 20;
  }

  suggestionBubble.style.display = "block";
  suggestionBubble.style.left = `${left}px`;
  suggestionBubble.style.top = `${top}px`;

  // Hide bubble when clicking outside
  document.addEventListener("click", function hideBubble(e) {
      if (!suggestionBubble.contains(e.target) && e.target !== event.target) {
          suggestionBubble.style.display = "none";
          document.removeEventListener("click", hideBubble);
      }
  });

  // Handle submission
  document.getElementById("submitSuggestionBtn").addEventListener("click", () => {
      const newSuggestion = document.getElementById("newSuggestionInput").value.trim();
      if (newSuggestion) {
          let threadId = data[0].threadId;
          let documentId = data[0].docId;
          let start = data[0].initial_start_offset;
          let end = data[0].initial_end_offset;
          let currentUser = JSON.parse(localStorage.getItem("user") || "{}");
          let token = localStorage.getItem("token") || "";
          createSuggest(threadId, documentId, currentUser.id, newSuggestion, start, end, token)
              .then(response => {
                console.log(response)
                  alert("Suggestion submitted!");
                  suggestionBubble.style.display = "none"; // Close bubble after submission
              })
              .catch(error => console.error("Error submitting suggestion:", error));
      }
  });
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
    Quill.register(SuggestionBlot);

}