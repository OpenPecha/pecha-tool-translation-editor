export function injectUmami() {
  const websiteId = import.meta.env.VITE_UMAMI_WEBSITE_ID;
  const umamiSrc = import.meta.env.VITE_UMAMI_SRC;

  if (websiteId && umamiSrc) {
    const script = document.createElement("script");
    script.async = true;
    script.defer = true;
    script.dataset.websiteId = websiteId;
    script.src = umamiSrc;
    document.head.appendChild(script);
  }
}
