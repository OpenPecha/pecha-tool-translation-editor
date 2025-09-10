
import { Link } from "react-router-dom";
import OpenPecha from "@/assets/icon.png";
import { HelpCircle } from "lucide-react";


export default function Footer() {
    return (
      <div className="bg-neutral-100 dark:bg-neutral-700 p-4">
        <div className="flex items-center justify-between gap-4">
          <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">
            Powered by{" "}
            <a href="https://openpecha.org/" className=" text-secondary-500 ">
              <img src={OpenPecha} alt="OpenPecha" className="w-4 h-4 inline" />{" "}
              OpenPecha
            </a>
          </p>
          <Link
            to="/help"
            className="text-sm flex items-center gap-2 hover:text-secondary-800 hover:underline font-medium transition-colors"
            title="Get help and documentation"
          >
            <HelpCircle className="w-4 h-4" /> Help
          </Link>
        </div>
      </div>
    );
  }