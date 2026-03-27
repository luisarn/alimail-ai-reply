# 🤖 Alimail AI Reply Assistant

A pure Tampermonkey userscript that generates professional email replies in Alimail Webmail. No backend server required - everything runs in your browser! ✨

## ✨ Features

- 🚀 **No Backend Required**: Direct API calls to LLM providers from the browser
- 🧠 **Multiple AI Providers Supported**:
  - Alibaba DashScope (Qwen series)
  - DeepSeek (deepseek-chat, deepseek-coder)
  - Moonshot Kimi (moonshot-v1 series)
  - MiniMax (abab series)
  - OpenAI (GPT-4, GPT-4o, GPT-3.5-turbo)
  - Google Gemini (2.0 Flash, 1.5 Pro, etc.)
  - Anthropic Claude (3.5 Sonnet, etc.)
  - Custom/OpenAI-compatible endpoints
- 🎤 **Voice Input**: Speak your reply ideas and get AI-generated responses
- ✨ **Humanize Output**: Reduce AI-sounding language for more natural replies
- 🎨 **Theme-Aware UI**: Automatically matches Alimail's color theme (8 themes supported)
- 🔧 **Toolbar Integration**: AI 🤖 and Voice 🎤 buttons appear directly in Alimail's compose toolbar
- 📋 **2-Column Layout**: View original email and compose reply side by side
- 📤 **One-Click Insert**: Insert generated reply directly into the email body
- 🌍 **Multi-Language Support**: Traditional Chinese, English, Portuguese, or Mixed
- 🎯 **Tone Options**: Professional, Friendly, Concise, Detailed, or Natural
- 🔒 **Privacy**: Your API key is stored locally in Tampermonkey only

## 📦 Installation

### 1️⃣ Install Tampermonkey Extension

- 🌐 **Chrome**: [Tampermonkey Chrome Extension](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
- 🦊 **Firefox**: [Tampermonkey Firefox Extension](https://addons.mozilla.org/firefox/addon/tampermonkey/)
- 🧭 **Safari**: [Tampermonkey Safari Extension](https://apps.apple.com/app/tampermonkey/id1482490089)
- 🌀 **Edge**: [Tampermonkey Edge Extension](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)

### 2️⃣ Install the Userscript

1. 📂 Open Tampermonkey Dashboard (click the extension icon → Dashboard)
2. ➕ Click the "+" tab or "Create a new script"
3. 🗑️ Delete the default template content
4. 📋 Copy the entire content of `alimail-ai-reply.user.js` from this repository
5. 📄 Paste it into the editor
6. 💾 Press `Ctrl+S` (or `Cmd+S` on Mac) to save

### 3️⃣ Configure Your API Key ⚙️

1. 🌐 Navigate to [Alimail Webmail](https://qiye.aliyun.com/alimail/)
2. 🧩 Click on the Tampermonkey extension icon
3. ⚙️ Select "AI Reply Settings" from the menu
4. 🔑 Configure your settings:
   - **Provider**: Choose your AI provider
   - **API Key**: Enter your API key from the provider
   - **Model**: The model to use
   - **Custom API URL** (optional): For proxy or custom endpoints

#### 🎤 Voice Input Configuration (Optional)
To enable voice input, configure these settings:
   - ✅ **Enable Voice Input**: Check to enable the MIC button
   - 🎙️ **ASR Provider**: OpenAI Whisper or custom endpoint
   - 🔑 **ASR API Key**: Can use the same key as LLM if using OpenAI
   - 📝 **ASR Model**: `whisper-1` for OpenAI
   - 🌐 **ASR Language**: Auto-detect or specify a language
   - 🎯 **Voice Reply Defaults**: Set default tone and language for voice-generated replies

5. 💾 Click "Save Settings"

## 🔑 Getting API Keys

### Alibaba DashScope
1. Go to [Alibaba Cloud DashScope](https://dashscope.aliyun.com/)
2. Sign in with your Alibaba Cloud account
3. Navigate to API Key Management
4. Create a new API key

### DeepSeek
1. Go to [DeepSeek Platform](https://platform.deepseek.com/)
2. Sign up for an account
3. Go to API Keys section
4. Create a new API key

### Moonshot Kimi
1. Go to [Moonshot Platform](https://platform.moonshot.cn/)
2. Sign up for an account
3. Navigate to API Key Management
4. Create a new API key

### MiniMax
1. Go to [MiniMax Platform](https://www.minimaxi.com/)
2. Sign up for a developer account
3. Access the API Keys section
4. Generate a new API key

### 🤖 OpenAI
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign in and go to API Keys
3. Create a new secret key

### ✨ Google Gemini
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Create a new API key

### 🧠 Anthropic Claude
1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Sign up for API access
3. Generate an API key

### 🎤 Voice Recognition (ASR)
For voice input, you can use:
- **OpenAI Whisper**: Use the same OpenAI API key from above. The Whisper API is included with your OpenAI account.
- **Custom ASR**: Configure your own ASR endpoint that accepts audio files and returns transcriptions in OpenAI-compatible format.

## 🚀 Usage

### 🤖 AI Reply Assistant

1. 📧 Open Alimail Webmail and click "Reply" on any email
2. 🖱️ Click the **AI** button in the toolbar (next to the subscript button)
3. 🪟 The popup will appear with two tabs:

#### Tab 1: Custom Reply
A 2-column layout for personalized replies:
- 📄 **Left column**: Original email (auto-extracted) and your key points input
- 📝 **Right column**: Generated reply

Steps:
1. ✏️ Enter your bullet points in the text area:
   ```
   - Apologize for the delay
   - Request additional documents
   - Meeting is scheduled for Friday at 3pm
   ```
2. 🎯 Select your preferred **Tone** (Concise/Friendly/Professional/Detailed)
3. 🌍 Select **Language** (Traditional Chinese/English/Portuguese/Mixed)
4. ✨ Check **Humanize output** for a more natural, less AI-sounding reply
5. 🎬 Click **Generate Reply**
6. 📤 Click **Insert to Email** to add directly to the compose area, or **Copy** to clipboard

#### Tab 2: Smart Suggestions
AI-generated context-aware reply suggestions:
- Automatically analyzes the email content
- Generates 9 reply options organized by attitude:
  - **Neutral** (No Decision): 3 options (Concise, Friendly, Professional)
  - **Positive** (Will Do/Accept): 3 options (Concise, Friendly, Professional)
  - **Negative** (Won't Do/Decline): 3 options (Concise, Friendly, Professional)
- Click any suggestion to insert directly into the email body

### 🎤 Voice Input

Quickly compose replies by speaking instead of typing:

1. 📧 Open Alimail Webmail and click "Reply" on any email
2. 🎙️ Click the **MIC** (microphone) button in the toolbar
3. 🔴 The voice input popup will appear and **automatically start recording**
4. 🗣️ Speak your reply content naturally (e.g., "Tell them I need more time and suggest next Monday")
5. ✅ Click **Complete** when finished, or ❌ **Cancel** to discard
6. 🔄 The speech will be transcribed and sent to the AI to generate a complete reply
7. 📤 The generated reply is automatically inserted into your email

**🎤 Voice Input Requirements:**
- ✅ Microphone permission must be granted to the browser
- ✅ ASR (Automatic Speech Recognition) API key configured in settings
- ✅ Works best in a quiet environment

## 🔧 Troubleshooting

### ❌ "API key required" Error
- 🔑 Make sure you've configured your API key in Settings
- 🎯 Check that you've selected the correct provider

### 🌐 "API error" or Network Errors
- ✅ Verify your API key is correct and has not expired
- 🔍 Check if your API provider is accessible from your network
- 🏢 For corporate networks, you may need to use a custom API URL/proxy

### 🔘 AI Button Not Appearing
- 📍 Ensure you're on a `/compose` URL or reply page
- 🐛 Check browser console (F12) for errors
- 🔄 Try refreshing the page after navigating to compose

### 🎨 Theme Not Matching
- 🎨 The UI automatically detects Alimail's theme
- 🔵 If detection fails, it falls back to the default blue theme

### 🎤 Voice Input Not Working
- 🎙️ Ensure microphone permission is granted to the browser
- ⚙️ Check that Voice Input is enabled in Settings
- 🔑 Verify your ASR API key is configured correctly
- 🔒 Make sure you're using HTTPS (microphone access requires secure context)
- 🔄 Try refreshing the page after granting microphone permissions

### 🗣️ "No speech recognized" Error
- 🎙️ Speak clearly and close to the microphone
- 💳 Check that your ASR API key has sufficient credits/quota
- 🔇 Try reducing background noise

## 🔒 Privacy & Security

- 🔐 Your API key is stored locally using Tampermonkey's `GM_setValue`/`GM_getValue`
- 🌐 No data is sent to any server other than your chosen LLM/ASR provider
- 📧 Email content is only sent to the LLM API for generating replies
- 🎤 Voice recordings are sent directly to your configured ASR provider (e.g., OpenAI) and are not stored locally
- 💻 Audio is captured locally in your browser and never passes through any intermediate server

## 📜 License

This project is licensed under the GPL-3.0 License. 📄

---

Made with ❤️ for Alimail users
