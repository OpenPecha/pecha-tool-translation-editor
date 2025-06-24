import { useState, useRef, useEffect } from "react";
import AvatarWrapper from "./ui/custom-avatar";
import { useAuth } from "@/auth/use-auth-hook";
import { useTranslate } from "@tolgee/react";
import { useCurrentLanguage } from "@/contexts/TolgeeContext";
import { MdKeyboardArrowDown, MdLogout } from "react-icons/md";
import LanguageSwitcher from "./LanguageSwitcher";

function ProfileArea() {
  const [isOpen, setIsOpen] = useState(false);
  const { currentUser, logout: handleLogout } = useAuth();
  const { t } = useTranslate();
  const currentLanguage = useCurrentLanguage();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleDropdown = () => setIsOpen(!isOpen);

  const onLogout = () => {
    handleLogout();
    setIsOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        // Check if the click is on a select dropdown or its content
        const target = event.target as Element;
        const isSelectContent = target.closest(
          "[data-radix-popper-content-wrapper]"
        );
        const isSelectTrigger = target.closest("[data-radix-select-trigger]");

        // Don't close if clicking on select components
        if (isSelectContent || isSelectTrigger) {
          return;
        }

        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  console.log(currentLanguage);
  return (
    <div
      className={`relative ${currentLanguage === "bo" && "font-monlam-2"} `}
      ref={dropdownRef}
    >
      {/* Profile Button */}
      <button
        onClick={toggleDropdown}
        className="flex font-google-sans items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <AvatarWrapper
          imageUrl={currentUser?.picture}
          name={currentUser?.name}
          size={36}
        />
        <div className="hidden sm:flex flex-col items-start">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {currentUser?.name}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {currentUser?.email}
          </span>
        </div>
        <MdKeyboardArrowDown
          className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      <div
        style={{ display: isOpen ? "block" : "none" }}
        className="absolute right-0 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-50"
      >
        {/* Menu Items */}
        {/* Language Selector */}

        {/* Logout Button */}
        <div className="px-4 pt-2 flex flex-col gap-2">
          <LanguageSwitcher />
          <button
            onClick={onLogout}
            className="w-max px-2 py-1 flex items-center self-end shadow-md  text-sm gap-2 bg-blue-100 hover:bg-blue-200 cursor-pointer dark:hover:bg-red-900/20 rounded-lg transition-colors duration-150"
          >
            <MdLogout /> <span>{t("auth.logout")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProfileArea;
