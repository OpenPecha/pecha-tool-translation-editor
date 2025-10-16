const TIBETAN_RE = /[\u0F00-\u0FFF]/g; // Tibetan block
const LETTER_RE = /\p{L}/gu; // Any Unicode letter (requires modern JS)

export function checkIsTibetan(
	text: string,
	threshold = 0.6,
	lettersOnly = true,
): boolean {
	if (!text) return false;

	// Count Tibetan code points
	const tibMatches = text.match(TIBETAN_RE);
	const tibCount = tibMatches ? tibMatches.length : 0;

	// Choose denominator
	let denom: number;
	if (lettersOnly) {
		// Count letters only (ignores spaces, digits, punctuation)
		const letterMatches = text.match(LETTER_RE);
		denom = letterMatches ? letterMatches.length : 0;
	} else {
		// Ignore whitespace only (keeps digits/punct)
		denom = text.replace(/\s+/g, "").length;
	}

	if (denom === 0) return false;
	return tibCount / denom >= threshold;
}
