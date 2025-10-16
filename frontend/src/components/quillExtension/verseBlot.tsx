import Quill from "quill";

const Inline = Quill.import("blots/inline");

class VerseBlot extends Inline {
	static blotName = "verse";
	static tagName = "span";
	static className = "verse-blot";

	static create(value) {
		const node = super.create();
		node.setAttribute("data-verse", value.number);
		node.setAttribute("data-verse-id", value.id);
		return node;
	}

	static formats(node) {
		return {
			number: node.getAttribute("data-verse"),
			id: node.getAttribute("data-verse-id"),
		};
	}
}

export default VerseBlot;
