import { Input } from "@/components/ui/input";
import { useSearch } from "@/contexts/SearchContext";
import { ChangeEvent, FC, useEffect, useState } from "react";
import useDebounce from "@/hooks/useDebounce";
import { MdOutlineSearch } from "react-icons/md";
import { useMatomo } from "@datapunt/matomo-tracker-react";

/**
 * SearchInput component that provides a search field with debounced input
 * and analytics tracking capabilities.
 */
const SearchInput = () => {
  const { searchQuery, setSearchQuery } = useSearch();
  const { trackEvent } = useMatomo();

  const [inputValue, setInputValue] = useState<string>(searchQuery || "");

  const debouncedValue = useDebounce(inputValue, 1000);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setInputValue(event.target.value);
  };

  useEffect(() => {
    setSearchQuery(debouncedValue);
    if (debouncedValue && debouncedValue !== "")
      trackEvent({
        category: "navbar",
        action: "search",
        name: debouncedValue,
        value: debouncedValue?.length,
      });
  }, [debouncedValue, setSearchQuery, trackEvent]);

  return (
    <div className="flex-grow mx-8 max-w-2xl">
      <div className="relative">
        {/* Search icon */}
        <MdOutlineSearch
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black"
          size={20}
          aria-hidden="true"
        />

        {/* Search input field */}
        <Input
          type="search"
          placeholder="Search documents"
          className="pl-10 bg-gray-100 border-none rounded-full focus:shadow"
          value={inputValue}
          onChange={handleInputChange}
          aria-label="Search documents"
        />
      </div>
    </div>
  );
};

export default SearchInput;
