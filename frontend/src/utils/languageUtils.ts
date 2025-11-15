export function getLanguageFromCode(languageCode: string): string {
  const languageCodes: Record<string, string> = {
    'en': 'English',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'es': 'Spanish',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'zh': 'Chinese',
    'bo': 'Tibetan',
    'sa': 'Sanskrit', 
    'hi': 'Hindi',
    'ne': 'Nepali',
    'ja': 'Japanese',
    'ko': 'Korean',
    'vi': 'Vietnamese',
    'th': 'Thai',
    'id': 'Indonesian',
    'ms': 'Malay',
  };
  const code = languageCode?.trim()?.toLowerCase() || '';
  return languageCodes[code] || languageCode;
}

