import React, { useEffect, useRef, useState } from "react";
import { MAX_HEADING_LEVEL } from "@/utils/editorConfig";

interface HeaderDropdownProps {
  onChange: (value: string | number) => void;
  value: string | number;
  maxLevel?: number;
}

const HeaderDropdown = ({
  onChange,
  value,
  maxLevel = MAX_HEADING_LEVEL,
}: HeaderDropdownProps) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const levels = Array.from({ length: maxLevel }, (_, i) => i + 1);

  useEffect(() => {
    const signal = new AbortController();
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside, signal);
    return () => signal.abort();
  }, []);

  const handleSelect = (val: string | number) => {
    onChange(val);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      setOpen(!open);
    } else if (e.key === "Escape" && open) {
      setOpen(false);
    }
  };

  return (
    <div ref={ref} className="relative text-sm w-28">
      <div
        onClick={() => setOpen(!open)}
        onKeyDown={handleKeyDown}
        className=" px-3 py-1 rounded cursor-pointer  flex justify-between items-center"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Select heading level"
        tabIndex={0}
      >
        {value === "" ? "Normal" : `H${value}`}
        <span className="text-neutral-500 dark:text-neutral-300" aria-hidden="true">
          ▾
        </span>
      </div>
      {open && (
        <ul
          className="absolute mt-1 border bg-neutral-50 dark:bg-neutral-800 shadow z-50 w-full max-h-60 overflow-y-auto rounded"
          role="listbox"
        >
          <li
            className={`px-3 py-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer ${
              value === "" ? "bg-neutral-100 dark:bg-neutral-800" : ""
            }`}
            onClick={() => handleSelect("")}
            role="option"
            aria-selected={value === ""}
            tabIndex={0}
          >
            Normal
          </li>
          {levels.map((level) => (
            <li
              key={level}
              className={`px-3 py-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer ${
                value === level ? "bg-neutral-100 dark:bg-neutral-800" : ""
              }`}
              onClick={() => handleSelect(level)}
              role="option"
              aria-selected={value === level}
              tabIndex={0}
            >
              H{level}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default HeaderDropdown;
