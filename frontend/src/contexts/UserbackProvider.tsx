// UserbackProvider.tsx
import React, {
	createContext,
	useContext,
	useEffect,
	useState,
	useMemo,
} from "react";
import Userback from "@userback/widget";
import { useAuth } from "../auth/use-auth-hook";

interface UserbackProviderProps {
	children: React.ReactNode;
}

interface UserbackContextType {
	userback: any;
}

const UserbackContext = createContext<UserbackContextType>({ userback: null });

export const UserbackProvider: React.FC<UserbackProviderProps> = ({
	children,
}) => {
	const [userback, setUserback] = useState<any>(null);
	const isDevelopment = import.meta.env.VITE_ENVIRONMENT === "development";
	const { currentUser: user } = useAuth();
	useEffect(() => {
		if (isDevelopment) return;
		if (!user) return;
		const usebackId = import.meta.env.VITE_USERBACK_ID || "";
		const init = async () => {
			try {
				const options = {
					user_data: {
						id: user?.id || "anonymous",
						info: {
							name: user?.name || "Anonymous User",
							email: user?.email || "",
						},
					},
				};
				const instance = await Userback(usebackId, options);

				setUserback(instance);
			} catch (error) {
				console.error("Failed to initialize Userback:", error);
				// Add more detailed error information
				console.error("Error details:", {
					message: error?.message,
					stack: error?.stack,
					userbackId: usebackId,
					userData: user,
				});
			}
		};

		init();
	}, [user]);

	const contextValue = useMemo(() => ({ userback }), [userback]);

	return (
		<UserbackContext.Provider value={contextValue}>
			{children}
		</UserbackContext.Provider>
	);
};

export const useUserback = () => useContext(UserbackContext);
