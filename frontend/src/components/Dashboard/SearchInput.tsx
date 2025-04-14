import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

function SearchInput() {
  return (
    <div className="flex-grow mx-8 max-w-2xl">
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
          size={16}
        />
        <Input placeholder="Search" className="pl-10 bg-gray-100 border-none" />
      </div>
    </div>
  );
}
export default SearchInput;
