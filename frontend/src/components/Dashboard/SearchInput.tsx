// File: /frontend/src/components/Dashboard/SearchInput.tsx
import { Input } from "@/components/ui/input";
import { useSearch } from "@/contexts/SearchContext";
import { useEffect, useState } from "react";
import useDebounce from "@/hooks/useDebounce";
import { MdOutlineSearch } from "react-icons/md";

function SearchInput() {
  const { searchQuery, setSearchQuery } = useSearch();
  const [inputValue, setInputValue] = useState(searchQuery);
  const debouncedValue = useDebounce(inputValue, 500);

  // Update the context when the debounced value changes
  useEffect(() => {
    setSearchQuery(debouncedValue);
  }, [debouncedValue, setSearchQuery]);

  return (
    <div className="flex-grow mx-8 max-w-2xl">
      <div className="relative">
        <MdOutlineSearch
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black"
          size={20}
        />
        <Input
          placeholder="Search documents"
          className="pl-10 bg-gray-100 border-none rounded-full focus:shadow"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
        />
      </div>
    </div>
  );
}

export default SearchInput;
