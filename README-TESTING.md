# Testing Setup for Pecha Translation Editor

This document describes the automated testing setup for the React frontend.

## Overview

The project uses **Vitest** as the testing framework with **React Testing Library** for component testing. Tests run automatically on every push and pull request via GitHub Actions.

## Test Structure

```
frontend/
├── src/
│   ├── test/
│   │   ├── setup.ts           # Test setup and global mocks
│   │   └── utils.tsx          # Testing utilities and custom render
│   ├── components/
│   │   └── __tests__/         # Component tests
│   ├── hooks/
│   │   └── __tests__/         # Hook tests
│   └── utils/
│       └── __tests__/         # Utility function tests
├── vitest.config.ts           # Vitest configuration
└── package.json               # Test scripts
```

## Available Scripts

- `npm test` - Run tests in watch mode
- `npm run test:run` - Run tests once
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:ui` - Run tests with UI interface
- `npm run lint` - Run ESLint checks
- `npm run build` - Build the application

## GitHub Actions Workflow

The workflow runs on:
- **Push** to `main` or `develop` branches
- **Pull requests** to `main` or `develop` branches
- Only when files in `frontend/` directory change

### Workflow Steps

1. **Multi-version testing** - Tests on Node.js 18.x and 20.x
2. **Linting** - ESLint checks
3. **Type checking** - TypeScript compilation
4. **Unit tests** - Vitest test execution
5. **Coverage** - Code coverage reporting
6. **Security audit** - npm audit for vulnerabilities
7. **Build** - Production build verification

## Test Configuration

### Vitest Configuration
- **Environment**: jsdom (for DOM testing)
- **Global test functions**: `describe`, `it`, `expect`, etc.
- **Setup files**: Global mocks and test utilities
- **Coverage threshold**: 70% for branches, functions, lines, statements

### Mocked APIs
- `window.matchMedia`
- `IntersectionObserver`
- `ResizeObserver`
- `fetch`
- Auth0 authentication
- React Query

## Writing Tests

### Component Tests
```typescript
import { render, screen, fireEvent } from '../../test/utils';
import MyComponent from '../MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### Hook Tests
```typescript
import { renderHook } from '@testing-library/react';
import { useMyHook } from '../useMyHook';

describe('useMyHook', () => {
  it('returns expected value', () => {
    const { result } = renderHook(() => useMyHook());
    expect(result.current.value).toBe('expected');
  });
});
```

## Coverage Reports

Coverage reports are:
- Displayed in terminal after running tests
- Generated as HTML in `coverage/` directory
- Uploaded to Codecov (if configured)

## CI/CD Integration

The workflow integrates with:
- **Codecov** - Coverage reporting (requires `CODECOV_TOKEN` secret)
- **Artifact storage** - Build artifacts for deployment
- **Security scanning** - Dependency vulnerability checks

## Best Practices

1. **Test naming**: Use descriptive test names
2. **Arrange-Act-Assert**: Structure tests clearly
3. **Mock external dependencies**: Use vi.mock() for APIs
4. **Test user interactions**: Use fireEvent or userEvent
5. **Accessibility**: Test with screen readers in mind
6. **Coverage**: Aim for meaningful coverage, not just numbers

## Troubleshooting

### Common Issues

1. **Import errors**: Check path aliases in vitest.config.ts
2. **Mock failures**: Ensure mocks are properly typed
3. **Async tests**: Use waitFor() for async operations
4. **Environment variables**: Set in test setup or workflow

### Debug Tests
```bash
# Run specific test file
npm test -- Button.test.tsx

# Run tests with verbose output
npm test -- --reporter=verbose

# Run tests in UI mode
npm run test:ui
```

## CI/CD Status

✅ **Test Automation Setup Complete**
- React frontend tests configured with Vitest
- GitHub Actions workflow for PR and push events
- Code coverage reporting with 70% thresholds
- ESLint integration with warnings
- TypeScript type checking
- Build verification

## Test Results Summary
- **Test Files**: 3 passed
- **Tests**: 11 passed  
- **Coverage**: Available with HTML reports
- **Build**: ✅ Successful

## Future Improvements

- [ ] Add E2E tests with Playwright
- [ ] Visual regression testing
- [ ] Performance testing
- [ ] API integration tests
- [ ] Accessibility testing automation
- [ ] Increase test coverage to 80%+
- [ ] Add integration tests for complex components
