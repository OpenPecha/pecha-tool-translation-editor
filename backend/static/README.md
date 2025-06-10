# Static Assets

This directory contains static assets used by the Pecha PDF export functionality.

## Files

### pecha-frame.png

The background frame image used for Pecha-style PDF generation.

### MonlamTBslim.woff (Required for Tibetan text)

**You need to add this file manually.**

To support Tibetan text rendering in Pecha PDFs:

1. Obtain the `MonlamTBslim.woff` font file
2. Place it in this directory: `backend/static/MonlamTBslim.woff`
3. The system will automatically use this font for Tibetan text

If the font file is missing, Tibetan text will fall back to the default serif font.

## Font Features

- **Tibetan text**: Uses MonlamTBslim font if available, splits on syllable separator (་)
- **Non-Tibetan text**: Uses serif font with bold styling, splits on spaces
- **Auto-detection**: Language is detected automatically based on Unicode characters
