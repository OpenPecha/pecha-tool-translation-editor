import React from "react";
import { diffLines } from "diff";

interface DiffTextProps {
  oldText: string;
  newText: string;
  truncated?: boolean;
}

const DiffText: React.FC<DiffTextProps> = ({
  oldText,
  newText,
  truncated = false,
}) => {
  const differences = diffLines(oldText, newText);

  return (
    <div className="whitespace-pre-wrap font-mono text-sm bg-neutral-50 dark:bg-neutral-800 p-2 rounded">
      {differences.map((part, index) => {
        const lines = part.value.split("\\n").map((line, i) => {
          if (line === "") return null;
          if (part.removed) {
            return (
              <div key={`${index}-${i}`} className="flex items-center">
                <span className="text-red-500 w-4 text-center select-none">
                  -
                </span>
                <span className="bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 flex-grow pl-2">
                  {line}
                </span>
              </div>
            );
          } else if (part.added) {
            return (
              <div key={`${index}-${i}`} className="flex items-center">
                <span className="text-green-500 w-4 text-center select-none">
                  +
                </span>
                <span className="bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 flex-grow pl-2">
                  {line}
                </span>
              </div>
            );
          }
          return (
            <div key={`${index}-${i}`} className="flex items-center">
              <span className="text-gray-400 w-4 select-none" />
              <span className="flex-grow pl-2">{line}</span>
            </div>
          );
        });
        return lines;
      })}
      {truncated && <span className="text-gray-400">...</span>}
    </div>
  );
};

export default DiffText;
