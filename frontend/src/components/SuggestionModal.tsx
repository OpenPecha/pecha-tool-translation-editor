import { createSuggest } from "@/api/suggest";
import { useAuth } from "@/contexts/AuthContext";
import { useEditor } from "@/contexts/EditorContext";
import React, { useState } from "react";

function SuggestionModal({ documentId, setShowSuggestionModal, range }) {
  const [suggestionText, setSuggestionText] = useState("");
  const [isSuggestion, setIsSuggestion] = useState(true);
  const [currentRange, setCurrentRange] = useState<Range | null>(range);
  const { getQuill } = useEditor();
  const quill = getQuill(documentId);
  const { currentUser } = useAuth();
  async function addSuggestion() {
    if (!currentRange) return;

    const suggestion = suggestionText;
    if (!suggestion || suggestion === "") {
      setSuggestionText("");
      setShowSuggestionModal(false);
      return;
    }

    const end = currentRange.index + currentRange.length;
    const id = Math.random().toString(36).substring(7);
    const threadId = id;
    try {
      const createdSuggestion = await createSuggest(
        threadId,
        documentId,
        currentUser.id,
        suggestion,
        currentRange.index,
        end
      );
      if (createdSuggestion.id) {
        // 🔥 Update the Quill editor to highlight the text
        quill.formatText(currentRange.index, currentRange.length, "suggest", {
          id: threadId,
        });
        setShowSuggestionModal(false);
        setSuggestionText("");

        // 🔥 Update the comments list dynamically
        // setComments((prev) => [createdComment, ...prev]); // Add new comment to the top
      }
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  }

  return (
    <div className="fixed inset-0 bg-[rgba(0,0,0,0.3)] bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96">
        <h3 className="text-lg font-semibold mb-4">Add Suggestion</h3>
        <textarea
          className="w-full border rounded p-2 mb-4"
          value={suggestionText}
          onChange={(e) => setSuggestionText(e.target.value)}
          placeholder="Enter your suggestion..."
          rows={4}
        />
        <div className="flex items-center mb-4">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isSuggestion}
              onChange={(e) => setIsSuggestion(e.target.checked)}
              className="mr-2"
            />
            Mark as suggestion
          </label>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => {
              setShowSuggestionModal(false);
              setSuggestionText("");
            }}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
          >
            Cancel
          </button>
          <button
            onClick={addSuggestion}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}

export default SuggestionModal;
