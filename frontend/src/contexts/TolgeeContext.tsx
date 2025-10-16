import React, {
	createContext,
	useContext,
	ReactNode,
	Suspense,
	useCallback,
} from "react";
import {
	Tolgee,
	DevTools,
	TolgeeProvider,
	FormatSimple,
	useTranslate,
	useTolgee,
	BackendFetch,
} from "@tolgee/react";
import { LoadingFallback } from "@/pages/layout";

const apiKey = import.meta.env.VITE_APP_TOLGEE_API_KEY;
const apiUrl = import.meta.env.VITE_APP_TOLGEE_API_URL;
const environment = import.meta.env.VITE_ENVIRONMENT;
const prefix = import.meta.env.VITE_APP_TOLGEE_PREFIX;

// Available languages configuration
const AVAILABLE_LANGUAGES = ["en", "bo", "zh"] as const;
type Language = (typeof AVAILABLE_LANGUAGES)[number];
const LANGUAGE_STORAGE_KEY = "selected_language";

const getStoredLanguage = (): Language => {
	try {
		const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY) as Language;
		return AVAILABLE_LANGUAGES.includes(stored) ? stored : "en";
	} catch {
		return "en";
	}
};

const setStoredLanguage = (language: Language): void => {
	try {
		localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
	} catch (error) {
		console.warn("Failed to store language preference:", error);
	}
};
const tolgee = Tolgee()
	.use(environment === "development" ? DevTools() : undefined)
	.use(FormatSimple())
	.use(
		BackendFetch({
			prefix,
		}),
	)
	.init({
		availableLanguages: [...AVAILABLE_LANGUAGES],
		apiKey: apiKey || "your-api-key-here",
		apiUrl: apiUrl || "https://app.tolgee.io",
		defaultLanguage: getStoredLanguage(),
		fallbackLanguage: "en",
	});

// Context type definition
interface TolgeeContextType {
	currentLanguage: Language;
	availableLanguages: readonly Language[];
	changeLanguage: (language: Language) => Promise<void>;
	isLanguageLoading: boolean;
}

// Create a context for Tolgee
const TolgeeContext = createContext<TolgeeContextType | null>(null);

const TolgeeContextInner: React.FC<{ children: ReactNode }> = ({
	children,
}) => {
	const tolgeeInstance = useTolgee(["language"]);

	// Get current language with proper cleaning
	const getCurrentLanguage = useCallback((): Language => {
		const language = tolgeeInstance
			.getLanguage()
			?.replace(/['"]/g, "") as Language;
		return AVAILABLE_LANGUAGES.includes(language) ? language : "en";
	}, [tolgeeInstance]);

	// Change language with storage persistence
	const changeLanguage = useCallback(
		async (language: Language): Promise<void> => {
			if (!AVAILABLE_LANGUAGES.includes(language)) {
				console.warn(`Language "${language}" is not available`);
				return;
			}

			try {
				await tolgeeInstance.changeLanguage(language);
				setStoredLanguage(language);
			} catch (error) {
				console.error("Failed to change language:", error);
				throw error;
			}
		},
		[tolgeeInstance],
	);

	const contextValue: TolgeeContextType = {
		currentLanguage: getCurrentLanguage(),
		availableLanguages: AVAILABLE_LANGUAGES,
		changeLanguage,
		isLanguageLoading: tolgeeInstance.isLoading(),
	};

	return (
		<TolgeeContext.Provider value={contextValue}>
			{children}
		</TolgeeContext.Provider>
	);
};

const TolgeeContextProvider: React.FC<{
	children: ReactNode;
	fallback?: ReactNode;
}> = ({ children, fallback = <LoadingFallback /> }) => {
	return (
		<TolgeeProvider tolgee={tolgee} options={{ useSuspense: true }}>
			<Suspense fallback={fallback}>
				<TolgeeContextInner>{children}</TolgeeContextInner>
			</Suspense>
		</TolgeeProvider>
	);
};

export const useTolgeeContext = (): TolgeeContextType => {
	const context = useContext(TolgeeContext);
	if (!context) {
		throw new Error(
			"useTolgeeContext must be used within TolgeeContextProvider",
		);
	}
	return context;
};

export const useCurrentLanguage = (): Language => {
	const { currentLanguage } = useTolgeeContext();
	return currentLanguage;
};

export const useSetLanguage = () => {
	const { changeLanguage } = useTolgeeContext();
	return changeLanguage;
};

export const useLanguageOptions = () => {
	const { availableLanguages, currentLanguage } = useTolgeeContext();
	return {
		availableLanguages,
		currentLanguage,
		languageLabels: {
			en: "English",
			bo: "བོད་ཡིག",
			zh: "中文",
		} as Record<Language, string>,
	};
};

export { useTranslate, useTolgee, tolgee };
export type { Language };
export default TolgeeContextProvider;
