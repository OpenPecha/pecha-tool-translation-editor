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
			node.removeEventListener("click", this.handleClick);
			return node;
		}

		// Otherwise add the new suggestion
		node.setAttribute("data-id", value.id);
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
				position: {
					top: top,
					left: left,
				},
			};
			emitter.emit("showCommentBubble", __data);
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

export default CommentBlot;
