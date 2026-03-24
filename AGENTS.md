# Alimail AI Reply Assistant (Backend-Free)

## Project Overview

This is a **Tampermonkey userscript** that adds AI-powered email reply generation to Alimail Webmail (阿里邮箱). It operates entirely in the browser without requiring any backend server.

**Key Characteristics:**
- Pure client-side JavaScript userscript
- Zero backend dependencies
- Direct API calls to LLM providers from the browser
- Single-file architecture (`alimail-ai-reply.user.js`)

## Technology Stack

| Component | Technology |
|-----------|------------|
| Runtime | Browser (Tampermonkey extension) |
| Language | Vanilla JavaScript (ES6+) |
| Styling | CSS-in-JS (injected via `GM_addStyle`) |
| Storage | Tampermonkey's `GM_setValue`/`GM_getValue` |
| DOM API | Standard DOM APIs, MutationObserver |

## File Structure

```
/Users/luis/Workspace/alimail-ai-reply/
├── README.md                          # User-facing documentation
├── alimail-ai-reply.user.js           # Main userscript (single file)
└── AGENTS.md                          # This file
```

**Note:** This is intentionally a minimal single-file project. All code is contained in one userscript file.

## Architecture Overview

### Userscript Metadata Block
```javascript
// ==UserScript==
// @match        https://qiye.aliyun.com/alimail/*
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @run-at       document-end
// ==/UserScript==
```

### Core Modules (within the IIFE)

1. **Configuration (`CONFIG`)**
   - Default settings for providers, models, temperature, max tokens
   - Prompt templates with variable substitution (`{{TONE_INSTRUCTION}}`, etc.)
   - Provider definitions (OpenAI, Gemini, Anthropic, Custom)
   - Tone and language instruction templates

2. **Theme System (`THEMES`)**
   - 8 color themes matching Alimail's UI
   - Automatic theme detection based on computed styles

3. **Settings Manager (`Settings`)**
   - Wrapper around Tampermonkey's storage API
   - Get/set individual keys or bulk save all settings
   - Supports prompt template customization with reset button

4. **UI Components**
   - `createOverlay()` - Main dialog with tabbed interface
   - `createSettingsOverlay()` - Configuration dialog
   - `createToolbarButton()` - Injects AI button into Alimail toolbar
   - `applyTheme()` - Applies detected theme colors to UI elements

5. **Email Extraction (`extractOriginalEmail`)**
   - Scans DOM for email content via multiple selectors
   - Falls back to iframe content if needed

6. **LLM Integration (`callLLM`)**
   - Provider-specific API implementations
   - OpenAI-compatible format support
   - Error handling for API failures

7. **Text Insertion (`insertIntoEmailBody`)**
   - Locates the compose area (iframe or contenteditable)
   - Inserts generated text at cursor position

### Tabbed Interface

The main overlay features two tabs:

#### Tab 1: Custom Reply (`#tab-custom`)
- **Layout**: 2-column side-by-side
- **Left Column**: Original email display + key points input + tone/language selectors
- **Right Column**: Generated reply display with Copy/Insert buttons
- **Function**: `generateReply()` - Builds prompt from user input and generates reply

#### Tab 2: Smart Suggestions (`#tab-smart`)
- **Layout**: Single centered column
- **Content**: Auto-generated context-aware reply suggestions
- **Categories** (displayed in order):
  1. **Neutral** (No Decision) - 3 suggestions (Concise, Friendly, Professional tones)
  2. **Positive** (Will Do/Accept) - 3 suggestions (Concise, Friendly, Professional tones)
  3. **Negative** (Won't Do/Decline) - 3 suggestions (Concise, Friendly, Professional tones)
- **Function**: `generateSmartSuggestions()` - Analyzes email and generates 9 categorized suggestions

## Key Development Conventions

### Code Style
- Use single quotes for strings
- 4-space indentation
- camelCase for variables/functions, PascalCase for "classes" (objects with methods)
- Prefer `const` and `let` over `var`
- Wrap in IIFE: `(function() { 'use strict'; ... })()`

### DOM Element IDs
All custom elements use the `alimail-` prefix to avoid conflicts:
- `#alimail-reply-overlay` - Main dialog
- `#alimail-settings-overlay` - Settings dialog
- `#alimail-ai-toolbar-btn` - Toolbar button
- `#tab-custom` - Custom Reply tab panel
- `#tab-smart` - Smart Suggestions tab panel
- `#alimail-original-text` - Original email display (Custom tab)
- `#alimail-user-input` - User key points input
- `#alimail-result-container` - Generated reply display
- `#alimail-suggestions-container` - Smart suggestions list

### CSS Naming
- All CSS classes use the `alimail-` prefix
- BEM-like naming: `.alimail-button`, `.alimail-column-header`
- Tab-specific styles: `#tab-smart { flex-direction: column; align-items: center; }`

### Variable Substitution in Prompts
Template variables use double curly braces:
- `{{TONE_INSTRUCTION}}`
- `{{LANGUAGE_INSTRUCTION}}`
- `{{ORIGINAL_EMAIL}}`
- `{{USER_INPUT}}`

## Supported LLM Providers

| Provider | Default URL | Auth Header |
|----------|-------------|-------------|
| OpenAI | `https://api.openai.com/v1/chat/completions` | `Authorization: Bearer {key}` |
| Gemini | `https://generativelanguage.googleapis.com/v1beta/models` | Query param `?key={key}` |
| Anthropic | `https://api.anthropic.com/v1/messages` | `x-api-key: {key}` |
| Custom | `http://localhost:8000/v1/chat/completions` | Optional |

## Testing Instructions

Since this is a browser userscript, traditional unit tests don't apply. Testing is manual:

1. **Install Tampermonkey** extension in your browser
2. **Install the script:**
   - Open Tampermonkey Dashboard
   - Create new script
   - Copy entire content of `alimail-ai-reply.user.js`
   - Save
3. **Navigate to** `https://qiye.aliyun.com/alimail/`
4. **Configure:** Click Tampermonkey icon → "AI Reply Settings" → Enter API key
5. **Test Custom Reply Tab:** Open any email, click Reply, click AI button, enter key points, generate reply
6. **Test Smart Suggestions Tab:** Switch to Smart Suggestions tab, verify auto-generation of 9 suggestions

### Debug Tips
- Open browser console (F12) to see errors
- Check `@match` URL pattern if button doesn't appear
- Verify `GM_*` grants are present in metadata block
- Test API key directly with curl to isolate provider issues

## Deployment Process

There is no build process. The `.user.js` file is distributed directly:

1. Users copy the raw file content from the repository
2. Paste into Tampermonkey's script editor
3. Save and use immediately

**Version Management:**
- Update the `@version` field in the metadata block
- Increment major version for breaking changes (provider API changes, UI redesign)
- Increment minor version for features/bug fixes

## Security Considerations

- API keys are stored using Tampermonkey's `GM_setValue` (local to the extension)
- No data is sent to any server other than the chosen LLM provider
- Email content is only transmitted to the LLM API for generation
- The script runs only on `https://qiye.aliyun.com/alimail/*` URLs
- No external dependencies loaded from CDNs

## Modifying the Code

### Adding a New Provider
1. Add entry to `CONFIG.providers` with `name`, `defaultUrl`, `defaultModel`, `needsApiKey`
2. Add handler in `callLLM()` function with provider-specific request format

### Adding a New Theme
1. Add color object to `THEMES` object
2. Update `matchColorToTheme()` if detection logic needs changes

### Modifying Prompt Templates
- Templates are stored in `CONFIG.defaults.promptTemplate`
- Users can customize via Settings UI (saved to `GM_setValue`)
- Default templates are restored by clicking the "Reset" link in settings

### Modifying Smart Suggestions
- Prompt template is in `buildSmartSuggestionsPrompt()`
- Response parsing is in `parseSuggestions()`
- Display order is in `displaySuggestions()` (currently: Neutral, Positive, Negative)
- To change display order, reorder the category blocks in `displaySuggestions()`

## Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| AI button not appearing | Toolbar selector changed | Update `createToolbarButton()` selectors |
| Theme not matching | CSS variable changes | Update `detectTheme()` logic |
| Email not extracted | DOM structure changed | Update `extractOriginalEmail()` selectors |
| API errors | Provider API changes | Update request format in `callLLM()` |
| Smart suggestions not generating | Prompt format issues | Check `buildSmartSuggestionsPrompt()` format |
