import React from "react";
import { diffWords } from "diff";

interface DiffTextProps {
  oldText: string;
  newText: string;
  truncated?: boolean;
}

const DiffText: React.FC<DiffTextProps> = ({ oldText, newText, truncated = false }) => {
  const differences = diffWords(oldText, newText);
  
  return (
    <div className="whitespace-pre-wrap font-sans bg-neutral-50 dark:bg-neutral-800">
      {differences.map((part, index) => {
        if (part.removed) {
          return (
            <span
              key={index}
              className="bg-red-100 text-red-800 line-through decoration-2"
              title="This text was removed in the new translation"
            >
              {part.value}
            </span>
          );
        } else if (part.added) {
          return (
            <span
              key={index}
              className="bg-green-100 text-green-800 border-b-2 border-green-300"
              title="This text was added in the new translation"
            >
              {part.value}
            </span>
          );
        } else {
          return <span key={index}>{part.value}</span>;
        }
      })}
      {truncated && <span className="text-gray-400">...</span>}
    </div>
  );
};

export default DiffText;
