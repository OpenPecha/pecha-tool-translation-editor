import { Link } from "react-router-dom";
import OpenPecha from "@/assets/icon.png";
import { HelpCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function Footer() {
  const { t } = useTranslation();
  return (
    <div className="bg-neutral-100 dark:bg-neutral-700 p-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">
          {t("common.poweredBy")}{" "}
          <a href="https://openpecha.org/" className=" text-secondary-500 ">
            <img src={OpenPecha} alt="OpenPecha" className="w-4 h-4 inline" />{" "}
            OpenPecha
          </a>
        </p>
        <div className="flex items-center gap-4">
          <Link
            to="/help"
            className="text-sm flex items-center gap-1 hover:text-secondary-800 hover:underline font-medium transition-colors"
            title={t("common.getHelpAndDocumentation")}
          >
            <HelpCircle className="w-4 h-4" />
            <span className="hidden sm:inline">{t("common.help")}</span>
          </Link>
          <a
            href="https://buddhistai.tools"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 text-sm font-semibold text-white hover:from-indigo-500 hover:to-pink-500 transition-all shadow-sm hover:shadow-md"
            title={t("common.getHelpAndDocumentation")}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 20 20"
              fill="none"
              className="flex-shrink-0"
            >
              <circle
                cx="10"
                cy="10"
                r="10"
                fill="currentColor"
                opacity="0.2"
              />
              <path
                d="M7.5 12.5L12.5 7.5M12.5 7.5H8.5M12.5 7.5V11.5"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>Buddhistai Tools</span>
          </a>
        </div>
      </div>
    </div>
  );
}
