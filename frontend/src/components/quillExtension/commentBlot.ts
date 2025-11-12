import emitter from "@/services/eventBus";
import Quill from "quill";
const Inline = Quill.import("blots/inline");

class CommentBlot extends Inline {
	static blotName = "comment";
	static tagName = "span";
	static className = "comments";

	static create(value) {
		const node = super.create();

		// Check if this node already has the suggestion
		const existingSuggestionId = node.getAttribute("data-id");
		if (existingSuggestionId === value.id) {
			// If it does, remove the suggestion formatting
			node.removeAttribute("data-id");
			// @ts-ignore
			node.removeEventListener("click", this.handleClick);
			return node;
		}

		// Add attributes for both functionalities
		if (value.id) {
			node.setAttribute("data-id", value.id);
		}
		if (value.threadId) {
			node.setAttribute("data-thread-id", value.threadId);
		}

		node.addEventListener("click", () => {
			// Sidebar functionality (new)
			if (value.threadId) {
				emitter.emit("open-comment-thread", { threadId: value.threadId });
			}
		});

		return node;
	}

	static formats(node) {
		return {
			id: node.getAttribute("data-id"),
			threadId: node.getAttribute("data-thread-id"),
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

export default CommentBlot;
