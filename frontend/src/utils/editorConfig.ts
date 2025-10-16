export const MAX_HEADING_LEVEL = 20;
export const EDITOR_READ_ONLY = false;
export const EDITOR_ENTER_ONLY = false;
export const ENABLE_LIVE_COLLABORATION =
  import.meta.env.VITE_ENVIRONMENT !== "development";
export const ENABLE_CURSORS = ENABLE_LIVE_COLLABORATION;
export const MAX_TEXT_LENGTH_FOR_REALTIME_COLLABORATION = 150000;

const HISTORY_CONFIG = {
	delay: 2000,
	maxStack: 500,
	userOnly: false,
};

export const editor_config = {
	MAX_HEADING_LEVEL,
	EDITOR_READ_ONLY,
	EDITOR_ENTER_ONLY,
	HISTORY_CONFIG,
	ENABLE_CURSORS,
	MAX_TEXT_LENGTH_FOR_REALTIME_COLLABORATION,
};
