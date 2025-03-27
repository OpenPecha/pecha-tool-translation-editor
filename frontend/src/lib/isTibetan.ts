export const isTibetan = (text: string): boolean => {
  // Tibetan Unicode range: U+0F00 to U+0FFF
  const tibetanRegex = /[\u0F00-\u0FFF]/;
  return tibetanRegex.test(text);
};
