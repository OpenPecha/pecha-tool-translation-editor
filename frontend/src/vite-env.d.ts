/// <reference types="vite/client" />

import { WebsocketProvider } from "y-websocket";

declare global {
	interface Window {
		yjsWebsocketInstances: WebsocketProvider[];
	}
}
