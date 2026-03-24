# Alimail AI Reply Assistant (Backend-Free)

A pure Tampermonkey userscript that generates professional email replies in Alimail Webmail without requiring any backend server.

## Features

- **No Backend Required**: Direct API calls to LLM providers from the browser
- **Multiple AI Providers Supported**:
  - OpenAI (GPT-4, GPT-4o, GPT-3.5-turbo)
  - Google Gemini (2.0 Flash, 1.5 Pro, etc.)
  - Anthropic Claude (3.5 Sonnet, etc.)
  - Custom/OpenAI-compatible endpoints
- **Theme-Aware UI**: Automatically matches Alimail's color theme (8 themes supported)
- **Toolbar Integration**: AI button appears directly in Alimail's compose toolbar
- **Tabbed Interface**: Two modes for reply generation
- **Multi-Language Support**: Traditional Chinese, English, Portuguese, or Mixed
- **Tone Options**: Professional, Friendly, Concise, or Detailed
- **Privacy**: Your API key is stored locally in Tampermonkey only

## Installation

### 1. Install Tampermonkey Extension

- **Chrome**: [Tampermonkey Chrome Extension](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
- **Firefox**: [Tampermonkey Firefox Extension](https://addons.mozilla.org/firefox/addon/tampermonkey/)
- **Safari**: [Tampermonkey Safari Extension](https://apps.apple.com/app/tampermonkey/id1482490089)
- **Edge**: [Tampermonkey Edge Extension](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)

### 2. Install the Userscript

1. Open Tampermonkey Dashboard (click the extension icon → Dashboard)
2. Click the "+" tab or "Create a new script"
3. Delete the default template content
4. Copy the entire content of `alimail-ai-reply.user.js` from this repository
5. Paste it into the editor
6. Press `Ctrl+S` (or `Cmd+S` on Mac) to save

### 3. Configure Your API Key

1. Navigate to [Alimail Webmail](https://qiye.aliyun.com/alimail/)
2. Click on the Tampermonkey extension icon
3. Select "AI Reply Settings" from the menu
4. Configure your settings:
   - **Provider**: Choose your AI provider (OpenAI, Gemini, Anthropic, or Custom)
   - **API Key**: Enter your API key from the provider
   - **Model**: The model to use (e.g., `gpt-4o-mini`, `gemini-2.0-flash`)
   - **Custom API URL** (optional): For proxy or custom endpoints
5. Click "Save Settings"

## Getting API Keys

### OpenAI
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign in and go to API Keys
3. Create a new secret key

### Google Gemini
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Create a new API key

### Anthropic Claude
1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Sign up for API access
3. Generate an API key

## Usage

1. Open Alimail Webmail and click "Reply" on any email
2. Click the **AI** button in the toolbar (next to the subscript button)
3. The popup will appear with two tabs:

### Tab 1: Custom Reply
A 2-column layout for personalized replies:
- **Left column**: Original email (auto-extracted) and your key points input
- **Right column**: Generated reply

Steps:
1. Enter your bullet points in the text area:
   ```
   - Apologize for the delay
   - Request additional documents
   - Meeting is scheduled for Friday at 3pm
   ```
2. Select your preferred **Tone** (Concise/Friendly/Professional/Detailed)
3. Select **Language** (Traditional Chinese/English/Portuguese/Mixed)
4. Click **Generate Reply**
5. Click **Insert to Email** to add directly to the compose area, or **Copy** to clipboard

### Tab 2: Smart Suggestions
AI-generated context-aware reply suggestions:
- Automatically analyzes the email content
- Generates 9 reply options organized by attitude:
  - **Neutral** (No Decision): 3 options (Concise, Friendly, Professional)
  - **Positive** (Will Do/Accept): 3 options (Concise, Friendly, Professional)
  - **Negative** (Won't Do/Decline): 3 options (Concise, Friendly, Professional)
- Click any suggestion to insert directly into the email body

## Troubleshooting

### "API key required" Error
- Make sure you've configured your API key in Settings
- Check that you've selected the correct provider

### "API error" or Network Errors
- Verify your API key is correct and has not expired
- Check if your API provider is accessible from your network
- For corporate networks, you may need to use a custom API URL/proxy

### AI Button Not Appearing
- Ensure you're on a `/compose` URL or reply page
- Check browser console (F12) for errors
- Try refreshing the page after navigating to compose

### Theme Not Matching
- The UI automatically detects Alimail's theme
- If detection fails, it falls back to the default blue theme

## Privacy & Security

- Your API key is stored locally using Tampermonkey's `GM_setValue`/`GM_getValue`
- No data is sent to any server other than your chosen LLM provider
- Email content is only sent to the LLM API for generating replies

## Comparison with Backend Version

| Feature | Backend-Free (This) | Original with Backend |
|---------|---------------------|----------------------|
| Setup | Just install userscript | Requires Docker |
| Dependencies | None | Docker & Docker Compose |
| API Key Storage | Local (Tampermonkey) | Server environment |
| Network | Direct to LLM provider | Through your server |
| Cost | Only LLM API costs | LLM API + server costs |

## License

MIT License

## Credits

Based on the original [alimail-webmail-extension](https://github.com/luisarn/alimail-webmail-extension) by luisarn.
