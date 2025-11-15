import { Search, AlertCircle } from "lucide-react";
import { getLanguageFromCode } from "../utils/languageUtils";
import { useTranslation } from "react-i18next";
import { BdrcSearchResult, useBdrcSearch } from "@/hooks/uesBDRC";

interface BdrcSearchPanelProps {
  readonly bdrcSearchQuery: string;
  readonly setBdrcSearchQuery: (query: string) => void;
  readonly showBdrcResults: boolean;
  readonly setShowBdrcResults: (show: boolean) => void;
  readonly bdrcTextNotFound: boolean;
  readonly isCheckingBdrcText: boolean;
  readonly selectedBdrcResult: BdrcSearchResult | null;
  readonly onResultSelect: (result: BdrcSearchResult) => void;
  readonly onCreateText: () => void;
}

export function BdrcSearchPanel({
  bdrcSearchQuery,
  setBdrcSearchQuery,
  showBdrcResults,
  setShowBdrcResults,
  bdrcTextNotFound,
  isCheckingBdrcText,
  selectedBdrcResult,
  onResultSelect,
  onCreateText,
}: BdrcSearchPanelProps) {
  const { t } = useTranslation();
  const {
    results: bdrcResults,
    isLoading: isLoadingBdrc,
    error: bdrcError,
  } = useBdrcSearch(bdrcSearchQuery, "Instance", 1000);

  // Helper function to render search results
  const renderSearchResults = () => {
    if (isLoadingBdrc) {
      return (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-4">
          <div className="flex items-center space-x-2 text-sm text-blue-600">
            <svg
              className="animate-spin h-4 w-4 text-blue-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span>{t("bdrcSearch.searchingBDRC")}</span>
          </div>
        </div>
      );
    }

    if (bdrcError) {
      return (
        <div className="absolute z-10 w-full mt-1 bg-white border border-red-300 rounded-md shadow-lg p-4">
          <p className="text-sm text-red-600">
            {t("bdrcSearch.errorSearchingBDRC")}: {bdrcError}
          </p>
        </div>
      );
    }

    if (bdrcResults.length > 0) {
      return (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {bdrcResults.map((result) => (
            <button
              key={result.workId || result.instanceId || `bdrc-${result.title}`}
              onClick={() => onResultSelect(result)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
            >
              <div className="font-medium text-sm text-gray-900">
                {result.title || result.workId || "Untitled"}
              </div>
              {result.workId && (
                <div className="text-xs text-gray-500 mt-1">
                  {t("bdrcSearch.bdrcId")} {result.workId}
                </div>
              )}
              {result.language && (
                <div className="text-xs text-gray-500">
                  {t("bdrcSearch.language")}{" "}
                  {getLanguageFromCode(result.language)}
                </div>
              )}
            </button>
          ))}
        </div>
      );
    }

    if (bdrcSearchQuery.trim()) {
      return (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-4">
          <p className="text-sm text-gray-600">
            {t("bdrcSearch.noBDRCTextsFound")}
          </p>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-4">
      {/* BDRC Search Input */}
      <div className="space-y-2">
        <label
          htmlFor="bdrc-search"
          className="block text-sm font-medium text-gray-700"
        >
          {t("bdrcSearch.searchTextByTitleOrId")}
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            id="bdrc-search"
            type="text"
            value={bdrcSearchQuery}
            onChange={(e) => {
              setBdrcSearchQuery(e.target.value);
              setShowBdrcResults(true);
            }}
            placeholder={t("bdrcSearch.searchPlaceholder")}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* BDRC Search Results */}
        {showBdrcResults && bdrcSearchQuery && (
          <div className="relative bdrc-results-container">
            {renderSearchResults()}
          </div>
        )}
      </div>

      {/* Checking BDRC Text Status */}
      {isCheckingBdrcText && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-center space-x-2 text-sm text-blue-600">
            <svg
              className="animate-spin h-5 w-5 text-blue-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span>{t("bdrcSearch.checkingIfTextExists")}</span>
          </div>
        </div>
      )}

      {/* BDRC Text Not Found Message */}
      {bdrcTextNotFound && selectedBdrcResult && !isCheckingBdrcText && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-800 mb-2">
                {t("bdrcSearch.textNotFoundInCatalog")}
              </p>
              <p className="text-sm text-yellow-700 mb-3">
                {t("bdrcSearch.textNotPresent", {
                  text: selectedBdrcResult.title || selectedBdrcResult.workId,
                  id: selectedBdrcResult.workId,
                })}
              </p>
              <button
                onClick={onCreateText}
                className="px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 transition-colors"
              >
                {t("bdrcSearch.createTextOnCataloger")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
