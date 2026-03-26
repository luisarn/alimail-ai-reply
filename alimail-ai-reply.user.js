// ==UserScript==
// @name         Alimail AI Reply Assistant (Backend-Free)
// @namespace    http://tampermonkey.net/
// @version      3.2
// @description  Auto-generate professional email replies for Alimail webmail - Pure Tampermonkey, no backend required
// @author       luisarn
// @match        https://qiye.aliyun.com/alimail/*
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    const CONFIG = {
        defaults: {
            provider: 'openai',
            apiKey: '',
            model: 'gpt-4o-mini',
            apiUrl: '',
            temperature: 0.7,
            maxTokens: 2000,
            promptTemplate: `You are a professional email assistant. Your task is to help draft a well-structured, professional email reply.

{{TONE_INSTRUCTION}}

{{LANGUAGE_INSTRUCTION}}

Original email:
---
{{ORIGINAL_EMAIL}}
---

Key points to include:
{{USER_INPUT}}

Please write a complete, professional email reply that:
1. Addresses the sender appropriately
2. Incorporates all the key points provided
3. Maintains proper email etiquette
4. Includes an appropriate greeting and closing
5. Do NOT include a subject line
6. Do NOT include a signature (name, title, contact info, etc.)

Reply:`,
            toneProfessional: 'Use a formal, professional tone appropriate for business communication.',
            toneFriendly: 'Use a warm, friendly, and approachable tone while maintaining professionalism.',
            toneConcise: 'Be brief and to the point. Avoid unnecessary words while maintaining politeness.',
            toneDetailed: 'Provide a comprehensive response with thorough explanations and context.',
            langChinese: 'Write the reply in Traditional Chinese (繁體中文).',
            langEnglish: 'Write the reply in English.',
            langPortuguese: 'Write the reply in Portuguese.',
            langMixed: 'Use the same language as the original email, or mix languages naturally if appropriate.',
            // Humanize Settings
            humanizeOutput: false,
            humanizeInstruction: 'Write like a real human - avoid AI clichés like "I hope this email finds you well", "I\'m writing to", or overly flowery language. Use natural contractions (I\'m, don\'t, we\'ll) and vary sentence length. Be direct and conversational rather than robotic or formulaic.',
            // ASR Settings
            asrEnabled: true,
            asrProvider: 'openai',
            asrApiKey: '',
            asrApiUrl: 'https://api.openai.com/v1/audio/transcriptions',
            asrModel: 'whisper-1',
            asrLanguage: 'auto',
            // Voice Reply Defaults
            voiceDefaultTone: 'professional',
            voiceDefaultLanguage: 'mixed'
        },
        providers: {
            openai: {
                name: 'OpenAI',
                defaultUrl: 'https://api.openai.com/v1/chat/completions',
                defaultModel: 'gpt-4o-mini',
                models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
                needsApiKey: true
            },
            gemini: {
                name: 'Google Gemini',
                defaultUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
                defaultModel: 'gemini-2.0-flash',
                models: ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash', 'gemini-1.5-pro'],
                needsApiKey: true
            },
            anthropic: {
                name: 'Anthropic Claude',
                defaultUrl: 'https://api.anthropic.com/v1/messages',
                defaultModel: 'claude-3-5-sonnet-20241022',
                models: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
                needsApiKey: true
            },
            custom: {
                name: 'Custom/OpenAI-Compatible',
                defaultUrl: 'http://localhost:8000/v1/chat/completions',
                defaultModel: 'gpt-4o-mini',
                models: [],
                needsApiKey: false
            }
        }
    };

    const THEMES = {
        black: { primary: '#3a3a3a', primaryHover: '#2a2a2a', buttonText: '#ffffff', copyBtn: '#4a4a4a', copyBtnHover: '#3a3a3a' },
        silver: { primary: '#5f6368', primaryHover: '#494c50', buttonText: '#ffffff', copyBtn: '#1557b0', copyBtnHover: '#1557b0' },
        blue: { primary: '#4a90d9', primaryHover: '#357abd', buttonText: '#ffffff', copyBtn: '#34a853', copyBtnHover: '#2d8e47' },
        red: { primary: '#d9534f', primaryHover: '#c9302c', buttonText: '#ffffff', copyBtn: '#5cb85c', copyBtnHover: '#449d44' },
        gold: { primary: '#c4a35a', primaryHover: '#a88b4a', buttonText: '#ffffff', copyBtn: '#4a90d9', copyBtnHover: '#357abd' },
        green: { primary: '#3d8b5a', primaryHover: '#2d6b45', buttonText: '#ffffff', copyBtn: '#4a90d9', copyBtnHover: '#357abd' },
        lakeBlue: { primary: '#3a8aa5', primaryHover: '#2d6f87', buttonText: '#ffffff', copyBtn: '#34a853', copyBtnHover: '#2d8e47' },
        pink: { primary: '#d64d7a', primaryHover: '#b53a63', buttonText: '#ffffff', copyBtn: '#4a90d9', copyBtnHover: '#357abd' },
        default: { primary: '#1a73e8', primaryHover: '#1557b0', buttonText: '#ffffff', copyBtn: '#fff', copyBtnHover: '#f8f9fa' }
    };

    const Settings = {
        get(key) {
            const value = GM_getValue(key, null);
            return value !== null ? value : CONFIG.defaults[key];
        },
        set(key, value) {
            GM_setValue(key, value);
        },
        getAll() {
            return {
                provider: this.get('provider'),
                apiKey: this.get('apiKey'),
                model: this.get('model'),
                apiUrl: this.get('apiUrl'),
                temperature: this.get('temperature'),
                maxTokens: this.get('maxTokens'),
                promptTemplate: this.get('promptTemplate'),
                toneProfessional: this.get('toneProfessional'),
                toneFriendly: this.get('toneFriendly'),
                toneConcise: this.get('toneConcise'),
                toneDetailed: this.get('toneDetailed'),
                langChinese: this.get('langChinese'),
                langEnglish: this.get('langEnglish'),
                langPortuguese: this.get('langPortuguese'),
                langMixed: this.get('langMixed'),
                humanizeOutput: this.get('humanizeOutput'),
                humanizeInstruction: this.get('humanizeInstruction')
            };
        },
        getAsrAll() {
            return {
                asrEnabled: this.get('asrEnabled'),
                asrProvider: this.get('asrProvider'),
                asrApiKey: this.get('asrApiKey'),
                asrApiUrl: this.get('asrApiUrl'),
                asrModel: this.get('asrModel'),
                asrLanguage: this.get('asrLanguage'),
                voiceDefaultTone: this.get('voiceDefaultTone'),
                voiceDefaultLanguage: this.get('voiceDefaultLanguage')
            };
        },
        saveAll(settings) {
            Object.keys(settings).forEach(key => this.set(key, settings[key]));
        }
    };

    function detectTheme() {
        const appBody = document.getElementById('app-body');
        if (appBody) {
            const bgColor = window.getComputedStyle(appBody).backgroundColor;
            if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
                return matchColorToTheme(bgColor);
            }
        }
        const headers = ['.header-container', '.mail-header', '.nav-header', '.top-bar'];
        for (const sel of headers) {
            const el = document.querySelector(sel);
            if (el) {
                const bg = window.getComputedStyle(el).backgroundColor;
                if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
                    return matchColorToTheme(bg);
                }
            }
        }
        return 'default';
    }

    function matchColorToTheme(rgb) {
        const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (!m) return 'default';
        const [_, r, g, b] = m.map(Number);
        const brightness = (r + g + b) / 3;
        if (brightness > 200) return 'silver';
        return 'default';
    }

    function getCurrentThemeColors() {
        return THEMES[detectTheme()] || THEMES.default;
    }

    let generatedReplyText = '';

    // CSS Styles
    const styles = `
        #alimail-reply-overlay, #alimail-settings-overlay {
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            z-index: 999999; background: #fff; color: #333; border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 14px; display: none; border: 1px solid #e0e0e0; overflow: hidden;
        }
        #alimail-reply-overlay { width: 95vw; max-width: 900px; height: 85vh; max-height: 610px; }
        #alimail-settings-overlay { width: 90vw; max-width: 500px; max-height: 90vh; }
        @media (max-width: 768px) {
            #alimail-reply-overlay, #alimail-settings-overlay {
                width: 100vw; height: 100vh; max-width: 100vw; max-height: 100vh; border-radius: 0;
            }
            #alimail-reply-overlay .alimail-content { flex-direction: column; }
            #alimail-reply-overlay .alimail-column:first-child { border-right: none; border-bottom: 1px solid #e8eaed; max-height: 50%; }
            #alimail-reply-overlay .alimail-column { max-height: 50%; }
        }
        #alimail-reply-overlay.visible, #alimail-settings-overlay.visible {
            display: flex; flex-direction: column; animation: fadeIn 0.2s ease-out;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
            to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        .alimail-header {
            background: #1a73e8; color: #fff; font-size: 15px; font-weight: 500;
            padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;
        }
        .alimail-close, .alimail-settings-btn {
            cursor: pointer; padding: 4px 8px; border-radius: 4px;
            background: rgba(255,255,255,0.15); font-size: 14px; margin-left: 8px;
        }
        .alimail-close:hover, .alimail-settings-btn:hover { background: rgba(255,255,255,0.25); }
        .alimail-content { display: flex; flex: 1; overflow: hidden; min-height: 0; }
        .alimail-column { flex: 1; display: flex; flex-direction: column; min-width: 0; overflow: hidden; }
        .alimail-column:first-child { border-right: 1px solid #e8eaed; }
        .alimail-column-header {
            font-size: 13px; font-weight: 500; color: #5f6368; padding: 12px 16px;
            border-bottom: 1px solid #e8eaed; background: #f8f9fa; flex-shrink: 0;
        }
        .alimail-column-content { flex: 1; overflow-y: auto; padding: 16px; }
        .alimail-section { margin-bottom: 16px; }
        .alimail-label { font-size: 12px; color: #5f6368; margin-bottom: 6px; font-weight: 500; }
        .alimail-input, .alimail-select, .alimail-textarea {
            width: 100%; padding: 10px 12px; border: 1px solid #dadce0; border-radius: 4px;
            background: #fff; color: #202124; font-size: 14px; box-sizing: border-box;
        }
        .alimail-input:focus, .alimail-select:focus, .alimail-textarea:focus {
            outline: none; border-color: #1a73e8; box-shadow: 0 0 0 2px rgba(26,115,232,0.1);
        }
        .alimail-textarea { min-height: 80px; resize: vertical; font-family: inherit; }
        .alimail-textarea.large { min-height: 120px; }
        .alimail-select { margin-bottom: 16px; }
        .alimail-row { display: flex; gap: 12px; }
        .alimail-col { flex: 1; }
        .alimail-original-box {
            background: #f8f9fa; border: 1px solid #e8eaed; border-radius: 4px;
            padding: 12px; font-size: 13px; line-height: 1.5; color: #5f6368;
            max-height: 150px; overflow-y: auto; white-space: pre-wrap;
        }
        .alimail-original-placeholder { font-style: italic; color: #9aa0a6; }
        .alimail-button {
            padding: 10px 20px; border: none; border-radius: 4px; background: #1a73e8;
            color: #fff; font-size: 14px; font-weight: 500; cursor: pointer;
            transition: all 0.2s; font-family: inherit;
            display: flex; justify-content: center; align-items: center;
        }
        .alimail-button:hover { box-shadow: 0 1px 2px rgba(0,0,0,0.2); }
        .alimail-button:active { transform: translateY(1px); }
        .alimail-button:disabled { opacity: 0.6; cursor: not-allowed; }
        .alimail-generate-btn { width: 100%; margin-top: auto; padding: 12px; display: flex; justify-content: center; align-items: center; }
        .alimail-copy-btn { background: #4a4a4a; color: #fff; border: 1px solid #4a4a4a; }
        .alimail-copy-btn:hover:not(:disabled) { background: #3a3a3a; border-color: #3a3a3a; }
        .alimail-copy-btn.copied { background: #34a853; color: #fff; border-color: #34a853; }
        .alimail-insert-btn { background: rgb(239, 73, 68) !important; }
        .alimail-insert-btn:hover:not(:disabled) { background: rgb(220, 60, 55) !important; }
        .alimail-button-row { display: flex; gap: 8px; margin-top: 16px; align-items: center; }
        .alimail-button-row .alimail-button { flex: 1; margin: 0; display: flex; justify-content: center; align-items: center; }
        .alimail-result-box {
            background: #f8f9fa; border: 1px solid #e8eaed; border-radius: 4px;
            padding: 16px; font-size: 14px; line-height: 1.6; white-space: pre-wrap; min-height: 200px;
        }
        .alimail-result-placeholder { font-style: italic; color: #9aa0a6; text-align: center; padding: 60px; }
        .alimail-loading { display: flex; flex-direction: column; align-items: center; padding: 60px; color: #5f6368; }
        .alimail-loading::before {
            content: ""; width: 24px; height: 24px; border: 2px solid #e8eaed;
            border-top-color: currentColor; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 12px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .alimail-error { background: #fce8e8; border: 1px solid #f5c6cb; color: #721c24; padding: 12px; border-radius: 4px; }
        .alimail-success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 12px; border-radius: 4px; }
        #alimail-ai-toolbar-btn { display: inline-flex; align-items: center; justify-content: center; cursor: pointer; }
        #alimail-ai-toolbar-btn:hover { background-color: rgba(0,0,0,0.05); }
        #alimail-ai-toolbar-btn .ai-icon { width: 16px; height: 16px; font-size: 14px; font-weight: bold; color: #666; }
        #alimail-ai-toolbar-btn:hover .ai-icon { color: #333; }
        .alimail-settings-content { padding: 16px; overflow-y: auto; }
        .alimail-settings-section { margin-bottom: 20px; }
        .alimail-settings-section-title { font-size: 14px; font-weight: 600; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #e8eaed; }
        .alimail-form-group { margin-bottom: 16px; }
        .alimail-help-text { font-size: 12px; color: #5f6368; margin-top: 4px; }
        .alimail-settings-footer { display: flex; gap: 12px; padding: 16px; border-top: 1px solid #e8eaed; background: #f8f9fa; align-items: center; }
        .alimail-settings-footer .alimail-button { flex: 1; display: flex; justify-content: center; align-items: center; }
        .alimail-settings-footer .alimail-button.secondary { background: #fff; color: #5f6368; border: 1px solid #dadce0; }
        .alimail-tabs { display: flex; border-bottom: 1px solid #e8eaed; background: #f8f9fa; flex-shrink: 0; }
        .alimail-tab { flex: 1; padding: 12px 16px; text-align: center; cursor: pointer; font-size: 14px; color: #5f6368; border-bottom: 2px solid transparent; transition: all 0.2s; }
        .alimail-tab:hover { color: #1a73e8; background: rgba(26,115,232,0.04); }
        .alimail-tab.active { color: #1a73e8; border-bottom-color: #1a73e8; font-weight: 500; }
        .alimail-tab-panel { display: none; flex: 1; overflow: hidden; }
        .alimail-tab-panel.active { display: flex; }
        #tab-smart { flex-direction: column; align-items: center; }
        .alimail-suggestions-container { display: flex; flex-direction: column; gap: 12px; padding: 16px; overflow-y: auto; width: 100%; }
        .alimail-suggestion-item { padding: 12px 16px; background: #fff; border: 1px solid #e8eaed; border-radius: 8px; cursor: pointer; transition: all 0.2s; text-align: left; font-size: 14px; line-height: 1.5; }
        .alimail-suggestion-item:hover { border-color: #1a73e8; background: rgba(26,115,232,0.04); box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .alimail-suggestion-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 300px; color: #5f6368; text-align: center; }
        .alimail-suggestion-loading::before { content: ""; width: 24px; height: 24px; border: 2px solid #e8eaed; border-top-color: currentColor; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 12px; }
        .alimail-analyze-btn { margin: 16px; }
        .alimail-suggestion-category { font-size: 12px; font-weight: 600; color: #5f6368; text-transform: uppercase; letter-spacing: 0.5px; margin: 8px 16px 4px; }
        .alimail-suggestion-category:first-child { margin-top: 0; }
        /* Voice Input Styles */
        #alimail-voice-overlay {
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            z-index: 999999; background: #fff; color: #333; border-radius: 16px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.2);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 14px; display: none; border: 1px solid #e0e0e0;
            width: 400px; max-width: 90vw; padding: 32px;
        }
        #alimail-voice-overlay.visible { display: flex; flex-direction: column; align-items: center; animation: fadeIn 0.2s ease-out; }
        .alimail-voice-title { font-size: 18px; font-weight: 600; color: #202124; margin-bottom: 24px; text-align: center; }
        .alimail-voice-visualizer {
            width: 120px; height: 120px; border-radius: 50%;
            background: linear-gradient(135deg, #1a73e8 0%, #4285f4 100%);
            display: flex; align-items: center; justify-content: center;
            margin-bottom: 24px; position: relative;
        }
        .alimail-voice-visualizer.recording { animation: voicePulse 1.5s ease-in-out infinite; }
        @keyframes voicePulse {
            0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(26,115,232,0.4); }
            50% { transform: scale(1.05); box-shadow: 0 0 0 20px rgba(26,115,232,0); }
        }
        .alimail-voice-visualizer.processing { animation: voiceSpin 2s linear infinite; }
        @keyframes voiceSpin { to { transform: rotate(360deg); } }
        .alimail-voice-waves {
            display: flex; gap: 6px; align-items: center; justify-content: center;
            height: 60px;
        }
        .alimail-voice-wave {
            width: 6px; background: #fff; border-radius: 3px;
            animation: wave 0.6s ease-in-out infinite alternate;
        }
        .alimail-voice-wave:nth-child(1) { height: 20px; animation-delay: 0s; }
        .alimail-voice-wave:nth-child(2) { height: 40px; animation-delay: 0.1s; }
        .alimail-voice-wave:nth-child(3) { height: 30px; animation-delay: 0.2s; }
        .alimail-voice-wave:nth-child(4) { height: 50px; animation-delay: 0.3s; }
        .alimail-voice-wave:nth-child(5) { height: 25px; animation-delay: 0.4s; }
        @keyframes wave { from { transform: scaleY(0.3); } to { transform: scaleY(1); } }
        .alimail-voice-status { font-size: 14px; color: #5f6368; margin-bottom: 24px; text-align: center; }
        .alimail-voice-timer { font-size: 24px; font-weight: 600; color: #1a73e8; margin-bottom: 24px; font-variant-numeric: tabular-nums; }
        .alimail-voice-buttons { display: flex; gap: 12px; width: 100%; justify-content: center; }
        .alimail-voice-btn {
            padding: 12px 24px; border: none; border-radius: 8px;
            font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s;
            display: flex; align-items: center; gap: 8px;
        }
        .alimail-voice-btn-primary { background: #1a73e8; color: #fff; }
        .alimail-voice-btn-primary:hover { background: #1557b0; }
        .alimail-voice-btn-secondary { background: #f1f3f4; color: #5f6368; }
        .alimail-voice-btn-secondary:hover { background: #e8eaed; }
        .alimail-voice-btn-danger { background: #ea4335; color: #fff; }
        .alimail-voice-btn-danger:hover { background: #d33b28; }
        #alimail-voice-toolbar-btn { display: inline-flex; align-items: center; justify-content: center; cursor: pointer; }
        #alimail-voice-toolbar-btn:hover { background-color: rgba(0,0,0,0.05); }
        #alimail-voice-toolbar-btn .voice-icon { width: 16px; height: 16px; color: #666; }
        #alimail-voice-toolbar-btn:hover .voice-icon { color: #333; }
        #alimail-voice-toolbar-btn.recording .voice-icon { color: #ea4335; }
    `;
    GM_addStyle(styles);

    // Build prompt for LLM
    function buildPrompt(originalEmail, userInput, tone, language, humanize = null) {
        const settings = Settings.getAll();
        // Use passed humanize value if provided, otherwise use setting
        const shouldHumanize = humanize !== null ? humanize : settings.humanizeOutput;
        const toneInstructions = {
            professional: settings.toneProfessional,
            friendly: settings.toneFriendly,
            concise: settings.toneConcise,
            detailed: settings.toneDetailed
        };
        const languageInstructions = {
            chinese: settings.langChinese,
            english: settings.langEnglish,
            portuguese: settings.langPortuguese,
            mixed: settings.langMixed
        };
        
        let prompt = settings.promptTemplate
            .replace('{{TONE_INSTRUCTION}}', toneInstructions[tone] || toneInstructions.professional)
            .replace('{{LANGUAGE_INSTRUCTION}}', languageInstructions[language] || languageInstructions.chinese)
            .replace('{{ORIGINAL_EMAIL}}', originalEmail || '(No original email content)')
            .replace('{{USER_INPUT}}', userInput);

        // Append humanize instruction if enabled
        if (shouldHumanize) {
            prompt += '\n\n' + (settings.humanizeInstruction || CONFIG.defaults.humanizeInstruction);
        }

        return prompt;
    }

    // Call LLM API
    async function callLLM(prompt) {
        const settings = Settings.getAll();
        const provider = CONFIG.providers[settings.provider];
        if (!provider) throw new Error("Invalid provider: " + settings.provider);
        if (provider.needsApiKey && !settings.apiKey) {
            throw new Error("API key required. Please configure in Settings.");
        }

        const apiUrl = settings.apiUrl || provider.defaultUrl;
        
        if (settings.provider === "openai" || settings.provider === "custom") {
            const response = await fetch(apiUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + settings.apiKey
                },
                body: JSON.stringify({
                    model: settings.model || provider.defaultModel,
                    messages: [{ role: "user", content: prompt }],
                    temperature: settings.temperature,
                    max_tokens: settings.maxTokens
                })
            });
            if (!response.ok) {
                const err = await response.text();
                throw new Error("API error: " + response.status + " - " + err);
            }
            const data = await response.json();
            return data.choices[0].message.content;
        }
        
        else if (settings.provider === "gemini") {
            const modelName = settings.model || provider.defaultModel;
            const url = apiUrl + "/" + modelName + ":generateContent?key=" + settings.apiKey;
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: settings.temperature,
                        maxOutputTokens: settings.maxTokens
                    }
                })
            });
            if (!response.ok) {
                const err = await response.text();
                throw new Error("API error: " + response.status + " - " + err);
            }
            const data = await response.json();
            return data.candidates[0].content.parts[0].text;
        }
        
        else if (settings.provider === "anthropic") {
            const response = await fetch(apiUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": settings.apiKey,
                    "anthropic-version": "2023-06-01"
                },
                body: JSON.stringify({
                    model: settings.model || provider.defaultModel,
                    messages: [{ role: "user", content: prompt }],
                    max_tokens: settings.maxTokens,
                    temperature: settings.temperature
                })
            });
            if (!response.ok) {
                const err = await response.text();
                throw new Error("API error: " + response.status + " - " + err);
            }
            const data = await response.json();
            return data.content[0].text;
        }
        
        throw new Error("Unsupported provider: " + settings.provider);
    }

    // Create main overlay
    function createOverlay() {
        const overlay = document.createElement("div");
        overlay.id = "alimail-reply-overlay";
        overlay.innerHTML = `
            <div class="alimail-header">
                <span>AI Reply Assistant</span>
                <div>
                    <span class="alimail-settings-btn" title="Settings">⚙</span>
                    <span class="alimail-close" title="Close">✕</span>
                </div>
            </div>
            <div class="alimail-tabs">
                <div class="alimail-tab active" data-tab="custom">Custom Reply</div>
                <div class="alimail-tab" data-tab="smart">Smart Suggestions</div>
            </div>
            <div class="alimail-tab-panel active" id="tab-custom">
                <div class="alimail-column">
                    <div class="alimail-column-header">Compose Reply</div>
                    <div class="alimail-column-content">
                        <div class="alimail-section">
                            <div class="alimail-label">Original Email</div>
                            <div class="alimail-original-box" id="alimail-original-text">
                                <div class="alimail-original-placeholder">Loading...</div>
                            </div>
                        </div>
                        <div class="alimail-section">
                            <div class="alimail-label">Your Key Points</div>
                            <textarea class="alimail-textarea large" id="alimail-user-input" 
                                placeholder="Enter key points...
Example:
- Apologize for delay
- Request documents
- Propose Friday 2pm meeting"></textarea>
                        </div>
                        <div class="alimail-row">
                            <div class="alimail-col">
                                <div class="alimail-label">Tone</div>
                                <select class="alimail-select" id="alimail-tone">
                                    <option value="concise">Concise</option>
                                    <option value="friendly">Friendly</option>
                                    <option value="professional">Professional</option>
                                    <option value="detailed">Detailed</option>
                                </select>
                            </div>
                            <div class="alimail-col">
                                <div class="alimail-label">Language</div>
                                <select class="alimail-select" id="alimail-language">
                                    <option value="chinese" selected>繁體中文</option>
                                    <option value="english">English</option>
                                    <option value="portuguese">Portuguese</option>
                                    <option value="mixed">Mixed</option>
                                </select>
                            </div>
                        </div>
                        <div class="alimail-section">
                            <label class="alimail-checkbox-label" style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; color: #5f6368;">
                                <input type="checkbox" id="alimail-humanize" style="cursor: pointer;">
                                <span>Humanize output (less AI-sounding)</span>
                            </label>
                        </div>
                        <button class="alimail-button alimail-generate-btn" id="alimail-generate">Generate Reply</button>
                    </div>
                </div>
                <div class="alimail-column">
                    <div class="alimail-column-header">Generated Reply</div>
                    <div class="alimail-column-content" id="alimail-result-container">
                        <div class="alimail-result-placeholder">Your reply will appear here</div>
                    </div>
                </div>
            </div>
            <div class="alimail-tab-panel" id="tab-smart">
                <div class="alimail-suggestions-container" id="alimail-suggestions-container">
                    <div class="alimail-suggestion-loading">Analyzing email and generating suggestions...</div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        // Tab switching
        overlay.querySelectorAll('.alimail-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                overlay.querySelectorAll('.alimail-tab').forEach(t => t.classList.remove('active'));
                overlay.querySelectorAll('.alimail-tab-panel').forEach(p => p.classList.remove('active'));
                tab.classList.add('active');
                overlay.querySelector(`#tab-${tabName}`).classList.add('active');
                if (tabName === 'smart') {
                    generateSmartSuggestions();
                }
            });
        });

        overlay.querySelector(".alimail-close").addEventListener("click", () => overlay.classList.remove("visible"));
        overlay.querySelector(".alimail-settings-btn").addEventListener("click", () => {
            const settingsOverlay = document.getElementById("alimail-settings-overlay");
            if (settingsOverlay) settingsOverlay.classList.add("visible");
        });
        overlay.querySelector("#alimail-generate").addEventListener("click", generateReply);
        
        // Set humanize checkbox default state
        const humanizeCheckbox = overlay.querySelector("#alimail-humanize");
        if (humanizeCheckbox) {
            humanizeCheckbox.checked = Settings.get('humanizeOutput');
        }
        
        applyTheme();
        return overlay;
    }

    // Create settings overlay
    function createSettingsOverlay() {
        const overlay = document.createElement("div");
        overlay.id = "alimail-settings-overlay";
        const settings = { ...Settings.getAll(), ...Settings.getAsrAll() };
        const provider = CONFIG.providers[settings.provider];
        
        overlay.innerHTML = `
            <div class="alimail-header">
                <span>Settings</span>
                <span class="alimail-close">✕</span>
            </div>
            <div class="alimail-settings-content">
                <div class="alimail-settings-section">
                    <div class="alimail-settings-section-title">AI Provider</div>
                    <div class="alimail-form-group">
                        <div class="alimail-label">Provider</div>
                        <select class="alimail-select" id="settings-provider">
                            <option value="openai" ${settings.provider === "openai" ? "selected" : ""}>OpenAI</option>
                            <option value="gemini" ${settings.provider === "gemini" ? "selected" : ""}>Google Gemini</option>
                            <option value="anthropic" ${settings.provider === "anthropic" ? "selected" : ""}>Anthropic Claude</option>
                            <option value="custom" ${settings.provider === "custom" ? "selected" : ""}>Custom/OpenAI-Compatible</option>
                        </select>
                    </div>
                    <div class="alimail-form-group">
                        <div class="alimail-label">API Key</div>
                        <input type="password" class="alimail-input" id="settings-apikey" value="${settings.apiKey || ""}" placeholder="sk-...">
                        <div class="alimail-help-text">Your API key is stored locally in Tampermonkey.</div>
                    </div>
                    <div class="alimail-form-group">
                        <div class="alimail-label">Model</div>
                        <input type="text" class="alimail-input" id="settings-model" value="${settings.model || provider.defaultModel}" placeholder="${provider.defaultModel}">
                    </div>
                    <div class="alimail-form-group">
                        <div class="alimail-label">Custom API URL (optional)</div>
                        <input type="text" class="alimail-input" id="settings-apiurl" value="${settings.apiUrl || ""}" placeholder="${provider.defaultUrl}">
                        <div class="alimail-help-text">Leave empty to use provider default.</div>
                    </div>
                </div>
                <div class="alimail-settings-section">
                    <div class="alimail-settings-section-title">Prompt Templates</div>
                    <div class="alimail-form-group">
                        <div class="alimail-label">Main Prompt Template</div>
                        <div style="position: relative;">
                            <textarea class="alimail-textarea large" id="settings-prompt-template" placeholder="${CONFIG.defaults.promptTemplate.substring(0, 50)}...">${settings.promptTemplate || ""}</textarea>
                            <a href="#" id="settings-reset-prompt" style="position: absolute; bottom: 5px; right: 8px; font-size: 12px; color: #1a73e8; text-decoration: none;">Reset</a>
                        </div>
                        <div class="alimail-help-text">Available variables: {{TONE_INSTRUCTION}}, {{LANGUAGE_INSTRUCTION}}, {{ORIGINAL_EMAIL}}, {{USER_INPUT}}</div>
                    </div>
                    <details>
                        <summary style="cursor: pointer; color: #1a73e8; font-size: 13px; margin-bottom: 12px;">Edit Tone Instructions</summary>
                        <div class="alimail-form-group">
                            <div class="alimail-label">Professional Tone</div>
                            <input type="text" class="alimail-input" id="settings-tone-professional" value="${settings.toneProfessional || ""}">
                        </div>
                        <div class="alimail-form-group">
                            <div class="alimail-label">Friendly Tone</div>
                            <input type="text" class="alimail-input" id="settings-tone-friendly" value="${settings.toneFriendly || ""}">
                        </div>
                        <div class="alimail-form-group">
                            <div class="alimail-label">Concise Tone</div>
                            <input type="text" class="alimail-input" id="settings-tone-concise" value="${settings.toneConcise || ""}">
                        </div>
                        <div class="alimail-form-group">
                            <div class="alimail-label">Detailed Tone</div>
                            <input type="text" class="alimail-input" id="settings-tone-detailed" value="${settings.toneDetailed || ""}">
                        </div>
                    </details>
                    <details>
                        <summary style="cursor: pointer; color: #1a73e8; font-size: 13px; margin-bottom: 12px;">Edit Language Instructions</summary>
                        <div class="alimail-form-group">
                            <div class="alimail-label">Chinese</div>
                            <input type="text" class="alimail-input" id="settings-lang-chinese" value="${settings.langChinese || ""}">
                        </div>
                        <div class="alimail-form-group">
                            <div class="alimail-label">English</div>
                            <input type="text" class="alimail-input" id="settings-lang-english" value="${settings.langEnglish || ""}">
                        </div>
                        <div class="alimail-form-group">
                            <div class="alimail-label">Portuguese</div>
                            <input type="text" class="alimail-input" id="settings-lang-portuguese" value="${settings.langPortuguese || ""}">
                        </div>
                        <div class="alimail-form-group">
                            <div class="alimail-label">Mixed</div>
                            <input type="text" class="alimail-input" id="settings-lang-mixed" value="${settings.langMixed || ""}">
                        </div>
                    </details>
                </div>
                <div class="alimail-settings-section">
                    <div class="alimail-settings-section-title">✨ Humanize Output</div>
                    <div class="alimail-form-group">
                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                            <input type="checkbox" id="settings-humanize-default" ${settings.humanizeOutput ? "checked" : ""}>
                            <span>Enable humanize by default</span>
                        </label>
                        <div class="alimail-help-text">When enabled, the "Humanize output" checkbox will be checked by default when opening the AI Reply popup.</div>
                    </div>
                    <div class="alimail-form-group">
                        <div class="alimail-label">Humanize Instruction</div>
                        <textarea class="alimail-textarea" id="settings-humanize-instruction" placeholder="${CONFIG.defaults.humanizeInstruction.substring(0, 50)}...">${settings.humanizeInstruction || ""}</textarea>
                        <div class="alimail-help-text">Instruction appended to the prompt when humanize is enabled. Customize to adjust the writing style.</div>
                    </div>
                </div>
                <div class="alimail-settings-section">
                    <div class="alimail-settings-section-title">🎤 Voice Input (ASR) Settings</div>
                    <div class="alimail-form-group">
                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                            <input type="checkbox" id="settings-asr-enabled" ${settings.asrEnabled ? "checked" : ""}>
                            <span>Enable Voice Input</span>
                        </label>
                        <div class="alimail-help-text">Enable microphone button in toolbar for voice-to-text reply generation.</div>
                    </div>
                    <div class="alimail-form-group">
                        <div class="alimail-label">ASR Provider</div>
                        <select class="alimail-select" id="settings-asr-provider">
                            <option value="openai" ${settings.asrProvider === "openai" ? "selected" : ""}>OpenAI Whisper</option>
                            <option value="custom" ${settings.asrProvider === "custom" ? "selected" : ""}>Custom/OpenAI-Compatible</option>
                        </select>
                    </div>
                    <div class="alimail-form-group">
                        <div class="alimail-label">ASR API Key</div>
                        <input type="password" class="alimail-input" id="settings-asr-apikey" value="${settings.asrApiKey || ""}" placeholder="sk-...">
                        <div class="alimail-help-text">API key for speech recognition service. Can be same as LLM key if using OpenAI.</div>
                    </div>
                    <div class="alimail-form-group">
                        <div class="alimail-label">ASR Model</div>
                        <input type="text" class="alimail-input" id="settings-asr-model" value="${settings.asrModel || "whisper-1"}" placeholder="whisper-1">
                        <div class="alimail-help-text">Model name for speech recognition (e.g., whisper-1).</div>
                    </div>
                    <div class="alimail-form-group">
                        <div class="alimail-label">ASR API URL</div>
                        <input type="text" class="alimail-input" id="settings-asr-apiurl" value="${settings.asrApiUrl || ""}" placeholder="https://api.openai.com/v1/audio/transcriptions">
                        <div class="alimail-help-text">Leave empty to use OpenAI default endpoint.</div>
                    </div>
                    <div class="alimail-form-group">
                        <div class="alimail-label">ASR Language</div>
                        <select class="alimail-select" id="settings-asr-language">
                            <option value="auto" ${settings.asrLanguage === "auto" ? "selected" : ""}>Auto-detect</option>
                            <option value="zh" ${settings.asrLanguage === "zh" ? "selected" : ""}>Chinese (zh)</option>
                            <option value="en" ${settings.asrLanguage === "en" ? "selected" : ""}>English (en)</option>
                            <option value="pt" ${settings.asrLanguage === "pt" ? "selected" : ""}>Portuguese (pt)</option>
                            <option value="ja" ${settings.asrLanguage === "ja" ? "selected" : ""}>Japanese (ja)</option>
                            <option value="ko" ${settings.asrLanguage === "ko" ? "selected" : ""}>Korean (ko)</option>
                            <option value="es" ${settings.asrLanguage === "es" ? "selected" : ""}>Spanish (es)</option>
                            <option value="fr" ${settings.asrLanguage === "fr" ? "selected" : ""}>French (fr)</option>
                            <option value="de" ${settings.asrLanguage === "de" ? "selected" : ""}>German (de)</option>
                        </select>
                        <div class="alimail-help-text">Language for speech recognition. Auto-detect works well for most cases.</div>
                    </div>
                </div>
                <div class="alimail-settings-section">
                    <div class="alimail-settings-section-title">🎤 Voice Reply Defaults</div>
                    <div class="alimail-form-group">
                        <div class="alimail-label">Default Tone for Voice Replies</div>
                        <select class="alimail-select" id="settings-voice-tone">
                            <option value="concise" ${settings.voiceDefaultTone === "concise" ? "selected" : ""}>Concise</option>
                            <option value="friendly" ${settings.voiceDefaultTone === "friendly" ? "selected" : ""}>Friendly</option>
                            <option value="professional" ${settings.voiceDefaultTone === "professional" ? "selected" : ""}>Professional</option>
                            <option value="detailed" ${settings.voiceDefaultTone === "detailed" ? "selected" : ""}>Detailed</option>
                        </select>
                    </div>
                    <div class="alimail-form-group">
                        <div class="alimail-label">Default Language for Voice Replies</div>
                        <select class="alimail-select" id="settings-voice-language">
                            <option value="chinese" ${settings.voiceDefaultLanguage === "chinese" ? "selected" : ""}>繁體中文</option>
                            <option value="english" ${settings.voiceDefaultLanguage === "english" ? "selected" : ""}>English</option>
                            <option value="portuguese" ${settings.voiceDefaultLanguage === "portuguese" ? "selected" : ""}>Portuguese</option>
                            <option value="mixed" ${settings.voiceDefaultLanguage === "mixed" ? "selected" : ""}>Mixed</option>
                        </select>
                    </div>
                </div>
            </div>
            <div class="alimail-settings-footer">
                <button class="alimail-button secondary" id="settings-cancel">Cancel</button>
                <button class="alimail-button" id="settings-save">Save Settings</button>
            </div>
        `;
        document.body.appendChild(overlay);

        overlay.querySelector(".alimail-close").addEventListener("click", () => overlay.classList.remove("visible"));
        overlay.querySelector("#settings-cancel").addEventListener("click", () => overlay.classList.remove("visible"));
        overlay.querySelector("#settings-reset-prompt").addEventListener("click", (e) => {
            e.preventDefault();
            if (confirm("Reset prompt template to default? This will overwrite your current changes.")) {
                document.getElementById("settings-prompt-template").value = CONFIG.defaults.promptTemplate;
            }
        });
        overlay.querySelector("#settings-save").addEventListener("click", () => {
            Settings.saveAll({
                provider: document.getElementById("settings-provider").value,
                apiKey: document.getElementById("settings-apikey").value,
                model: document.getElementById("settings-model").value,
                apiUrl: document.getElementById("settings-apiurl").value,
                temperature: 0.7,
                maxTokens: 2000,
                promptTemplate: document.getElementById("settings-prompt-template").value,
                toneProfessional: document.getElementById("settings-tone-professional").value,
                toneFriendly: document.getElementById("settings-tone-friendly").value,
                toneConcise: document.getElementById("settings-tone-concise").value,
                toneDetailed: document.getElementById("settings-tone-detailed").value,
                langChinese: document.getElementById("settings-lang-chinese").value,
                langEnglish: document.getElementById("settings-lang-english").value,
                langPortuguese: document.getElementById("settings-lang-portuguese").value,
                langMixed: document.getElementById("settings-lang-mixed").value,
                // Humanize Settings
                humanizeOutput: document.getElementById("settings-humanize-default").checked,
                humanizeInstruction: document.getElementById("settings-humanize-instruction").value,
                // ASR Settings
                asrEnabled: document.getElementById("settings-asr-enabled").checked,
                asrProvider: document.getElementById("settings-asr-provider").value,
                asrApiKey: document.getElementById("settings-asr-apikey").value,
                asrApiUrl: document.getElementById("settings-asr-apiurl").value,
                asrModel: document.getElementById("settings-asr-model").value,
                asrLanguage: document.getElementById("settings-asr-language").value,
                voiceDefaultTone: document.getElementById("settings-voice-tone").value,
                voiceDefaultLanguage: document.getElementById("settings-voice-language").value
            });
            overlay.classList.remove("visible");
        });
        
        applyTheme();
        return overlay;
    }

    // Voice recording state
    let voiceRecorder = null;
    let voiceAudioChunks = [];
    let voiceRecordingStartTime = null;
    let voiceRecordingTimer = null;
    let voiceStream = null;
    let voiceRecordingCanceled = false;

    // Create voice input overlay
    function createVoiceOverlay() {
        const overlay = document.createElement("div");
        overlay.id = "alimail-voice-overlay";
        overlay.innerHTML = `
            <div class="alimail-voice-title">Voice Input</div>
            <div class="alimail-voice-visualizer" id="alimail-voice-visualizer">
                <div class="alimail-voice-waves" id="alimail-voice-waves" style="display: none;">
                    <div class="alimail-voice-wave"></div>
                    <div class="alimail-voice-wave"></div>
                    <div class="alimail-voice-wave"></div>
                    <div class="alimail-voice-wave"></div>
                    <div class="alimail-voice-wave"></div>
                </div>
            </div>
            <div class="alimail-voice-timer" id="alimail-voice-timer">00:00</div>
            <div class="alimail-voice-status" id="alimail-voice-status">Initializing...</div>
            <div class="alimail-voice-buttons" id="alimail-voice-buttons">
                <button class="alimail-voice-btn alimail-voice-btn-secondary" id="alimail-voice-cancel">Cancel</button>
                <button class="alimail-voice-btn alimail-voice-btn-primary" id="alimail-voice-complete">Complete</button>
            </div>
        `;
        document.body.appendChild(overlay);

        overlay.querySelector("#alimail-voice-cancel").addEventListener("click", () => {
            voiceRecordingCanceled = true;
            stopVoiceRecording();
            resetVoiceOverlay();
            overlay.classList.remove("visible");
        });

        overlay.querySelector("#alimail-voice-complete").addEventListener("click", () => {
            stopVoiceRecordingAndProcess();
        });

        // Close on escape
        overlay.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                voiceRecordingCanceled = true;
                stopVoiceRecording();
                resetVoiceOverlay();
                overlay.classList.remove("visible");
            }
        });

        // Auto-start recording when overlay becomes visible
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    if (overlay.classList.contains('visible')) {
                        // Small delay to ensure overlay is fully rendered
                        setTimeout(() => startVoiceRecording(), 100);
                    } else {
                        voiceRecordingCanceled = true;
                        stopVoiceRecording();
                    }
                }
            });
        });
        observer.observe(overlay, { attributes: true });

        return overlay;
    }

    // Start voice recording
    async function startVoiceRecording() {
        const asrSettings = Settings.getAsrAll();
        if (!asrSettings.asrEnabled) {
            alert("Voice input is disabled. Please enable it in Settings.");
            return;
        }

        try {
            voiceRecordingCanceled = false;
            voiceStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            voiceRecorder = new MediaRecorder(voiceStream);
            voiceAudioChunks = [];

            voiceRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    voiceAudioChunks.push(event.data);
                }
            };

            voiceRecorder.onstop = async () => {
                if (voiceRecordingCanceled) {
                    voiceRecorder = null;
                    return; // Don't process if canceled
                }
                // Prevent processing if overlay is already closed
                const overlay = document.getElementById("alimail-voice-overlay");
                if (!overlay || !overlay.classList.contains("visible")) {
                    voiceRecorder = null;
                    return;
                }
                const audioBlob = new Blob(voiceAudioChunks, { type: 'audio/webm' });
                await processVoiceAudio(audioBlob);
                voiceRecorder = null;
            };

            voiceRecorder.start();
            voiceRecordingStartTime = Date.now();
            
            // Update UI
            const overlay = document.getElementById("alimail-voice-overlay");
            const visualizer = overlay.querySelector("#alimail-voice-visualizer");
            const waves = overlay.querySelector("#alimail-voice-waves");
            const status = overlay.querySelector("#alimail-voice-status");

            visualizer.classList.add("recording");
            waves.style.display = "flex";
            status.textContent = "Recording... Speak now";

            // Start timer
            voiceRecordingTimer = setInterval(updateVoiceTimer, 1000);

        } catch (error) {
            console.error("Error starting voice recording:", error);
            const status = document.querySelector("#alimail-voice-status");
            if (status) status.textContent = "Error: Could not access microphone";
            alert("Could not access microphone. Please check permissions.");
        }
    }

    // Update recording timer
    function updateVoiceTimer() {
        const elapsed = Math.floor((Date.now() - voiceRecordingStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
        const seconds = (elapsed % 60).toString().padStart(2, '0');
        const timerEl = document.getElementById("alimail-voice-timer");
        if (timerEl) timerEl.textContent = `${minutes}:${seconds}`;
    }

    // Stop voice recording
    function stopVoiceRecording() {
        if (voiceRecordingTimer) {
            clearInterval(voiceRecordingTimer);
            voiceRecordingTimer = null;
        }
        if (voiceRecorder && voiceRecorder.state !== 'inactive') {
            try {
                voiceRecorder.stop();
            } catch (e) {
                // Recorder might already be stopped
            }
        }
        if (voiceStream) {
            voiceStream.getTracks().forEach(track => track.stop());
            voiceStream = null;
        }
        
        // Reset UI
        const overlay = document.getElementById("alimail-voice-overlay");
        if (overlay) {
            const visualizer = overlay.querySelector("#alimail-voice-visualizer");
            const waves = overlay.querySelector("#alimail-voice-waves");
            const status = overlay.querySelector("#alimail-voice-status");
            const buttons = overlay.querySelector("#alimail-voice-buttons");

            if (visualizer) visualizer.classList.remove("recording", "processing");
            if (waves) waves.style.display = "none";
            if (status) status.textContent = "Initializing...";
            if (buttons) buttons.style.display = "flex";
            
            const timerEl = overlay.querySelector("#alimail-voice-timer");
            if (timerEl) timerEl.textContent = "00:00";
        }
        
        voiceRecorder = null;
    }

    // Stop recording and process
    function stopVoiceRecordingAndProcess() {
        stopVoiceRecording();
        
        // Show processing state
        const overlay = document.getElementById("alimail-voice-overlay");
        const visualizer = overlay.querySelector("#alimail-voice-visualizer");
        const status = overlay.querySelector("#alimail-voice-status");
        const buttons = overlay.querySelector("#alimail-voice-buttons");

        visualizer.classList.add("processing");
        status.textContent = "Processing speech...";
        buttons.style.display = "none";
    }

    // Process voice audio through ASR
    async function processVoiceAudio(audioBlob) {
        const asrSettings = Settings.getAsrAll();
        const overlay = document.getElementById("alimail-voice-overlay");

        try {
            // Convert webm to wav for better compatibility
            const wavBlob = await convertToWav(audioBlob);
            
            // Call ASR API
            const transcript = await callAsrApi(wavBlob, asrSettings);
            
            if (transcript) {
                // Generate reply from transcript
                await generateReplyFromVoice(transcript);
            } else {
                throw new Error("No speech recognized");
            }
        } catch (error) {
            console.error("ASR Error:", error);
            if (!overlay || !overlay.classList.contains("visible")) return;
            const status = overlay.querySelector("#alimail-voice-status");
            const buttons = overlay.querySelector("#alimail-voice-buttons");
            const visualizer = overlay.querySelector("#alimail-voice-visualizer");
            if (status) status.textContent = `Error: ${error.message}`;
            if (buttons) buttons.style.display = "flex";
            if (visualizer) visualizer.classList.remove("processing");
        }
    }

    // Convert audio blob to WAV format
    async function convertToWav(webmBlob) {
        // For simplicity, we'll send the webm directly if the API supports it
        // OpenAI Whisper supports multiple formats including webm
        return webmBlob;
    }

    // Call ASR API
    async function callAsrApi(audioBlob, asrSettings) {
        const apiUrl = asrSettings.asrApiUrl || 'https://api.openai.com/v1/audio/transcriptions';
        const apiKey = asrSettings.asrApiKey;
        const model = asrSettings.asrModel || 'whisper-1';
        const language = asrSettings.asrLanguage || 'auto';

        if (!apiKey) {
            throw new Error("ASR API key not configured. Please check Settings.");
        }

        const formData = new FormData();
        formData.append('file', audioBlob, 'recording.webm');
        formData.append('model', model);
        if (language !== 'auto') {
            formData.append('language', language);
        }
        formData.append('response_format', 'json');

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`
            },
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`ASR API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        return data.text || data.transcript || '';
    }

    // Generate email reply from voice transcript
    async function generateReplyFromVoice(transcript) {
        const overlay = document.getElementById("alimail-voice-overlay");
        const status = overlay.querySelector("#alimail-voice-status");
        
        status.textContent = "Generating reply...";

        try {
            const asrSettings = Settings.getAsrAll();
            const originalEmail = extractOriginalEmail();
            const tone = asrSettings.voiceDefaultTone || 'professional';
            const language = asrSettings.voiceDefaultLanguage || 'mixed';

            const prompt = buildPrompt(originalEmail, transcript, tone, language);
            const reply = await callLLM(prompt);

            // Close voice overlay
            overlay.classList.remove("visible");
            resetVoiceOverlay();

            // Insert into email body
            const success = insertIntoEmailBody(reply);
            
            if (success) {
                // Show success notification
                showNotification('Voice reply inserted successfully!', 'success');
            } else {
                showNotification('Failed to insert reply. Please try manually.', 'error');
                // Copy to clipboard as fallback
                await navigator.clipboard.writeText(reply);
                showNotification('Reply copied to clipboard!', 'info');
            }
        } catch (error) {
            console.error("Reply generation error:", error);
            const buttons = overlay.querySelector("#alimail-voice-buttons");
            status.textContent = `Error: ${error.message}`;
            buttons.style.display = "flex";
            overlay.querySelector("#alimail-voice-visualizer").classList.remove("processing");
        }
    }

    // Reset voice overlay to initial state
    function resetVoiceOverlay() {
        const overlay = document.getElementById("alimail-voice-overlay");
        if (!overlay) return;

        const visualizer = overlay.querySelector("#alimail-voice-visualizer");
        const waves = overlay.querySelector("#alimail-voice-waves");
        const status = overlay.querySelector("#alimail-voice-status");
        const buttons = overlay.querySelector("#alimail-voice-buttons");
        const timerEl = overlay.querySelector("#alimail-voice-timer");

        if (visualizer) visualizer.classList.remove("recording", "processing");
        if (waves) waves.style.display = "none";
        if (status) status.textContent = "Initializing...";
        if (buttons) buttons.style.display = "flex";
        if (timerEl) timerEl.textContent = "00:00";
    }

    // Show notification
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 1000000;
            padding: 16px 24px; border-radius: 8px; font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15); animation: slideIn 0.3s ease-out;
            ${type === 'success' ? 'background: #d4edda; color: #155724; border: 1px solid #c3e6cb;' : ''}
            ${type === 'error' ? 'background: #fce8e8; color: #721c24; border: 1px solid #f5c6cb;' : ''}
            ${type === 'info' ? 'background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb;' : ''}
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Add notification animations
    const notificationStyles = `
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
    `;
    GM_addStyle(notificationStyles);

    // Apply theme colors
    function applyTheme() {
        const colors = getCurrentThemeColors();
        document.querySelectorAll(".alimail-header").forEach(h => h.style.background = colors.primary);
        document.querySelectorAll(".alimail-button:not(.alimail-copy-btn):not(.secondary)").forEach(b => {
            b.style.background = colors.primary;
            b.style.color = "#fff";
            b.onmouseenter = () => b.style.background = colors.primaryHover;
            b.onmouseleave = () => b.style.background = colors.primary;
        });
    }

    // Create toolbar button
    function createToolbarButton() {
        const toolbar = document.querySelector(".e_editor_toolbar");
        if (!toolbar) return null;
        
        const subscriptBtn = document.getElementById("sqm_339") || 
                            document.querySelector('[_id="subscript"]') ||
                            toolbar.querySelector(".e_i_subscript")?.closest(".e_editor_toolbar_item");
        if (!subscriptBtn) return null;

        const separator = document.createElement("div");
        separator.id = "alimail-ai-separator";
        separator.className = "e_editor_toolbar_item e_editor_toolbar_separator";
        separator.innerHTML = '<div class="e_editor_toolbar_separator_b"></div>';

        const aiBtn = document.createElement("div");
        aiBtn.id = "alimail-ai-toolbar-btn";
        aiBtn.className = "e_editor_toolbar_item e_editor_toolbar_b_wrap e_editor_toolbar_w";
        aiBtn.setAttribute("_id", "aireply");
        aiBtn.setAttribute("title", "AI Reply Assistant");
        aiBtn.innerHTML = '<b class="e_i e_i_fs16 e_i_hover ai-icon" style="font-style:normal;">AI</b>';

        // Voice button
        const voiceBtn = document.createElement("div");
        voiceBtn.id = "alimail-voice-toolbar-btn";
        voiceBtn.className = "e_editor_toolbar_item e_editor_toolbar_b_wrap e_editor_toolbar_w";
        voiceBtn.setAttribute("_id", "voicereply");
        voiceBtn.setAttribute("title", "Voice Input Reply");
        voiceBtn.innerHTML = `
            <svg class="e_i e_i_fs16 e_i_hover voice-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3Z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="22"></line>
            </svg>
        `;

        subscriptBtn.insertAdjacentElement("afterend", separator);
        separator.insertAdjacentElement("afterend", aiBtn);
        aiBtn.insertAdjacentElement("afterend", voiceBtn);

        aiBtn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            const overlay = document.getElementById("alimail-reply-overlay") || createOverlay();
            if (overlay.classList.contains("visible")) {
                overlay.classList.remove("visible");
            } else {
                updateOriginalEmail();
                overlay.classList.add("visible");
                applyTheme();
            }
        });

        voiceBtn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            const asrSettings = Settings.getAsrAll();
            if (!asrSettings.asrEnabled) {
                alert("Voice input is disabled. Please enable it in Settings and configure your ASR API key.");
                return;
            }
            const voiceOverlay = document.getElementById("alimail-voice-overlay") || createVoiceOverlay();
            voiceOverlay.classList.add("visible");
        });

        return aiBtn;
    }

    function removeToolbarButton() {
        document.getElementById("alimail-ai-toolbar-btn")?.remove();
        document.getElementById("alimail-voice-toolbar-btn")?.remove();
        document.getElementById("alimail-ai-separator")?.remove();
    }

    // Extract original email
    function extractOriginalEmail() {
        const selectors = [".email-content-body", ".mail-body", ".message-body", ".content-editable"];
        for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el && el.textContent.trim().length > 50) return el.textContent.trim();
        }
        const iframes = document.querySelectorAll("iframe");
        for (const iframe of iframes) {
            try {
                const doc = iframe.contentDocument || iframe.contentWindow.document;
                if (doc.body && doc.body.textContent.trim().length > 50) return doc.body.textContent.trim();
            } catch(e) {}
        }
        return "";
    }

    function updateOriginalEmail() {
        const text = extractOriginalEmail();
        const container = document.getElementById("alimail-original-text");
        if (container) {
            if (text) {
                container.textContent = text;
                container.dataset.fullText = text;
            } else {
                container.innerHTML = '<div class="alimail-original-placeholder">Could not extract email. Enter key points to generate reply.</div>';
                container.dataset.fullText = "";
            }
        }
    }

    // Generate smart suggestions based on email content
    async function generateSmartSuggestions() {
        const originalEmail = extractOriginalEmail();
        const suggestionsContainer = document.getElementById("alimail-suggestions-container");

        if (!originalEmail || originalEmail.length < 10) {
            suggestionsContainer.innerHTML = '<div class="alimail-error" style="padding: 40px;">No email content found to analyze. Please open an email first.</div>';
            return;
        }

        suggestionsContainer.innerHTML = '<div class="alimail-suggestion-loading">Analyzing email and generating suggestions...</div>';

        try {
            const prompt = buildSmartSuggestionsPrompt(originalEmail);
            const response = await callLLM(prompt);
            const suggestions = parseSuggestions(response);
            displaySuggestions(suggestions);
        } catch (error) {
            suggestionsContainer.innerHTML = `<div class="alimail-error" style="padding: 40px;"><strong>Error:</strong> ${error.message}</div>`;
        }
    }

    // Build prompt for smart suggestions
    function buildSmartSuggestionsPrompt(originalEmail) {
        const settings = Settings.getAll();
        const languageInstructions = {
            chinese: settings.langChinese,
            english: settings.langEnglish,
            portuguese: settings.langPortuguese,
            mixed: settings.langMixed
        };
        const lang = document.getElementById("alimail-language")?.value || "chinese";
        const langInstruction = languageInstructions[lang] || languageInstructions.chinese;

        return `You are a professional email assistant. Analyze the following email and generate 9 different reply suggestions (3 for each attitude category, using different tones).

${langInstruction}

Original email:
---
${originalEmail}
---

Generate 9 reply options organized by attitude and tone:

**POSITIVE** (Accept the request, express willingness to help):
- POSITIVE CONCISE: Brief and to-the-point acceptance
- POSITIVE FRIENDLY: Warm, friendly acceptance while maintaining professionalism
- POSITIVE PROFESSIONAL: Formal, professional acceptance

**NEUTRAL** (Don't promise anything, acknowledge without commitment):
- NEUTRAL CONCISE: Brief, non-committal acknowledgment
- NEUTRAL FRIENDLY: Warm but non-committal response
- NEUTRAL PROFESSIONAL: Formal acknowledgment without decision

**NEGATIVE** (Decline the request, express inability to help):
- NEGATIVE CONCISE: Brief, polite rejection
- NEGATIVE FRIENDLY: Warm but firm refusal
- NEGATIVE PROFESSIONAL: Formal, professional decline

Each reply should be:
- A complete, ready-to-send reply
- Appropriate for business/professional communication
- Does NOT include a subject line
- Does NOT include a signature (name, title, contact info, etc.)

Format your response exactly as follows (separated by "---SPLIT---"):

POSITIVE CONCISE: [Reply text]
---SPLIT---
POSITIVE FRIENDLY: [Reply text]
---SPLIT---
POSITIVE PROFESSIONAL: [Reply text]
---SPLIT---
NEUTRAL CONCISE: [Reply text]
---SPLIT---
NEUTRAL FRIENDLY: [Reply text]
---SPLIT---
NEUTRAL PROFESSIONAL: [Reply text]
---SPLIT---
NEGATIVE CONCISE: [Reply text]
---SPLIT---
NEGATIVE FRIENDLY: [Reply text]
---SPLIT---
NEGATIVE PROFESSIONAL: [Reply text]`;
    }

    // Parse LLM response into categorized suggestions with tones
    function parseSuggestions(response) {
        const categories = {
            positive: { concise: null, friendly: null, professional: null },
            neutral: { concise: null, friendly: null, professional: null },
            negative: { concise: null, friendly: null, professional: null }
        };
        
        // Split by separator and parse each section
        const parts = response.split(/---SPLIT---/i);
        
        parts.forEach(part => {
            const trimmed = part.trim();
            const match = trimmed.match(/^([A-Z]+)\s+([A-Z]+):\s*(.+)$/is);
            if (match) {
                const [, attitude, tone, text] = match;
                const attKey = attitude.toLowerCase();
                const toneKey = tone.toLowerCase();
                if (categories[attKey] && categories[attKey][toneKey] !== undefined) {
                    categories[attKey][toneKey] = text.trim();
                }
            }
        });
        
        return categories;
    }

    // Display categorized suggestions as clickable items
    function displaySuggestions(categories) {
        const container = document.getElementById("alimail-suggestions-container");
        const hasAny = categories.positive.concise || categories.positive.friendly || categories.positive.professional ||
                       categories.neutral.concise || categories.neutral.friendly || categories.neutral.professional ||
                       categories.negative.concise || categories.negative.friendly || categories.negative.professional;
        
        if (!hasAny) {
            container.innerHTML = '<div class="alimail-error" style="padding: 40px;">No suggestions generated. Please try again.</div>';
            return;
        }

        let html = '';
        
        // Neutral category (first)
        const hasNeutral = categories.neutral.concise || categories.neutral.friendly || categories.neutral.professional;
        if (hasNeutral) {
            html += `<div class="alimail-suggestion-category">Neutral - No Decision</div>`;
            ['concise', 'friendly', 'professional'].forEach(tone => {
                if (categories.neutral[tone]) {
                    html += `<button class="alimail-suggestion-item" data-category="neutral" data-tone="${tone}">${escapeHtml(categories.neutral[tone])}</button>`;
                }
            });
        }
        
        // Positive category (second)
        const hasPositive = categories.positive.concise || categories.positive.friendly || categories.positive.professional;
        if (hasPositive) {
            html += `<div class="alimail-suggestion-category">Positive - Will Do / Accept</div>`;
            ['concise', 'friendly', 'professional'].forEach(tone => {
                if (categories.positive[tone]) {
                    html += `<button class="alimail-suggestion-item" data-category="positive" data-tone="${tone}">${escapeHtml(categories.positive[tone])}</button>`;
                }
            });
        }
        
        // Negative category (third)
        const hasNegative = categories.negative.concise || categories.negative.friendly || categories.negative.professional;
        if (hasNegative) {
            html += `<div class="alimail-suggestion-category">Negative - Won't Do / Decline</div>`;
            ['concise', 'friendly', 'professional'].forEach(tone => {
                if (categories.negative[tone]) {
                    html += `<button class="alimail-suggestion-item" data-category="negative" data-tone="${tone}">${escapeHtml(categories.negative[tone])}</button>`;
                }
            });
        }
        
        container.innerHTML = html;

        // Add click handlers
        container.querySelectorAll('.alimail-suggestion-item').forEach(btn => {
            btn.addEventListener('click', function() {
                const category = this.dataset.category;
                const tone = this.dataset.tone;
                const text = categories[category][tone];
                const success = insertIntoEmailBody(text);
                
                // Visual feedback
                this.style.background = success ? '#d4edda' : '#fce8e8';
                this.style.borderColor = success ? '#c3e6cb' : '#f5c6cb';
                setTimeout(() => {
                    this.style.background = '';
                    this.style.borderColor = '';
                }, 1500);
            });
        });
    }

    // Generate reply
    async function generateReply() {
        const userInput = document.getElementById("alimail-user-input").value.trim();
        const tone = document.getElementById("alimail-tone").value;
        const language = document.getElementById("alimail-language").value;
        const humanizeCheckbox = document.getElementById("alimail-humanize");
        const humanize = humanizeCheckbox ? humanizeCheckbox.checked : false;
        const originalEl = document.getElementById("alimail-original-text");
        const originalEmail = originalEl?.dataset.fullText || originalEl?.textContent || "";
        const resultContainer = document.getElementById("alimail-result-container");
        const generateBtn = document.getElementById("alimail-generate");

        if (!userInput) {
            resultContainer.innerHTML = '<div class="alimail-error">Please enter key points.</div>';
            return;
        }

        generateBtn.disabled = true;
        generateBtn.textContent = "Generating...";
        resultContainer.innerHTML = '<div class="alimail-loading">Generating your reply...</div>';

        try {
            const prompt = buildPrompt(originalEmail, userInput, tone, language, humanize);
            generatedReplyText = await callLLM(prompt);
            showResult(generatedReplyText);
        } catch (error) {
            resultContainer.innerHTML = `<div class="alimail-error"><strong>Error:</strong> ${error.message}</div>`;
        } finally {
            generateBtn.disabled = false;
            generateBtn.textContent = "Generate Reply";
        }
    }

    // Show generated result
    function showResult(text) {
        const container = document.getElementById("alimail-result-container");
        container.innerHTML = `
            <div class="alimail-result-box">${escapeHtml(text)}</div>
            <div class="alimail-button-row">
                <button class="alimail-button alimail-copy-btn" id="alimail-copy">Copy</button>
                <button class="alimail-button alimail-insert-btn" id="alimail-insert">Insert to Email</button>
            </div>
        `;
        
        document.getElementById("alimail-copy").addEventListener("click", async function() {
            await navigator.clipboard.writeText(text);
            this.textContent = "Copied!";
            this.classList.add("copied");
            setTimeout(() => { this.textContent = "Copy"; this.classList.remove("copied"); }, 2000);
        });
        
        document.getElementById("alimail-insert").addEventListener("click", function() {
            const success = insertIntoEmailBody(text);
            this.textContent = success ? "Inserted!" : "Failed";
            setTimeout(() => this.textContent = "Insert to Email", 2000);
        });
    }

    // Insert text into email body
    function insertIntoEmailBody(text) {
        const iframeSelectors = [
            "iframe.e_iframe.e_scroll", ".e_editor iframe", 
            'iframe[allowtransparency="true"]'
        ];
        for (const sel of iframeSelectors) {
            const iframes = document.querySelectorAll(sel);
            for (const iframe of iframes) {
                try {
                    const doc = iframe.contentDocument || iframe.contentWindow.document;
                    const body = doc.body;
                    if (body && body.getAttribute("contenteditable") === "true") {
                        insertTextAtCursor(body, text, doc);
                        return true;
                    }
                    const editable = doc.querySelector('[contenteditable="true"]');
                    if (editable) {
                        insertTextAtCursor(editable, text, doc);
                        return true;
                    }
                } catch(e) {}
            }
        }
        const editables = document.querySelectorAll('[contenteditable="true"]');
        for (const el of editables) {
            if (el.offsetParent !== null) {
                insertTextAtCursor(el, text, document);
                return true;
            }
        }
        return false;
    }

    function insertTextAtCursor(element, text, doc) {
        element.focus();
        const win = doc.defaultView || window;
        const selection = win.getSelection();
        let range = null;
        if (selection.rangeCount > 0) {
            const r = selection.getRangeAt(0);
            if (element.contains(r.commonAncestorContainer)) range = r;
        }
        if (!range) {
            range = doc.createRange();
            range.selectNodeContents(element);
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
        }
        range.deleteContents();
        const lines = text.split("\n");
        const fragment = doc.createDocumentFragment();
        lines.forEach((line, i) => {
            if (line) fragment.appendChild(doc.createTextNode(line));
            if (i < lines.length - 1) fragment.appendChild(doc.createElement("br"));
        });
        range.insertNode(fragment);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
        element.dispatchEvent(new Event("input", { bubbles: true }));
    }

    function escapeHtml(text) {
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }

    // Check if on compose page
    function isComposePage() {
        return window.location.pathname.includes("/compose") || 
               document.querySelector(".compose-area, .e_editor, .reply-area") !== null;
    }

    // Initialize
    function init() {
        // Register menu command for settings
        GM_registerMenuCommand("AI Reply Settings", () => {
            const settingsOverlay = document.getElementById("alimail-settings-overlay") || createSettingsOverlay();
            settingsOverlay.classList.add("visible");
            applyTheme();
        });

        createOverlay();
        createSettingsOverlay();
        createVoiceOverlay();

        function updateVisibility() {
            if (isComposePage()) {
                if (!document.getElementById("alimail-ai-toolbar-btn")) createToolbarButton();
            } else {
                removeToolbarButton();
                document.getElementById("alimail-reply-overlay")?.classList.remove("visible");
                const voiceOverlay = document.getElementById("alimail-voice-overlay");
                if (voiceOverlay?.classList.contains("visible")) {
                    voiceRecordingCanceled = true;
                    stopVoiceRecording();
                    resetVoiceOverlay();
                    voiceOverlay.classList.remove("visible");
                }
            }
        }

        updateVisibility();

        let lastUrl = location.href;
        new MutationObserver(() => {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                updateVisibility();
            }
        }).observe(document, { subtree: true, childList: true });

        setInterval(updateVisibility, 1000);

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                document.getElementById("alimail-reply-overlay")?.classList.remove("visible");
                document.getElementById("alimail-settings-overlay")?.classList.remove("visible");
                const voiceOverlay = document.getElementById("alimail-voice-overlay");
                if (voiceOverlay?.classList.contains("visible")) {
                    voiceRecordingCanceled = true;
                    stopVoiceRecording();
                    resetVoiceOverlay();
                    voiceOverlay.classList.remove("visible");
                }
            }
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

})();
