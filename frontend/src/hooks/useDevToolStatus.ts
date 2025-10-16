import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { EDITOR_READ_ONLY } from "@/utils/editorConfig";

export function useDevToolsStatus() {
	const navigate = useNavigate();
	useEffect(() => {
		let devtoolsOpened = false;

		const checkDevTools = () => {
			const widthThreshold = window.outerWidth - window.innerWidth > 100;
			const heightThreshold = window.outerHeight - window.innerHeight > 100;
			if (widthThreshold || heightThreshold) {
				devtoolsOpened = true;
			}
		};

		const interval = setInterval(() => {
			checkDevTools();
			if (devtoolsOpened && EDITOR_READ_ONLY) {
				navigate("/blocked"); // Redirect
			}
		}, 1000);

		return () => clearInterval(interval);
	}, [navigate]);

	return null;
}
