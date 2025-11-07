import React from 'react';
import { SelectItem } from './select';

/**
 * Safe SelectItem component that prevents empty string values
 * which cause errors in Radix UI Select
 */
export const SafeSelectItem: React.FC<{
  value: string;
  disabled?: boolean;
  children: React.ReactNode;
}> = ({ value, disabled, children }) => {
  // Ensure value is never an empty string
  const safeValue = value || '__placeholder__';
  
  return (
    <SelectItem value={safeValue} disabled={disabled}>
      {children}
    </SelectItem>
  );
};

/**
 * Utility function to create safe placeholder values
 */
export const createPlaceholderValue = (type: 'loading' | 'error' | 'empty') => {
  return `__${type}__`;
};

/**
 * Utility function to check if a value is a placeholder
 */
export const isPlaceholderValue = (value: string): boolean => {
  return value.startsWith('__') && value.endsWith('__');
};

/**
 * Safe onValueChange handler that filters out placeholder values
 */
export const createSafeValueChangeHandler = <T extends string>(
  handler: (value: T) => void
) => {
  return (value: T) => {
    if (isPlaceholderValue(value)) return;
    handler(value);
  };
};
