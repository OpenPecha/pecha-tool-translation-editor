import Quill from "quill";

type AnnotationType = {
  index: number;
  length: number;
  format: string;
  value: { id: string; options: string[] };
};

const example_annotation: AnnotationType[] = [
  {
    index: 10,
    length: 5,
    format: "annotation",
    value: { id: "id1", options: ["A", "B"] },
  },
  {
    index: 25,
    length: 7,
    format: "annotation",
    value: { id: "id2", options: ["Vote1", "Vote2"] },
  },
];

export function addAnnotations(
  quill: Quill,
  annotations: AnnotationType[] = []
) {
  const Delta = Quill.import("delta");
  let batchDelta = new Delta();

  let lastIndex = 0;
  annotations.forEach((ann) => {
    // Retain up to the start of the annotation
    batchDelta = batchDelta.retain(ann.index - lastIndex);
    // Retain the actual length with the annotation format
    batchDelta = batchDelta.retain(ann.length, { [ann.format]: ann.value });
    // Update lastIndex to point after this annotation
    lastIndex = ann.index + ann.length;
  });
  // Optionally, retain any text after the last annotation to sync up the whole doc
  // batchDelta = batchDelta.retain(quill.getLength() - lastIndex);

  quill.updateContents(batchDelta, "api");
}

export const handleAnnotationVote = (
  quill: Quill,
  option: string, //the chosen thing
  index: number,
  length: number
) => {
  // Delete the old text and insert the new option
  quill.deleteText(index, length, "user");
  quill.insertText(index, option, "user");

  // Optionally, you can remove the annotation format
  quill.removeFormat(index, option.length, "user");
};
