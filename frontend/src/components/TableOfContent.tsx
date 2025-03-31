import { useEditor } from "@/contexts/EditorContext";
import { MAX_HEADING_LEVEL } from "@/../config";
import React, { useState, useEffect } from "react";
import { FaList } from "react-icons/fa";
import { Button } from "./ui/button";

interface Heading {
  text: string;
  level: number;
  id: string;
}

interface TableOfContentProps {
  documentId: string;
}

const TableOfContent: React.FC<TableOfContentProps> = ({ documentId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [headings, setHeadings] = useState<Heading[]>([]);
  const { getQuill } = useEditor();

  const quill = getQuill(documentId);
  const generateList = () => {
    let list = "h1";
    for (let i = 2; i <= MAX_HEADING_LEVEL; i++) {
      //genetate list
      list += `,h${i}`;
    }
    return list;
  };
  useEffect(() => {
    const extractHeadings = () => {
      if (!quill) return;
      let list = generateList();
      const headingElements = quill.root.querySelectorAll(list);
      const headingsData: Heading[] = Array.from(headingElements).map(
        (heading, index) => ({
          text: heading.textContent || "",
          level: parseInt(heading.tagName[1]),
          id: `heading-${index}`,
        })
      );

      setHeadings(headingsData);
    };

    extractHeadings();

    // Create a MutationObserver to watch for changes in the editor
    const observer = new MutationObserver(extractHeadings);

    if (quill) {
      observer.observe(quill.root, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }

    return () => observer.disconnect();
  }, [quill]);

  const scrollToHeading = (index: number) => {
    if (!quill) return;
    let list = generateList();
    const headingElements = quill.root.querySelectorAll(list);
    const element = headingElements[index];
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="absolute top-3 right-4 p-3  z-10"
        aria-label="Table of Contents"
      >
        <FaList className="w-5 h-5" />
      </Button>

      <div
        className={`fixed inset-y-0 left-0 w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-20 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Table of Contents</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          <nav>
            {headings.map((heading, index) => {
              if (!heading.text?.trim()) return null;
              return (
                <button
                  key={heading.id}
                  onClick={() => scrollToHeading(index)}
                  className={`block w-full text-left py-2 text-sm hover:bg-gray-100 truncate`}
                  style={{
                    paddingLeft: `${heading.level * 0.5}rem`,
                    fontSize: `${Math.max(
                      0.75,
                      1.1 - (heading.level - 1) * 0.1
                    )}rem`,
                    fontWeight:
                      heading.level === 1
                        ? 600
                        : Math.max(400, 500 - (heading.level - 1) * 50),
                  }}
                >
                  {heading.text}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {isOpen && (
        <div
          className="fixed inset-0  bg-opacity-50 z-10"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

export default TableOfContent;
