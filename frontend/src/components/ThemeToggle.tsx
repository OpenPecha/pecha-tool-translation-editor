import { useTheme, Theme } from '@/hooks/useTheme';
import { useTranslate } from '@tolgee/react';
import { MdLightMode, MdDarkMode, MdSettingsBrightness } from 'react-icons/md';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslate();

  const themeOptions = [
    {
      value: 'light' as Theme,
      label: t('theme.light', 'Light'),
      icon: <MdLightMode className="w-4 h-4" />,
    },
    {
      value: 'dark' as Theme,
      label: t('theme.dark', 'Dark'),
      icon: <MdDarkMode className="w-4 h-4" />,
    },
    {
      value: 'system' as Theme,
      label: t('theme.system', 'System'),
      icon: <MdSettingsBrightness className="w-4 h-4" />,
    },
  ];

  const selectedTheme = themeOptions.find((option) => option.value === theme) || themeOptions[2];

  return (
    <div className="flex items-center gap-2">
      <p className="text-sm">{t('theme.title', 'Theme')}</p>
      <Select
        value={theme}
        onValueChange={(value: Theme) => setTheme(value)}
      >
        <SelectTrigger className="bg-white border-2 border-gray-200 rounded-lg shadow-sm hover:border-gray-300 focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 transition-all duration-200 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:hover:border-gray-500">
          <div className="flex items-center space-x-2 gap-2">
            {selectedTheme.icon}
            <span>{selectedTheme.label}</span>
          </div>
        </SelectTrigger>
        <SelectContent className="bg-white border border-gray-200 rounded-lg shadow-xl dark:bg-gray-800 dark:border-gray-600">
          {themeOptions.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className="cursor-pointer hover:bg-secondary-50 dark:hover:bg-gray-700 focus:bg-secondary-50 dark:focus:bg-gray-700 transition-colors duration-150"
            >
              <div className="flex items-center space-x-3 py-1">
                {option.icon}
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {option.label}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default ThemeToggle;
