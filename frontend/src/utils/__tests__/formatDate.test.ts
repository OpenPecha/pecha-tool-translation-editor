import { describe, it, expect } from 'vitest';
import { formatDate } from '../../lib/formatDate';

describe('formatDate', () => {
  it('formats date correctly', () => {
    const date = '2024-01-15T10:30:00Z';
    const formatted = formatDate(date);
    
    // The function returns lowercase format
    expect(formatted).toMatch(/2024/);
    expect(formatted).toMatch(/january/);
  });

  it('handles string dates', () => {
    const dateString = '2024-01-15T10:30:00Z';
    const formatted = formatDate(dateString);
    
    expect(formatted).toMatch(/2024/);
    expect(formatted).toMatch(/january/i);
  });

  it('handles valid date formatting', () => {
    const dateString = '2024-01-01T10:30:00Z';
    const formatted = formatDate(dateString);
    
    expect(formatted).toBe('1st january 2024');
  });
});
