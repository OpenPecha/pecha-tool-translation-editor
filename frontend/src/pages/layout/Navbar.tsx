import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SearchInput from "@/components/Dashboard/SearchInput";
import NavSidebar from "@/components/Dashboard/NavSidebar";
import { useAuth } from "@/auth/use-auth-hook";
import AppLauncher from "@/components/Applauncher";
import DocIcon from "@/assets/doc_icon.png";
import ProfileArea from "@/components/ProfileArea";
const Navbar = () => {
  const { login, isAuthenticated } = useAuth();
  return (
    <nav className="  px-6 py-2 flex justify-between items-center">
      <div className="flex gap-2">
        <NavSidebar />
        <Link
          to="/"
          className="flex items-center gap-3 font-semibold text-gray-500 hover:text-gray-700 transition capitalize"
        >
          <img
            alt="icon"
            src={DocIcon}
            width={40}
            className=" object-contain"
          />
        </Link>
      </div>
      <SearchInput />
      <div className="flex items-center gap-4">
        <AppLauncher />
        {isAuthenticated ? (
          <ProfileArea />
        ) : (
          <Button
            onClick={() => login(false)}
            className="px-4 py-2 bg-secondary-500 text-white text-sm font-medium rounded-lg shadow hover:bg-secondary-600 transition"
          >
            Login
          </Button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
