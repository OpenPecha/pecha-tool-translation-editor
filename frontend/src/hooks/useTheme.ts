import { useEffect, useState } from 'react';
import useLocalStorage from './useLocalStorage';
import { useDisplaySettings } from './useDisplaySettings';

export type Theme = 'light' | 'dark' | 'system';

export function useTheme() {
  const [storedTheme, setStoredTheme] = useLocalStorage<Theme>('theme-preference', 'system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');
  const { updateSetting } = useDisplaySettings();

  // Function to get system preference
  const getSystemTheme = (): 'light' | 'dark' => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  };

  // Function to resolve theme based on stored preference
  const resolveTheme = (theme: Theme): 'light' | 'dark' => {
    if (theme === 'system') {
      return getSystemTheme();
    }
    return theme;
  };

  // Apply theme to document
  const applyTheme = (theme: 'light' | 'dark') => {
    const root = document.documentElement;
    
    if (theme === 'dark') {
      root.classList.add('dark');
      // Update display settings - the useDisplaySettings hook will handle CSS property
      const darkBackground = '#40474F';
      updateSetting('editorBackgroundColor', darkBackground);
    } else {
      root.classList.remove('dark');
      // Update display settings - the useDisplaySettings hook will handle CSS property
      const lightBackground = '#ffffff';
      updateSetting('editorBackgroundColor', lightBackground);
    }
  };

  // Set theme function
  const setTheme = (theme: Theme) => {
    setStoredTheme(theme);
    const resolved = resolveTheme(theme);
    setResolvedTheme(resolved);
    applyTheme(resolved);
  };

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      if (storedTheme === 'system') {
        const systemTheme = getSystemTheme();
        setResolvedTheme(systemTheme);
        applyTheme(systemTheme);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [storedTheme]);

  // Initialize theme on mount
  useEffect(() => {
    const resolved = resolveTheme(storedTheme);
    setResolvedTheme(resolved);
    applyTheme(resolved);
  }, [storedTheme]);

  return {
    theme: storedTheme,
    resolvedTheme,
    setTheme,
  };
}
