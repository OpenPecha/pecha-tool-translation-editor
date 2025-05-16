// File: /frontend/src/components/Dashboard/SearchInput.tsx
import { Input } from "@/components/ui/input";
import { useSearch } from "@/contexts/SearchContext";
import { useEffect, useState } from "react";
import useDebounce from "@/hooks/useDebounce";
import { MdOutlineSearch } from "react-icons/md";

function SearchInput({
  trackEvent,
}: {
  trackEvent: (params: TrackEventParams) => void;
}) {
  const { searchQuery, setSearchQuery } = useSearch();
  const [inputValue, setInputValue] = useState(searchQuery);
  const debouncedValue = useDebounce(inputValue, 500);

  // Update the context when the debounced value changes
  useEffect(() => {
    setSearchQuery(debouncedValue);
    trackEvent({
      category: "navbar",
      action: "search",
      name: debouncedValue,
      value: debouncedValue?.length,
    });
  }, [debouncedValue, setSearchQuery]);

  const handleChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
  };
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
          onChange={handleChange}
        />
      </div>
    </div>
  );
}

export default SearchInput;
