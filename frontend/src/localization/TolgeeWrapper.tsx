import {
  Tolgee,
  DevTools,
  TolgeeProvider,
  FormatSimple,
  useTranslate,
  useTolgee,
} from "@tolgee/react";

const apiKey = import.meta.env.VITE_APP_TOLGEE_API_KEY;
const apiUrl = import.meta.env.VITE_APP_TOLGEE_API_URL;

const tolgee = Tolgee()
  .use(DevTools())
  .use(FormatSimple())
  .init({
    apiKey: apiKey || "your-api-key-here",
    apiUrl: apiUrl || "https://app.tolgee.io",
    defaultLanguage: "en",
    fallbackLanguage: "en",
  });

const TolgeeWrapper = ({ children }: { children: React.ReactNode }) => {
  return <TolgeeProvider tolgee={tolgee}>{children}</TolgeeProvider>;
};

export { useTranslate, useTolgee };
export default TolgeeWrapper;
