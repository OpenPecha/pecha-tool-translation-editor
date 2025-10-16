import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import OpenPecha from "@/assets/icon.png";

const Logout: React.FC = () => {
	useEffect(() => {
		// Clear any remaining tokens when landing on logout page
		localStorage.removeItem("access_token");
		localStorage.removeItem("auth_token");
		sessionStorage.removeItem("access_token");
		sessionStorage.removeItem("auth_token");
	}, []);

	return (
		<div className="flex min-h-screen items-center justify-center bg-gray-50">
			<div className="text-center max-w-md mx-auto p-8">
				<div className="flex justify-center mb-6">
					<img src={OpenPecha} alt="OpenPecha" className="w-16 h-16" />
				</div>

				<h1 className="text-3xl font-bold text-gray-900 mb-4">
					You have been logged out
				</h1>

				<p className="text-gray-600 mb-8">
					Thank you for using OpenPecha. You have been successfully logged out
					from your account.
				</p>

				<div className="space-y-4">
					<Link
						to="/login"
						className="inline-block w-full px-6 py-3 bg-secondary-600 text-white font-medium rounded-lg shadow hover:bg-secondary-700 transition duration-200"
					>
						Sign In Again
					</Link>

					<a
						href="https://openpecha.org"
						target="_blank"
						rel="noopener noreferrer"
						className="inline-block w-full px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition duration-200"
					>
						Visit OpenPecha.org
					</a>
				</div>

				<div className="mt-8 text-sm text-gray-500">
					<p>
						If you were logged out due to an expired session, please sign in
						again to continue.
					</p>
				</div>
			</div>
		</div>
	);
};

export default Logout;
