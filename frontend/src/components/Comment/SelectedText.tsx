import { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

const SelectedText = ({ text }: { text: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCollapsible, setIsCollapsible] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const element = textRef.current;
    if (element) {
      // Check if the text is overflowing
      if (element.scrollHeight > element.clientHeight) {
        setIsCollapsible(true);
      } else {
        setIsCollapsible(false);
      }
    }
  }, [text]);

  return (
    <div className="sticky top-0 z-10 bg-white py-2">
      <div className="bg-gray-100 p-2 rounded-md border relative">
        <p
          ref={textRef}
          className={`italic pr-4 ${!isExpanded ? "line-clamp-2" : ""}`}
        >
          "{text}"
        </p>
        {isCollapsible && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
          >
            {isExpanded ? (
              <ChevronUp size={18} />
            ) : (
              <ChevronDown size={18} />
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default SelectedText;
