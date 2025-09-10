import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/utils';
import { Button } from '../ui/button';

describe('Simple Component Tests', () => {
  it('renders button correctly', () => {
    render(<Button>Test Button</Button>);
    expect(screen.getByText('Test Button')).toBeInTheDocument();
  });

  it('button can be clicked', () => {
    render(<Button>Clickable</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });
});
