import { useCurrentDoc } from "@/hooks/useCurrentDoc";
import React from "react";

function DocumentInfo({ doc_info }) {
  console.log(doc_info);

  return (
    <div className="mt-4 border-t border-editor-border p-4">
      <h3 className="text-xs font-medium uppercase text-muted-foreground mb-3">
        Document Information
      </h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">language</span>
          <span>{doc_info.language}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Root</span>
          <span>{doc_info.isRoot ? "true" : "false"}</span>
        </div>
      </div>
    </div>
  );
}

export default DocumentInfo;
