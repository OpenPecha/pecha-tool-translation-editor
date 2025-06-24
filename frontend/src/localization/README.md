# Localization System

This project supports internationalization (i18n) with English (en) and Tibetan (bo) languages.

## File Structure

```
src/localization/
├── data/
│   ├── en.json          # English translations
│   └── bo.json          # Tibetan translations
├── i18n.ts              # i18n configuration
└── README.md            # This file
```

## Usage

### Basic Translation

```tsx
import { useTranslation } from "react-i18next";

const MyComponent = () => {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t("common.create")}</h1>
      <p>{t("documents.documentTitle")}</p>
    </div>
  );
};
```

### Language Switching

```tsx
import { useTranslation } from "react-i18next";

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div>
      <button onClick={() => changeLanguage("en")}>English</button>
      <button onClick={() => changeLanguage("bo")}>བོད་ཡིག</button>
    </div>
  );
};
```

### Available Translation Keys

The translation files are organized into logical sections:

#### Common Actions

- `common.search` - Search
- `common.save` - Save
- `common.cancel` - Cancel
- `common.delete` - Delete
- `common.edit` - Edit
- `common.create` - Create
- `common.update` - Update
- `common.close` - Close

#### Navigation

- `navigation.dashboard` - Dashboard
- `navigation.documents` - Documents
- `navigation.projects` - Projects
- `navigation.settings` - Settings

#### Documents

- `documents.searchDocuments` - Search documents
- `documents.createDocument` - Create Document
- `documents.documentTitle` - Document Title
- `documents.saveDocument` - Save Document

#### Projects

- `projects.createProject` - Create Project
- `projects.projectName` - Project Name
- `projects.projectDescription` - Project Description

#### Editor Tools

- `editor.bold` - Bold
- `editor.italic` - Italic
- `editor.underline` - Underline
- `editor.highlight` - Highlight
- `editor.undo` - Undo
- `editor.redo` - Redo

#### Comments

- `comments.addComment` - Add Comment
- `comments.editComment` - Edit Comment
- `comments.deleteComment` - Delete Comment

#### Translation

- `translation.translate` - Translate
- `translation.translationProgress` - Translation Progress
- `translation.sourceLanguage` - Source Language
- `translation.targetLanguage` - Target Language

#### Authentication

- `auth.login` - Login
- `auth.logout` - Logout
- `auth.signup` - Sign Up
- `auth.email` - Email
- `auth.password` - Password

#### Error Messages

- `errors.networkError` - Network error occurred
- `errors.unauthorized` - Unauthorized access
- `errors.notFound` - Resource not found
- `errors.serverError` - Server error occurred

## Adding New Translations

1. Add the new key to both `en.json` and `bo.json` files
2. Use the nested structure for organization (e.g., `section.subsection.key`)
3. Ensure both languages have the same key structure

### Example

```json
// en.json
{
  "newSection": {
    "newKey": "New English Text"
  }
}

// bo.json
{
  "newSection": {
    "newKey": "བོད་ཡིག་གསར་པ།"
  }
}
```

## Configuration

The i18n configuration is set up in `i18n.ts` with:

- Default language: English (en)
- Fallback language: English (en)
- Debug mode enabled for development
- JSON module resolution enabled in TypeScript

## Components

- `LanguageSwitcher.tsx` - Component for switching between languages
- `TranslationExample.tsx` - Example component demonstrating usage
