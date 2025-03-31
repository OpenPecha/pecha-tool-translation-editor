import React, { useState, useEffect, useRef } from "react";
import { MAX_HEADING_LEVEL } from "@/../config";

interface HeaderDropdownProps {
  onChange: (value: string | number) => void;
  defaultValue?: string | number;
  maxLevel?: number;
}

const HeaderDropdown = ({
  onChange,
  defaultValue = "",
  maxLevel = MAX_HEADING_LEVEL,
}: HeaderDropdownProps) => {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | number>(defaultValue);
  const ref = useRef<HTMLDivElement>(null);

  const levels = Array.from({ length: maxLevel }, (_, i) => i + 1);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (value: string | number) => {
    setSelected(value);
    onChange(value);
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
        className="border px-3 py-1 rounded cursor-pointer bg-white shadow-sm flex justify-between items-center"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Select heading level"
        tabIndex={0}
      >
        {selected === "" ? "Normal" : `H${selected}`}
        <span className="text-gray-400" aria-hidden="true">
          ▾
        </span>
      </div>
      {open && (
        <ul
          className="absolute mt-1 border bg-white shadow z-50 w-full max-h-60 overflow-y-auto rounded"
          role="listbox"
        >
          <li
            className={`px-3 py-1 hover:bg-gray-100 cursor-pointer ${
              selected === "" ? "bg-gray-100" : ""
            }`}
            onClick={() => handleSelect("")}
            role="option"
            aria-selected={selected === ""}
            tabIndex={0}
          >
            Normal
          </li>
          {levels.map((level) => (
            <li
              key={level}
              className={`px-3 py-1 hover:bg-gray-100 cursor-pointer ${
                selected === level ? "bg-gray-100" : ""
              }`}
              onClick={() => handleSelect(level)}
              role="option"
              aria-selected={selected === level}
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
