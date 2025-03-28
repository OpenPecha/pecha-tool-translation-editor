import Quill from "quill";
const Inline = Quill.import("blots/inline");
import {
  createSuggest,
  deleteSuggest,
  fetchSuggestsByThread,
} from "../../api/suggest";

class SuggestionBlot extends Inline {
  static blotName = "suggest";
  static tagName = "span";
  static className = "suggestion";

  static create(value) {
    let node = super.create();

    // Check if this node already has the suggestion
    const existingSuggestionId = node.getAttribute("data-id");
    if (existingSuggestionId === value.id) {
      // If it does, remove the suggestion formatting
      node.removeAttribute("data-id");
      node.removeEventListener("click", this.handleClick);
      return node;
    }

    // Otherwise add the new suggestion
    node.setAttribute("data-id", value.id);
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
    if (name === "suggest") {
      if (value) {
        // Check if already has this suggestion
        const existingId = this.domNode.getAttribute("data-id");
        if (existingId === value.id) {
          // Remove if already exists
          this.domNode.removeAttribute("data-id");
        } else {
          // Add new suggestion
          this.domNode.setAttribute("data-id", value.id);
        }
      } else {
        this.domNode.removeAttribute("data-id");
      }
    } else {
      super.format(name, value);
    }
  }

  delete() {
    this.domNode.replaceWith(document.createTextNode(this.domNode.innerText));
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

  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");

  // Create suggestion items
  const suggestionItems = data
    .map((suggestion) => {
      const createdAt = new Date(suggestion.createdAt).toLocaleString();
      return `
          <div style="padding: 4px 0; display: flex; flex-direction: column; gap: 2px;">
              <div style="display: flex; align-items: center; gap: 4px;">
                  <span style="font-weight: 500; font-size: 13px; color: #444;">
                      ${suggestion.user.username}
                  </span>
                  <span style="font-size: 11px; color: #666;">
                      ${createdAt}
                  </span>
              </div>
              <div style="font-size: 12px; color: #333; margin-bottom: 2px;">
                  ${suggestion.content}
              </div>
              <div style="display: flex; justify-content: flex-end;">
                  <button class="delete-suggestion-btn" data-id="${suggestion.id}" 
                      style="background: none; border: none; color: #666; font-size: 11px; 
                      cursor: pointer; padding: 2px;">
                      Delete
                  </button>
              </div>
          </div>
      `;
    })
    .join("");

  // Generate the suggestion bubble content
  suggestionBubble.innerHTML = `
      <div style="max-height: 150px; overflow-y: auto; padding: 4px; min-width: 200px; max-width: 250px;">
          ${suggestionItems}
      </div>
      <div style="border-top: 1px solid #eee; padding: 4px;">
          <textarea id="newSuggestionInput" placeholder="Add a suggestion..." 
              style="width: 100%; height: 32px; border: 1px solid #ddd; padding: 4px; 
              border-radius: 3px; font-size: 12px; resize: none;">
          </textarea>
          <button id="submitSuggestionBtn" 
              style="margin-top: 4px; width: 100%; padding: 4px; background: #1a73e8; 
              color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 12px;">
              Submit
          </button>
      </div>
  `;

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
  document.querySelectorAll(".delete-suggestion-btn").forEach((button) => {
    button.addEventListener("click", function (e) {
      e.stopPropagation();
      const suggestionId = this.getAttribute("data-id");
      deleteSuggest(suggestionId)
        .then((response) => {
          if (data.length === 1) {
            const suggestionSpan = document.querySelector(
              `span.suggestion[data-id="${data[0].threadId}"]`
            );
            if (suggestionSpan) {
              const blot = Quill.find(suggestionSpan);
              if (blot && blot instanceof SuggestionBlot) {
                blot.delete(); // Remove the mark if it's the last suggestion
              }
            }
          }
          suggestionBubble.style.display = "none"; // Close bubble after submission
        })
        .catch((error) => console.error("Error submitting suggestion:", error));
    });
  });

  // Handle submission
  document
    .getElementById("submitSuggestionBtn")
    .addEventListener("click", () => {
      const newSuggestion = document
        .getElementById("newSuggestionInput")
        .value.trim();
      if (newSuggestion) {
        let threadId = data[0].threadId;
        let documentId = data[0].docId;
        let start = data[0].initial_start_offset;
        let end = data[0].initial_end_offset;
        let currentUser = JSON.parse(localStorage.getItem("user") || "{}");
        createSuggest(
          threadId,
          documentId,
          currentUser.id,
          newSuggestion,
          start,
          end
        )
          .then((response) => {
            alert("Suggestion submitted!");
            suggestionBubble.style.display = "none"; // Close bubble after submission
          })
          .catch((error) =>
            console.error("Error submitting suggestion:", error)
          );
      }
    });
}

export default SuggestionBlot;
