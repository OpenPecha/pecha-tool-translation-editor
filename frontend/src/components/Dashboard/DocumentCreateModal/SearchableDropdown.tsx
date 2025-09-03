import { useState, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronDown, Search } from "lucide-react";

interface DropdownOption {
  value: string;
  label: string;
  subtitle?: string;
}

interface SearchableDropdownProps {
  label: string;
  placeholder: string;
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  loading?: boolean;
  error?: string;
}

export function SearchableDropdown({
  label,
  placeholder,
  options,
  value,
  onChange,
  disabled = false,
  loading = false,
  error,
}: SearchableDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    
    return options.filter(option =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      option.value.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (option.subtitle && option.subtitle.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [options, searchTerm]);

  const selectedOption = options.find(option => option.value === value);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm("");
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-gray-900">{label}</Label>
      
      <div className="relative">
        <Button
          type="button"
          variant="outline"
          className={`w-full justify-between text-left font-normal border-gray-200 hover:border-gray-300 transition-colors ${
            !selectedOption ? "text-gray-500" : "text-gray-900"
          } ${error ? "border-red-500" : ""} ${isOpen ? "border-gray-400 ring-2 ring-gray-100" : ""}`}
          onClick={() => !disabled && !loading && setIsOpen(!isOpen)}
          disabled={disabled || loading}
        >
          <span className="truncate">
            {loading ? "Loading..." : selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          } text-gray-400`} />
        </Button>

        {isOpen && !disabled && !loading && (
          <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-hidden">
            <div className="p-3 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search languages..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 text-sm border-gray-200 focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
                  autoFocus
                />
              </div>
            </div>
            
            <div className="max-h-40 overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <div className="p-4 text-sm text-gray-500 text-center">
                  No languages found
                </div>
              ) : (
                filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`w-full text-left px-3 py-2.5 hover:bg-gray-50 transition-colors border-none bg-transparent ${
                      option.value === value ? "bg-slate-50 text-slate-900 border-l-2 border-slate-900" : "text-gray-900"
                    }`}
                    onClick={() => handleSelect(option.value)}
                  >
                    <div className="truncate font-medium text-sm">{option.label}</div>
                    {option.subtitle && (
                      <div className="text-xs text-gray-500 truncate mt-1">
                        {option.subtitle}
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
