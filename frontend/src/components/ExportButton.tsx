import { useEditor } from "@/contexts/EditorContext";
import { GrDocumentTxt } from "react-icons/gr";

function ExportButton({ doc_id }: { readonly doc_id: string }) {
  const { getQuill } = useEditor();
  const quill = getQuill(doc_id);
  const exportText = () => {
    if (quill) {
      const text = quill.getText();
      const blob = new Blob([text], { type: "text/plain" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "exported_text.txt";
      a.click();
      URL.revokeObjectURL(a.href);
    }
  };
  return (
    <button onClick={exportText}>
      <GrDocumentTxt />
    </button>
  );
}

export default ExportButton;
