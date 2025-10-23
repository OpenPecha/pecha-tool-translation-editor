import { Input } from "@/components/ui/input";
import { ChangeEvent, useEffect, useState, memo } from "react";
import useDebounce from "@/hooks/useDebounce";
import { MdOutlineSearch } from "react-icons/md";
import { useSearchStore } from "@/stores/searchStore";
import { useTranslate } from "@tolgee/react";

/**
 * SearchInput component that provides a search field with debounced input
 * and analytics tracking capabilities.
 */
const SearchInput = () => {
  const { searchQuery, setSearchQuery } = useSearchStore();
  const { t } = useTranslate();
  const [inputValue, setInputValue] = useState<string>(searchQuery || "");

  const debouncedValue = useDebounce(inputValue?.toLowerCase(), 1000);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setInputValue(event.target.value);
  };

  useEffect(() => {
    setSearchQuery(debouncedValue);
  }, [debouncedValue, setSearchQuery]);
  return (
    <div className="flex-grow mx-8 max-w-2xl">
      <div className="relative">
        {/* Search icon */}
        <MdOutlineSearch
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500"
          size={20}
          aria-hidden="true"
        />

        {/* Search input field */}
        <Input
          type="search"
          placeholder={t("documents.searchDocuments")}
          className="pl-10 bg-gray-100 border-none rounded-full focus:shadow focus:bg-white"
          value={inputValue}
          onChange={handleInputChange}
          aria-label={t("documents.searchDocuments")}
        />
      </div>
    </div>
  );
};

export default memo(SearchInput);
