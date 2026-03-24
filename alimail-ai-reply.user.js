// ==UserScript==
// @name         Alimail AI Reply Assistant (Backend-Free)
// @namespace    http://tampermonkey.net/
// @version      3.0
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
            maxTokens: 2000
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
                maxTokens: this.get('maxTokens')
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
        }
        .alimail-button:hover { box-shadow: 0 1px 2px rgba(0,0,0,0.2); }
        .alimail-button:active { transform: translateY(1px); }
        .alimail-button:disabled { opacity: 0.6; cursor: not-allowed; }
        .alimail-generate-btn { width: 100%; margin-top: auto; padding: 12px; display: flex; justify-content: center; align-items: center; }
        .alimail-copy-btn { background: #fff; color: #202124; border: 1px solid #dadce0; }
        .alimail-copy-btn:hover:not(:disabled) { background: #f8f9fa; }
        .alimail-copy-btn.copied { background: #34a853; color: #fff; border-color: #34a853; }
        .alimail-insert-btn { background: rgb(239, 73, 68) !important; }
        .alimail-insert-btn:hover:not(:disabled) { background: rgb(220, 60, 55) !important; }
        .alimail-button-row { display: flex; gap: 8px; margin-top: 16px; align-items: center; }
        .alimail-button-row .alimail-button { flex: 1; margin: 0; }
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
        .alimail-settings-footer { display: flex; gap: 12px; padding: 16px; border-top: 1px solid #e8eaed; background: #f8f9fa; }
        .alimail-settings-footer .alimail-button { flex: 1; }
        .alimail-settings-footer .alimail-button.secondary { background: #fff; color: #5f6368; border: 1px solid #dadce0; }
    `;
    GM_addStyle(styles);

    // Build prompt for LLM
    function buildPrompt(originalEmail, userInput, tone, language) {
        const toneInstructions = {
            professional: "Use a formal, professional tone appropriate for business communication.",
            friendly: "Use a warm, friendly, and approachable tone while maintaining professionalism.",
            concise: "Be brief and to the point. Avoid unnecessary words while maintaining politeness.",
            detailed: "Provide a comprehensive response with thorough explanations and context."
        };
        const languageInstructions = {
            chinese: "Write the reply in Traditional Chinese (繁體中文).",
            english: "Write the reply in English.",
            portuguese: "Write the reply in Portuguese.",
            mixed: "Use the same language as the original email, or mix languages naturally if appropriate."
        };
        return `You are a professional email assistant. Your task is to help draft a well-structured, professional email reply.

${toneInstructions[tone] || toneInstructions.professional}

${languageInstructions[language] || languageInstructions.chinese}

Original email:
---
${originalEmail || "(No original email content)"}
---

Key points to include:
${userInput}

Please write a complete, professional email reply that:
1. Addresses the sender appropriately
2. Incorporates all the key points provided
3. Maintains proper email etiquette
4. Has a clear subject line reference if applicable
5. Includes an appropriate greeting and closing

Reply:`;
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
            <div class="alimail-content">
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
                                    <option value="professional">Professional</option>
                                    <option value="friendly">Friendly</option>
                                    <option value="concise">Concise</option>
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
        `;
        document.body.appendChild(overlay);

        overlay.querySelector(".alimail-close").addEventListener("click", () => overlay.classList.remove("visible"));
        overlay.querySelector(".alimail-settings-btn").addEventListener("click", () => {
            const settingsOverlay = document.getElementById("alimail-settings-overlay");
            if (settingsOverlay) settingsOverlay.classList.add("visible");
        });
        overlay.querySelector("#alimail-generate").addEventListener("click", generateReply);
        
        applyTheme();
        return overlay;
    }

    // Create settings overlay
    function createSettingsOverlay() {
        const overlay = document.createElement("div");
        overlay.id = "alimail-settings-overlay";
        const settings = Settings.getAll();
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
            </div>
            <div class="alimail-settings-footer">
                <button class="alimail-button secondary" id="settings-cancel">Cancel</button>
                <button class="alimail-button" id="settings-save">Save Settings</button>
            </div>
        `;
        document.body.appendChild(overlay);

        overlay.querySelector(".alimail-close").addEventListener("click", () => overlay.classList.remove("visible"));
        overlay.querySelector("#settings-cancel").addEventListener("click", () => overlay.classList.remove("visible"));
        overlay.querySelector("#settings-save").addEventListener("click", () => {
            Settings.saveAll({
                provider: document.getElementById("settings-provider").value,
                apiKey: document.getElementById("settings-apikey").value,
                model: document.getElementById("settings-model").value,
                apiUrl: document.getElementById("settings-apiurl").value,
                temperature: 0.7,
                maxTokens: 2000
            });
            overlay.classList.remove("visible");
        });
        
        applyTheme();
        return overlay;
    }

    // Apply theme colors
    function applyTheme() {
        const colors = getCurrentThemeColors();
        document.querySelectorAll(".alimail-header").forEach(h => h.style.background = colors.primary);
        document.querySelectorAll(".alimail-button:not(.alimail-copy-btn):not(.secondary)").forEach(b => {
            b.style.background = colors.primary;
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

        subscriptBtn.insertAdjacentElement("afterend", separator);
        separator.insertAdjacentElement("afterend", aiBtn);

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

        return aiBtn;
    }

    function removeToolbarButton() {
        document.getElementById("alimail-ai-toolbar-btn")?.remove();
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

    // Generate reply
    async function generateReply() {
        const userInput = document.getElementById("alimail-user-input").value.trim();
        const tone = document.getElementById("alimail-tone").value;
        const language = document.getElementById("alimail-language").value;
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
            const prompt = buildPrompt(originalEmail, userInput, tone, language);
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

        function updateVisibility() {
            if (isComposePage()) {
                if (!document.getElementById("alimail-ai-toolbar-btn")) createToolbarButton();
            } else {
                removeToolbarButton();
                document.getElementById("alimail-reply-overlay")?.classList.remove("visible");
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
            }
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

})();
