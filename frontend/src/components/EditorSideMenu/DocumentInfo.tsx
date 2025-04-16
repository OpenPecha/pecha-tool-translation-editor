import { useCurrentDoc } from "@/hooks/useCurrentDoc";
import React from "react";
import { useParams } from "react-router-dom";

function DocumentInfo() {
  const { id } = useParams();
  const { currentDoc } = useCurrentDoc(id);

  return (
    <div className="mt-4 border-t border-editor-border p-4">
      <h3 className="text-xs font-medium uppercase text-muted-foreground mb-3">
        Document Information
      </h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>language</span>
          <span>{currentDoc?.language}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Root</span>
          <span>{currentDoc?.isRoot ? "true" : "false"}</span>
        </div>
      </div>
    </div>
  );
}

export default DocumentInfo;
