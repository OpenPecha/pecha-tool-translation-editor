# ModelSelector Component

A reusable, feature-rich model selection component that provides consistent behavior across the application.

## Features

- **Consistent UI**: Unified model selection experience across all components
- **Multiple Display Styles**: Simple, compact, and detailed views
- **Loading States**: Built-in loading and error handling
- **Accessibility**: Proper ARIA attributes and keyboard navigation
- **Type Safety**: Full TypeScript support with proper model types
- **React Query Integration**: Automatic caching and background updates

## Usage

### Basic Usage

```tsx
import { ModelSelector } from '@/components/ui/ModelSelector';
import type { ModelName } from '@/api/translate';

function MyComponent() {
  const [selectedModel, setSelectedModel] = useState<ModelName>("claude-3-5-haiku-20241022");

  return (
    <ModelSelector
      value={selectedModel}
      onValueChange={setSelectedModel}
    />
  );
}
```

### Display Styles

#### Simple
Shows only the model ID/value:
```tsx
<ModelSelector
  value={selectedModel}
  onValueChange={setSelectedModel}
  displayStyle="simple"
/>
```

#### Compact
Shows model ID and provider:
```tsx
<ModelSelector
  value={selectedModel}
  onValueChange={setSelectedModel}
  displayStyle="compact"
/>
```

#### Detailed
Shows full model information with context window:
```tsx
<ModelSelector
  value={selectedModel}
  onValueChange={setSelectedModel}
  displayStyle="detailed"
/>
```

### Size Variants

#### Small
Compact size for sidebars and toolbars:
```tsx
<ModelSelector
  value={selectedModel}
  onValueChange={setSelectedModel}
  size="sm"
  showIcon={true}
/>
```

#### Default
Standard size for forms and settings:
```tsx
<ModelSelector
  value={selectedModel}
  onValueChange={setSelectedModel}
  size="default"
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `ModelName` | - | Current selected model value (required) |
| `onValueChange` | `(value: ModelName) => void` | - | Callback when selection changes (required) |
| `disabled` | `boolean` | `false` | Whether the selector is disabled |
| `size` | `'sm' \| 'default'` | `'default'` | Size variant of the selector |
| `showIcon` | `boolean` | `false` | Whether to show the Bot icon |
| `placeholder` | `string` | `"Select model"` | Custom placeholder text |
| `displayStyle` | `'simple' \| 'compact' \| 'detailed'` | `'simple'` | Display style for model options |
| `className` | `string` | - | Custom className for the trigger |

## Display Style Examples

### Simple
```
claude-3-5-haiku-20241022
```

### Compact
```
claude-3-5-haiku-20241022
Anthropic
```

### Detailed
```
Claude 3.5 Haiku (2024-10-22)
Anthropic • 200,000 tokens
```

## Integration Examples

### ChatInput (Small with Icon)
```tsx
<ModelSelector
  value={config.modelName}
  onValueChange={(value) => handleConfigChange("modelName", value)}
  disabled={disabled || isProcessing || isTranslating}
  size="sm"
  showIcon={true}
  displayStyle="simple"
/>
```

### Settings Modal (Detailed)
```tsx
<ModelSelector
  value={config.modelName}
  onValueChange={(value) => onConfigChange("modelName", value)}
  size="default"
  displayStyle="detailed"
/>
```

## States

### Loading
Shows "Loading models..." when fetching data from the API.

### Error
Shows "Error loading models" when the API request fails.

### Empty
Shows "No models available" when no models are returned.

### Disabled
The selector is disabled during processing operations or when explicitly set.

## Benefits

- **DRY Principle**: Eliminates code duplication across components
- **Consistency**: Uniform behavior and appearance
- **Maintainability**: Single source of truth for model selection logic
- **Flexibility**: Multiple display styles and size options
- **Performance**: Built-in React Query integration with caching
- **Accessibility**: Proper ARIA support and keyboard navigation

## Migration

Replace existing model selection code:

```tsx
// Before (duplicated code)
const { models, isLoading, error } = useModels();
// ... complex rendering logic

// After (clean and simple)
<ModelSelector
  value={selectedModel}
  onValueChange={setSelectedModel}
  displayStyle="detailed"
/>
```
