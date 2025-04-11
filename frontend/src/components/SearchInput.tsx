import React from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
  containerClassName?: string;
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, containerClassName, ...props }, ref) => {
    return (
      <div
        className={cn(
          "flex items-center gap-2 w-full max-w-2xl   bg-[#f2f3f5] px-4 py-3 -100 rounded-full border border-transparent focus-within:border-slate-200 transition-colors",
          containerClassName
        )}
      >
        <Search className="h-5 w-5 text-slate-700" />
        <input
          type="search"
          className={cn(
            " flex-1 bg-transparent border-none outline-none placeholder:text-slate-400 text-slate-700",
            className
          )}
          placeholder="Search"
          ref={ref}
          {...props}
        />
      </div>
    );
  }
);

SearchInput.displayName = "SearchInput";

export default SearchInput;
