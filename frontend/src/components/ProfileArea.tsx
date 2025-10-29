import { useState, useRef, useEffect } from "react";
import AvatarWrapper from "./ui/custom-avatar";
import { useAuth } from "@/auth/use-auth-hook";
import { MdKeyboardArrowDown, MdLogout } from "react-icons/md";
import LanguageSwitcher from "./LanguageSwitcher";
import ThemeToggle from "./ThemeToggle";
import SettingsButton from "./setting/SettingsButton";
import { Button } from "./ui/button";
import { useTranslation } from "react-i18next";

function ProfileArea() {
  const [isOpen, setIsOpen] = useState(false);
  const { currentUser, logout: handleLogout } = useAuth();
  const { i18n } = useTranslation(); 
  const currentLanguage = i18n.language;
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

  return (
    <div className={`relative `} ref={dropdownRef}>
      {/* Profile Button */}
      <button
        onClick={toggleDropdown}
        className="flex font-google-sans items-center space-x-2 px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:ring-offset-2"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <AvatarWrapper
          imageUrl={currentUser?.picture}
          name={currentUser?.name}
          size={36}
        />
        <div className="hidden sm:flex flex-col items-start">
          <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
            {currentUser?.name}
          </span>
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            {currentUser?.email}
          </span>
        </div>
        <MdKeyboardArrowDown
          className={`w-5 h-5 text-neutral-500 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      <div
        style={{ display: isOpen ? "block" : "none" }}
        className={` ${
          currentLanguage === "bo" && "font-monlam-2 !text-xs"
        } absolute right-0 w-80 bg-white dark:bg-neutral-800 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-700 py-2 z-50`}
      >
        {/* Settings and Logout */}
        <div className="px-4 pt-2 flex flex-col gap-3">
          <LanguageSwitcher />
          <ThemeToggle />
          <div className="flex items-center gap-2 justify-between">
            <SettingsButton />
            <Button
              onClick={onLogout}
              variant="ghost"
              size="sm"
              className="w-max px-2 py-1 flex items-center  shadow-md  text-sm gap-2 bg-secondary-300 hover:bg-secondary-200 dark:bg-secondary-600 dark:text-secondary-500 dark:hover:bg-secondary-600 cursor-pointer  rounded-lg transition-colors duration-150"
            >
              <MdLogout className="w-4 h-4 text-neutral-500 dark:text-neutral-300" />{" "}
              <span className="text-sm text-neutral-500 dark:text-neutral-300">
                Logout
              </span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfileArea;
