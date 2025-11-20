import { useState, useEffect } from "react";

function useDebounce<T>(value: T | null, delay: number): T | null {
	const [debouncedValue, setDebouncedValue] = useState<T | null>(value);

	useEffect(() => {
		const handler = setTimeout(() => {
			setDebouncedValue(value);
		}, delay);

		return () => {
			clearTimeout(handler);
		};
	}, [value, delay]);

	return debouncedValue;
}

export default useDebounce;
