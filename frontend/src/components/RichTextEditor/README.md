# RichTextEditor Component

A modular and maintainable rich text editor built with CodeMirror, featuring clean separation of concerns and comprehensive annotation support.

## 📁 Structure

```
RichTextEditor/
├── README.md                      # This documentation
├── index.ts                       # Main exports
├── RichTextCodeMirrorEditor.tsx   # Main component
├── types/
│   └── index.ts                   # Type definitions
├── hooks/
│   ├── index.ts                   # Hook exports
│   ├── useContentSync.ts          # Database synchronization
│   ├── useContentInitialization.ts # Content loading & initialization
│   └── useFormatting.ts           # Text formatting operations
└── extensions/
    └── codeMirrorExtensions.ts    # CodeMirror extensions & themes
```

## 🎯 Key Features

### ✨ **Clean Architecture**

- **Separated Concerns**: Each file has a single responsibility
- **Custom Hooks**: Reusable logic extracted into focused hooks
- **Type Safety**: Comprehensive TypeScript types
- **Modular Extensions**: CodeMirror configuration in dedicated files

### 🔄 **Content Management**

- **Real-time Sync**: Immediate database synchronization
- **Clean Text Display**: Users see formatted text without annotation markers
- **Legacy Support**: Handles localStorage annotation data
- **Encoding/Decoding**: Seamless conversion between display and storage formats

### 🎨 **Formatting Support**

- **Visual Formatting**: Bold, italic, underline, headers (H1-H3)
- **CSS-based Display**: Formatting shown through styling, not markers
- **Smart Headers**: Replace existing headers instead of nesting
- **Position Tracking**: Annotations stay synchronized with content changes

## 🔧 Components Overview

### **Main Component (`RichTextCodeMirrorEditor.tsx`)**

The orchestrator that:

- Manages overall state and refs
- Coordinates between hooks and extensions
- Renders the UI layout (toolbar, editor, debug info)
- Provides clean, readable component structure

### **Custom Hooks**

#### `useContentSync`

```typescript
const { currentContent, hasUnsavedChanges, syncToDatabase, onContentSaved } =
  useContentSync();
```

- Handles immediate database synchronization
- Encodes content with annotations for server
- Manages save state and triggers AutoSaveIndicator

#### `useContentInitialization`

```typescript
const { contentInitialized } = useContentInitialization(
  currentDoc,
  documentId,
  view,
  setFormatRanges
);
```

- Loads content from database/localStorage
- Decodes encoded content to clean text + annotations
- Handles timing of initial content setup
- Manages document switching and reinitialization

#### `useFormatting`

```typescript
const {
  handleBold,
  handleItalic,
  handleUnderline,
  handleHeader,
  addComment,
  addFootnote,
} = useFormatting(view, formatRanges, setFormatRanges, syncToDatabase);
```

- Provides toolbar handler functions
- Manages annotation state updates
- Handles header replacement logic
- Triggers immediate database sync after formatting

### **Extensions (`codeMirrorExtensions.ts`)**

- **Format Decorations**: Visual styling for annotations
- **Editor Theme**: Typography and appearance configuration
- **Update Listeners**: Content change detection and handling
- **Performance Optimization**: Typing state management to prevent lag

### **Types (`types/index.ts`)**

- `AnnotationRange`: Format range definitions
- `CurrentDocType`: Document data structure
- `RichTextCodeMirrorEditorProps`: Component props
- `FormatType`: Available formatting types

## 🚀 Usage

```typescript
import { RichTextCodeMirrorEditor } from "./components/RichTextEditor";

<RichTextCodeMirrorEditor
  documentId={documentId}
  isEditable={true}
  currentDoc={documentData}
/>;
```

## 🔄 Data Flow

1. **Loading**: `useContentInitialization` → Decode content → Set clean text in editor
2. **User Types**: Editor updates → `triggerSave` → `syncToDatabase` → Server
3. **User Formats**: `useFormatting` → Update annotations → `syncToDatabase` → Server
4. **Display**: Annotations shown via CSS decorations, not text markers

## 🎨 Benefits of Refactoring

### **Before Refactoring**

- ❌ 600+ line monolithic component
- ❌ Mixed concerns in single file
- ❌ Complex state management
- ❌ Difficult to test and maintain

### **After Refactoring**

- ✅ ~150 lines main component
- ✅ Separated, focused responsibilities
- ✅ Reusable custom hooks
- ✅ Clear data flow and dependencies
- ✅ Easy to test, maintain, and extend
- ✅ Better TypeScript support
- ✅ Improved developer experience

## 🧪 Testing Strategy

Each module can be tested independently:

- **Hooks**: Unit test with mock dependencies
- **Extensions**: Test CodeMirror integration
- **Main Component**: Integration tests with mocked hooks
- **Types**: TypeScript compilation verification

## 🔮 Future Enhancements

The modular structure makes it easy to add:

- New formatting types (strikethrough, code, etc.)
- Additional content sources (cloud storage, etc.)
- Enhanced synchronization strategies
- Plugin system for extensions
- Collaborative editing features
