// Little Africa Analytics Chatbot - v1.0
// Floating chatbot powered by Claude API, uses portal data for context
(function() {
    'use strict';

    // ─── Inject Styles ───
    const style = document.createElement('style');
    style.textContent = `
        #la-chatbot-fab {
            position: fixed;
            bottom: 28px;
            right: 28px;
            width: 58px;
            height: 58px;
            border-radius: 50%;
            background: linear-gradient(135deg, #1a73e8 0%, #34a853 100%);
            box-shadow: 0 4px 20px rgba(26,115,232,0.45);
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
            font-size: 1.4rem;
            color: white;
        }
        #la-chatbot-fab:hover {
            transform: scale(1.08) translateY(-2px);
            box-shadow: 0 8px 28px rgba(26,115,232,0.55);
        }
        #la-chatbot-fab .fab-badge {
            position: absolute;
            top: -3px;
            right: -3px;
            width: 18px;
            height: 18px;
            background: #ea4335;
            border-radius: 50%;
            font-size: 0.65rem;
            font-weight: 700;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid white;
            color: white;
        }
        #la-chatbot-window {
            position: fixed;
            bottom: 96px;
            right: 28px;
            width: 400px;
            max-width: calc(100vw - 40px);
            height: 560px;
            max-height: calc(100vh - 140px);
            background: #ffffff;
            border-radius: 18px;
            box-shadow: 0 12px 48px rgba(0,0,0,0.18);
            display: flex;
            flex-direction: column;
            z-index: 9998;
            overflow: hidden;
            border: 1px solid rgba(0,0,0,0.08);
            transform: scale(0.95) translateY(10px);
            opacity: 0;
            pointer-events: none;
            transition: all 0.25s cubic-bezier(0.4,0,0.2,1);
        }
        #la-chatbot-window.open {
            transform: scale(1) translateY(0);
            opacity: 1;
            pointer-events: all;
        }
        .la-cb-header {
            background: linear-gradient(135deg, #1a73e8 0%, #0d47a1 100%);
            color: white;
            padding: 16px 18px;
            display: flex;
            align-items: center;
            gap: 12px;
            flex-shrink: 0;
        }
        .la-cb-header-avatar {
            width: 36px;
            height: 36px;
            background: rgba(255,255,255,0.2);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1rem;
        }
        .la-cb-header-info h4 {
            font-size: 0.95rem;
            font-weight: 700;
            margin: 0;
            font-family: 'Plus Jakarta Sans', sans-serif;
        }
        .la-cb-header-info p {
            font-size: 0.72rem;
            opacity: 0.85;
            margin: 0;
        }
        .la-cb-header-actions {
            margin-left: auto;
            display: flex;
            gap: 8px;
        }
        .la-cb-header-actions button {
            background: rgba(255,255,255,0.15);
            border: none;
            color: white;
            width: 28px;
            height: 28px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.8rem;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.15s;
        }
        .la-cb-header-actions button:hover { background: rgba(255,255,255,0.25); }
        .la-cb-messages {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 12px;
            background: #f8f9ff;
        }
        .la-cb-messages::-webkit-scrollbar { width: 4px; }
        .la-cb-messages::-webkit-scrollbar-thumb { background: #d0d7de; border-radius: 2px; }
        .la-cb-msg {
            max-width: 88%;
            font-size: 0.875rem;
            line-height: 1.5;
            font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
        }
        .la-cb-msg.bot {
            align-self: flex-start;
            background: white;
            border: 1px solid rgba(0,0,0,0.08);
            padding: 11px 14px;
            border-radius: 4px 14px 14px 14px;
            color: #202124;
            box-shadow: 0 1px 4px rgba(0,0,0,0.06);
        }
        .la-cb-msg.user {
            align-self: flex-end;
            background: linear-gradient(135deg, #1a73e8, #0d47a1);
            color: white;
            padding: 11px 14px;
            border-radius: 14px 4px 14px 14px;
        }
        .la-cb-msg.bot.thinking {
            color: #888;
            font-style: italic;
        }
        .la-cb-msg.bot .msg-label {
            font-size: 0.68rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.4px;
            color: #1a73e8;
            margin-bottom: 5px;
            display: flex;
            align-items: center;
            gap: 5px;
        }
        .la-cb-typing {
            display: flex;
            gap: 4px;
            padding: 4px 0;
        }
        .la-cb-typing span {
            width: 6px;
            height: 6px;
            background: #aaa;
            border-radius: 50%;
            animation: la-cb-bounce 1.2s infinite;
        }
        .la-cb-typing span:nth-child(2) { animation-delay: 0.2s; }
        .la-cb-typing span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes la-cb-bounce {
            0%, 60%, 100% { transform: translateY(0); }
            30% { transform: translateY(-5px); }
        }
        .la-cb-suggestions {
            padding: 10px 16px;
            background: white;
            border-top: 1px solid rgba(0,0,0,0.06);
            display: flex;
            gap: 6px;
            flex-wrap: wrap;
            flex-shrink: 0;
        }
        .la-cb-sugg-btn {
            background: #f0f4ff;
            border: 1px solid #d0d7f5;
            color: #1a73e8;
            font-size: 0.73rem;
            padding: 5px 10px;
            border-radius: 20px;
            cursor: pointer;
            font-weight: 500;
            white-space: nowrap;
            transition: all 0.15s;
            font-family: 'Plus Jakarta Sans', sans-serif;
        }
        .la-cb-sugg-btn:hover { background: #1a73e8; color: white; border-color: #1a73e8; }
        .la-cb-input-area {
            display: flex;
            gap: 8px;
            padding: 12px 14px;
            border-top: 1px solid rgba(0,0,0,0.08);
            background: white;
            align-items: flex-end;
            flex-shrink: 0;
        }
        .la-cb-input-area textarea {
            flex: 1;
            border: 1px solid #d0d7de;
            border-radius: 10px;
            padding: 9px 12px;
            font-size: 0.875rem;
            resize: none;
            font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
            outline: none;
            line-height: 1.4;
            max-height: 90px;
            overflow-y: auto;
            color: #202124;
            transition: border-color 0.2s;
        }
        .la-cb-input-area textarea:focus { border-color: #1a73e8; box-shadow: 0 0 0 3px rgba(26,115,232,0.1); }
        .la-cb-send-btn {
            width: 38px;
            height: 38px;
            border-radius: 10px;
            background: linear-gradient(135deg, #1a73e8, #0d47a1);
            border: none;
            color: white;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.9rem;
            flex-shrink: 0;
            transition: all 0.2s;
        }
        .la-cb-send-btn:hover { transform: scale(1.05); box-shadow: 0 3px 10px rgba(26,115,232,0.4); }
        .la-cb-send-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .la-cb-no-data-banner {
            background: #fff3cd;
            border: 1px solid #ffc107;
            border-radius: 8px;
            padding: 8px 12px;
            font-size: 0.78rem;
            color: #856404;
            margin: 0 16px;
            flex-shrink: 0;
        }
        @media (max-width: 480px) {
            #la-chatbot-window { width: calc(100vw - 20px); right: 10px; bottom: 80px; }
            #la-chatbot-fab { right: 18px; bottom: 18px; }
        }
    `;
    document.head.appendChild(style);

    // ─── Build DOM ───
    const fab = document.createElement('button');
    fab.id = 'la-chatbot-fab';
    fab.innerHTML = '<i class="fas fa-robot"></i><div class="fab-badge">AI</div>';
    fab.title = 'Chat with Little Africa AI';

    const win = document.createElement('div');
    win.id = 'la-chatbot-window';
    win.innerHTML = `
        <div class="la-cb-header">
            <div class="la-cb-header-avatar"><i class="fas fa-robot"></i></div>
            <div class="la-cb-header-info">
                <h4>Nexus Philip</h4>
                <p>Ask anything about your data</p>
            </div>
            <div class="la-cb-header-actions">
                <button id="la-cb-clear" title="Clear chat"><i class="fas fa-trash-alt"></i></button>
                <button id="la-cb-close" title="Close"><i class="fas fa-times"></i></button>
            </div>
        </div>
        <div class="la-cb-messages" id="la-cb-messages"></div>
        <div class="la-cb-no-data-banner" id="la-cb-no-data-banner" style="display:none">
            <i class="fas fa-exclamation-triangle"></i> No data loaded. <a href="upload.html" style="color:#1a73e8">Upload data</a> for AI insights.
        </div>
        <div class="la-cb-suggestions" id="la-cb-suggestions">
            <button class="la-cb-sugg-btn">Charter revenue 2026</button>
            <button class="la-cb-sugg-btn">Top performing associate</button>
            <button class="la-cb-sugg-btn">HR achievement rate</button>
            <button class="la-cb-sugg-btn">YoY growth</button>
        </div>
        <div class="la-cb-input-area">
            <textarea id="la-cb-input" placeholder="Ask about revenue, targets, performance..." rows="1"></textarea>
            <button class="la-cb-send-btn" id="la-cb-send"><i class="fas fa-paper-plane"></i></button>
        </div>
    `;

    document.body.appendChild(fab);
    document.body.appendChild(win);

    // ─── State ───
    let isOpen = false;
    let isLoading = false;
    let chatHistory = [];

    const messagesEl = document.getElementById('la-cb-messages');
    const inputEl = document.getElementById('la-cb-input');
    const sendBtn = document.getElementById('la-cb-send');
    const noBanner = document.getElementById('la-cb-no-data-banner');

    // ─── Welcome message ───
    function showWelcome() {
        addBotMessage(`👋 Hi! I'm your Little Africa analytics assistant.\n\nI can answer questions about your charter revenue, HR performance, telesales metrics, associate achievements, year-over-year growth, and more.\n\nWhat would you like to know?`);
    }

    // ─── Toggle ───
    fab.addEventListener('click', () => {
        isOpen = !isOpen;
        win.classList.toggle('open', isOpen);
        if (isOpen && messagesEl.children.length === 0) showWelcome();
        checkDataStatus();
    });
    document.getElementById('la-cb-close').addEventListener('click', () => {
        isOpen = false;
        win.classList.remove('open');
    });
    document.getElementById('la-cb-clear').addEventListener('click', () => {
        messagesEl.innerHTML = '';
        chatHistory = [];
        showWelcome();
    });

    // ─── Suggestions ───
    document.querySelectorAll('.la-cb-sugg-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            inputEl.value = btn.textContent;
            sendMessage();
        });
    });

    // ─── Input handling ───
    inputEl.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    sendBtn.addEventListener('click', sendMessage);
    inputEl.addEventListener('input', () => {
        inputEl.style.height = 'auto';
        inputEl.style.height = Math.min(inputEl.scrollHeight, 90) + 'px';
    });

    function checkDataStatus() {
        const hasData = typeof dataParser !== 'undefined' && dataParser.processedData && dataParser.processedData.summary;
        noBanner.style.display = hasData ? 'none' : 'block';
    }

    // ─── Message helpers ───
    function addUserMessage(text) {
        const div = document.createElement('div');
        div.className = 'la-cb-msg user';
        div.textContent = text;
        messagesEl.appendChild(div);
        scrollToBottom();
    }

    function addBotMessage(text) {
        const div = document.createElement('div');
        div.className = 'la-cb-msg bot';
        div.innerHTML = `<div class="msg-label"><i class="fas fa-robot"></i> LA Assistant</div>${escapeHtml(text).replace(/\n/g,'<br>')}`;
        messagesEl.appendChild(div);
        scrollToBottom();
        return div;
    }

    function addThinking() {
        const div = document.createElement('div');
        div.className = 'la-cb-msg bot thinking';
        div.id = 'la-cb-thinking';
        div.innerHTML = `<div class="msg-label"><i class="fas fa-robot"></i> LA Assistant</div><div class="la-cb-typing"><span></span><span></span><span></span></div>`;
        messagesEl.appendChild(div);
        scrollToBottom();
    }

    function removeThinking() {
        const el = document.getElementById('la-cb-thinking');
        if (el) el.remove();
    }

    function scrollToBottom() {
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function escapeHtml(text) {
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // ─── Core: send message ───
    async function sendMessage() {
        const text = inputEl.value.trim();
        if (!text || isLoading) return;

        inputEl.value = '';
        inputEl.style.height = 'auto';
        addUserMessage(text);

        chatHistory.push({ role: 'user', content: text });
        isLoading = true;
        sendBtn.disabled = true;
        addThinking();

        try {
            const systemPrompt = buildSystemPrompt();
            const response = await callClaudeAPI(systemPrompt, chatHistory);
            removeThinking();
            addBotMessage(response);
            chatHistory.push({ role: 'assistant', content: response });
            // Keep history manageable
            if (chatHistory.length > 20) chatHistory = chatHistory.slice(-16);
        } catch (err) {
            removeThinking();
            console.error('Chatbot error:', err);
            addBotMessage(`Sorry, I couldn't process that request. ${err.message || 'Please try again.'}`);
        } finally {
            isLoading = false;
            sendBtn.disabled = false;
        }
    }

    function buildSystemPrompt() {
        let dataSummary = '';
        try {
            if (typeof dataParser !== 'undefined' && dataParser.processedData && dataParser.processedData.summary) {
                dataSummary = dataParser.getDataSummary();
            } else {
                dataSummary = 'No data has been loaded into the portal yet.';
            }
        } catch (e) {
            dataSummary = 'Data summary unavailable.';
        }

        return `You are an intelligent analytics assistant for Little Africa's Charter & HR Analytics Portal. Your role is to help users understand their business data clearly and concisely.

CURRENT PORTAL DATA:
${dataSummary}

GUIDELINES:
- Answer questions based ONLY on the data provided above
- Be concise but thorough — use bullet points and numbers
- Format currency as "Ksh X,XXX.XX" 
- If data isn't available, say so clearly and suggest what they need to upload
- For comparisons, highlight the key insight (e.g., "Achieved X% of target")
- If asked about trends, calculate and explain the percentages
- Busbuddy net revenue is calculated at 20% of total revenue
- Be helpful, professional, and data-driven
- Don't make up numbers — only use what's in the data
- Keep responses under 250 words unless a detailed breakdown is explicitly requested`;
    }

    async function callClaudeAPI(systemPrompt, history) {
        const messages = history.map(m => ({ role: m.role, content: m.content }));

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 1000,
                system: systemPrompt,
                messages: messages
            })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error?.message || `API error ${response.status}`);
        }

        const data = await response.json();
        const text = (data.content || [])
            .filter(b => b.type === 'text')
            .map(b => b.text)
            .join('');

        if (!text) throw new Error('Empty response from AI');
        return text;
    }

})();