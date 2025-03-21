import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const Navbar = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="bg-white shadow-sm px-6 py-2 flex justify-between items-center">
      {/* Logo and Brand */}
      <div className="flex items-center gap-3">
        <img
          alt="icon"
          src="/icon/icon.png"
          width={28}
          className="object-contain"
        />
        <Link
          to="/"
          className="text-xl font-semibold text-gray-700 hover:text-gray-900 transition"
        >
          Pecha Editor
        </Link>
      </div>

      {/* Navigation Menu */}
      <div className="flex items-center gap-4">
        {currentUser ? (
          <>
            <span className="text-gray-700 text-sm">
              Hi,{" "}
              <span className="capitalize font-medium text-gray-900">
                {currentUser.username}
              </span>
            </span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg shadow hover:bg-red-600 transition"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link
              to="/login"
              className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg shadow hover:bg-blue-600 transition"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="px-4 py-2 bg-gray-700 text-white text-sm font-medium rounded-lg shadow hover:bg-gray-800 transition"
            >
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
