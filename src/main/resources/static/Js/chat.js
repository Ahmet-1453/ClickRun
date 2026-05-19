/* ================================================
   Click&Run — chat.js v2.0 COMPLETE
   ─────────────────────────────────────────────────
   WhatsApp-style chat widget
   - Sağ alt köşe yuvarlak widget
   - WebSocket (SockJS + STOMP)
   - Kullanıcı arama
   - Özel mesajlaşma (1-1)
   - Tarih başlıkları
   - Mesaj gönderim saati
   - Mesaj silme
   - Read/unread indicator
   - Online/offline status
   ================================================ */
(function () {
    'use strict';

    const token = localStorage.getItem('jwtToken');
    if (!token) return;

    /* ── State ───────────────────────────────────── */
    let stompClient     = null;
    let currentUser     = null;
    let activeChat      = null; // null = genel, email = özel
    let users           = [];
    let messages        = {};
    let unreadCount     = {};
    let isWidgetOpen    = false;
    let isChatOpen      = false;
    let isConnected     = false;

    /* ── DOM Elements ────────────────────────────── */
    let widgetBtn, widgetBadge, chatWindow, chatHeader, chatBody,
        chatInput, userList, messageContainer, searchInput;

    /* ── JWT Parse ───────────────────────────────── */
    function parseJWT(tkn) {
        try {
            const base64 = tkn.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
            return JSON.parse(atob(base64));
        } catch { return {}; }
    }

    /* ── Init ────────────────────────────────────── */
    function init() {
        const payload = parseJWT(token);
        currentUser = payload.sub;
        if (!currentUser) return;

        injectWidget();
        loadUsers();
        connectWebSocket();
        attachEventListeners();
    }

    /* ══════════════════════════════════════════════
       WIDGET HTML INJECTION
    ══════════════════════════════════════════════ */
    function injectWidget() {
        const html = `
      <!-- Chat Widget Button -->
      <div id="chat-widget-btn" class="chat-widget-btn">
        <svg width="24" height="24" fill="none" stroke="white" stroke-width="2" viewBox="0 0 24 24">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <span class="chat-widget-badge" id="chat-widget-badge" style="display:none;">0</span>
      </div>

      <!-- Chat Window -->
      <div id="chat-window" class="chat-window" style="display:none;">
        
        <!-- Header -->
        <div class="chat-window-header">
          <div class="chat-back-btn" id="chat-back-btn" style="display:none;">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </div>
          <div class="chat-header-info">
            <div class="chat-header-title" id="chat-header-title">Mesajlar</div>
            <div class="chat-header-status" id="chat-header-status"></div>
          </div>
          <button class="chat-close-btn" id="chat-close-btn">×</button>
        </div>

        <!-- User List -->
        <div id="chat-user-list" class="chat-user-list">
          <div class="chat-search-wrap">
            <input type="text" id="chat-search-input" class="chat-search-input" placeholder="Kullanıcı ara...">
          </div>
          <div id="chat-users-container" class="chat-users-container">
            <!-- JS ile doldurulacak -->
          </div>
        </div>

        <!-- Chat Body -->
        <div id="chat-body" class="chat-body" style="display:none;">
          <div id="chat-messages" class="chat-messages">
            <!-- JS ile doldurulacak -->
          </div>
        </div>

        <!-- Input -->
        <div id="chat-input-wrap" class="chat-input-wrap" style="display:none;">
          <input type="text" id="chat-input" class="chat-input" placeholder="Mesaj yaz...">
          <button id="chat-send-btn" class="chat-send-btn">
            <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>

      <style>
        /* ── Chat Widget Button ──────────────────── */
        .chat-widget-btn {
          position: fixed;
          bottom: 24px;
          right: 24px;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--accent), #fb923c);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 999;
        }

        .chat-widget-btn:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 20px rgba(249, 115, 22, 0.4);
        }

        .chat-widget-btn:active {
          transform: scale(0.95);
        }

        .chat-widget-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          min-width: 20px;
          height: 20px;
          border-radius: 10px;
          background: #ef4444;
          color: white;
          font-size: 11px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 6px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        }

        /* ── Chat Window ─────────────────────────── */
        .chat-window {
          position: fixed;
          bottom: 90px;
          right: 24px;
          width: 380px;
          height: 520px;
          background: var(--surface);
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.12);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          z-index: 998;
          animation: chatSlideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes chatSlideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        /* ── Header ──────────────────────────────── */
        .chat-window-header {
          background: linear-gradient(135deg, var(--accent), #fb923c);
          color: white;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }

        .chat-back-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.2s;
        }

        .chat-back-btn:hover {
          background: rgba(255,255,255,0.15);
        }

        .chat-header-info {
          flex: 1;
          min-width: 0;
        }

        .chat-header-title {
          font-size: 15px;
          font-weight: 700;
        }

        .chat-header-status {
          font-size: 12px;
          opacity: 0.9;
          margin-top: 2px;
        }

        .chat-close-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: none;
          background: transparent;
          color: white;
          font-size: 28px;
          line-height: 1;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }

        .chat-close-btn:hover {
          background: rgba(255,255,255,0.15);
        }

        /* ── User List ───────────────────────────── */
        .chat-user-list {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .chat-search-wrap {
          padding: 12px;
          border-bottom: 1px solid var(--border);
          flex-shrink: 0;
        }

        .chat-search-input {
          width: 100%;
          padding: 8px 12px;
          border: 1.5px solid var(--border);
          border-radius: 8px;
          font-size: 13px;
          font-family: inherit;
          outline: none;
          transition: border-color 0.2s;
        }

        .chat-search-input:focus {
          border-color: var(--accent);
        }

        .chat-users-container {
          flex: 1;
          overflow-y: auto;
        }

        .chat-user-item {
          padding: 12px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          transition: background 0.2s;
          border-bottom: 1px solid var(--border);
        }

        .chat-user-item:hover {
          background: var(--surface-2);
        }

        .chat-user-item:active {
          background: var(--border);
        }

        .chat-user-avatar {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--accent), #fb923c);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          font-weight: 700;
          flex-shrink: 0;
          position: relative;
        }

        .chat-user-online {
          position: absolute;
          bottom: 2px;
          right: 2px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #10b981;
          border: 2px solid var(--surface);
        }

        .chat-user-info {
          flex: 1;
          min-width: 0;
        }

        .chat-user-name {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-1);
          margin-bottom: 2px;
        }

        .chat-user-role {
          font-size: 11px;
          color: var(--text-3);
          text-transform: uppercase;
        }

        .chat-user-unread {
          min-width: 20px;
          height: 20px;
          border-radius: 10px;
          background: var(--accent);
          color: white;
          font-size: 11px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 6px;
        }

        /* ── Chat Body ───────────────────────────── */
        .chat-body {
          flex: 1;
          overflow-y: auto;
          background: #fafafa;
          padding: 16px;
        }

        .chat-messages {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .chat-date-divider {
          text-align: center;
          color: var(--text-3);
          font-size: 11px;
          font-weight: 600;
          margin: 8px 0;
          position: relative;
        }

        .chat-date-divider::before,
        .chat-date-divider::after {
          content: '';
          position: absolute;
          top: 50%;
          width: 35%;
          height: 1px;
          background: var(--border);
        }

        .chat-date-divider::before { left: 0; }
        .chat-date-divider::after { right: 0; }

        .chat-message {
          display: flex;
          gap: 8px;
          max-width: 75%;
          animation: msgFadeIn 0.2s ease;
        }

        @keyframes msgFadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .chat-message.own {
          align-self: flex-end;
          flex-direction: row-reverse;
        }

        .chat-message-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--accent), #fb923c);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 700;
          flex-shrink: 0;
        }

        .chat-message-bubble {
          background: white;
          padding: 8px 12px;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
          position: relative;
        }

        .chat-message.own .chat-message-bubble {
          background: linear-gradient(135deg, var(--accent), #fb923c);
          color: white;
        }

        .chat-message-text {
          font-size: 14px;
          line-height: 1.5;
          word-wrap: break-word;
        }

        .chat-message-time {
          font-size: 10px;
          opacity: 0.6;
          margin-top: 4px;
          text-align: right;
        }

        .chat-message-delete {
          position: absolute;
          top: -8px;
          right: -8px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #ef4444;
          color: white;
          border: none;
          cursor: pointer;
          display: none;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          opacity: 0.9;
          transition: opacity 0.2s;
        }

        .chat-message:hover .chat-message-delete {
          display: flex;
        }

        .chat-message-delete:hover {
          opacity: 1;
        }

        /* ── Input ───────────────────────────────── */
        .chat-input-wrap {
          padding: 12px;
          border-top: 1px solid var(--border);
          display: flex;
          gap: 8px;
          background: var(--surface);
          flex-shrink: 0;
        }

        .chat-input {
          flex: 1;
          padding: 10px 14px;
          border: 1.5px solid var(--border);
          border-radius: 24px;
          font-size: 14px;
          font-family: inherit;
          outline: none;
          transition: border-color 0.2s;
        }

        .chat-input:focus {
          border-color: var(--accent);
        }

        .chat-send-btn {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          border: none;
          background: linear-gradient(135deg, var(--accent), #fb923c);
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s;
        }

        .chat-send-btn:hover {
          transform: scale(1.05);
        }

        .chat-send-btn:active {
          transform: scale(0.95);
        }

        .chat-send-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* ── Empty State ─────────────────────────── */
        .chat-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: var(--text-3);
          padding: 32px;
          text-align: center;
        }

        .chat-empty-icon {
          font-size: 48px;
          margin-bottom: 12px;
          opacity: 0.5;
        }

        .chat-empty-text {
          font-size: 14px;
        }

        /* ── Scrollbar ───────────────────────────── */
        .chat-users-container::-webkit-scrollbar,
        .chat-body::-webkit-scrollbar {
          width: 6px;
        }

        .chat-users-container::-webkit-scrollbar-thumb,
        .chat-body::-webkit-scrollbar-thumb {
          background: var(--border-hover);
          border-radius: 3px;
        }

        .chat-users-container::-webkit-scrollbar-thumb:hover,
        .chat-body::-webkit-scrollbar-thumb:hover {
          background: var(--text-3);
        }

        /* ── Mobile Responsive ───────────────────── */
        @media (max-width: 480px) {
          .chat-window {
            width: calc(100vw - 32px);
            height: calc(100vh - 120px);
            max-height: 600px;
          }
        }
      </style>
    `;

        document.body.insertAdjacentHTML('beforeend', html);

        // Cache DOM elements
        widgetBtn        = document.getElementById('chat-widget-btn');
        widgetBadge      = document.getElementById('chat-widget-badge');
        chatWindow       = document.getElementById('chat-window');
        chatHeader       = document.getElementById('chat-header-title');
        chatBody         = document.getElementById('chat-body');
        chatInput        = document.getElementById('chat-input');
        userList         = document.getElementById('chat-user-list');
        messageContainer = document.getElementById('chat-messages');
        searchInput      = document.getElementById('chat-search-input');
    }

    /* ══════════════════════════════════════════════
       WEBSOCKET CONNECTION
    ══════════════════════════════════════════════ */
    function connectWebSocket() {
        const socket = new SockJS('/ws-chat');
        stompClient  = Stomp.over(socket);

        stompClient.connect(
            { Authorization: `Bearer ${token}` },
            onConnected,
            onError
        );
    }

    function onConnected() {
        isConnected = true;
        console.log('[Chat] WebSocket connected');

        // Subscribe to private messages
        stompClient.subscribe(`/user/queue/messages`, onMessageReceived);

        // Subscribe to general channel (optional)
        stompClient.subscribe(`/topic/chat.ALL`, onMessageReceived);

        updateConnectionStatus();
    }

    function onError(error) {
        isConnected = false;
        console.error('[Chat] WebSocket error:', error);
        updateConnectionStatus();

        // Retry connection after 5 seconds
        setTimeout(() => {
            if (!isConnected) connectWebSocket();
        }, 5000);
    }

    function updateConnectionStatus() {
        const status = document.getElementById('chat-header-status');
        if (status && activeChat) {
            status.textContent = isConnected ? 'Çevrimiçi' : 'Bağlantı kuruluyor...';
            status.style.color = isConnected ? '#10b981' : '#f59e0b';
        }
    }

    /* ══════════════════════════════════════════════
       API CALLS
    ══════════════════════════════════════════════ */
    async function api(path, opts = {}) {
        return fetch(path, {
            ...opts,
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...(opts.headers || {}),
            },
        }).then(r => {
            if (r.status === 401 || r.status === 403) {
                localStorage.removeItem('jwtToken');
                window.location.replace('/Html/login.html');
                throw new Error('Unauthorized');
            }
            return r.json();
        });
    }

    async function loadUsers() {
        try {
            users = await api('/api/chat/users');
            renderUserList();
        } catch (e) {
            console.error('[Chat] Failed to load users:', e);
        }
    }

    async function loadHistory(email) {
        try {
            const msgs = email
                ? await api(`/api/chat/history/${email}`)
                : await api('/api/chat/history/all');

            messages[email || 'ALL'] = msgs;
            renderMessages();
        } catch (e) {
            console.error('[Chat] Failed to load history:', e);
        }
    }

    /* ══════════════════════════════════════════════
       UI RENDERING
    ══════════════════════════════════════════════ */
    function renderUserList(filter = '') {
        const container = document.getElementById('chat-users-container');
        container.innerHTML = '';

        const filtered = users.filter(u =>
            !filter || u.email.toLowerCase().includes(filter.toLowerCase())
        );

        if (filtered.length === 0) {
            container.innerHTML = `
        <div class="chat-empty">
          <div class="chat-empty-icon">👥</div>
          <div class="chat-empty-text">Kullanıcı bulunamadı</div>
        </div>
      `;
            return;
        }

        filtered.forEach(user => {
            const unread = unreadCount[user.email] || 0;
            const initial = user.email.charAt(0).toUpperCase();
            const roleColor = user.role === 'ADMIN' ? '#ef4444' :
                user.role === 'TESTER' ? '#3b82f6' : '#64748b';

            const item = document.createElement('div');
            item.className = 'chat-user-item';
            item.innerHTML = `
        <div class="chat-user-avatar">
          ${initial}
        </div>
        <div class="chat-user-info">
          <div class="chat-user-name">${user.email.split('@')[0]}</div>
          <div class="chat-user-role" style="color:${roleColor}">${user.role}</div>
        </div>
        ${unread > 0 ? `<div class="chat-user-unread">${unread}</div>` : ''}
      `;

            item.addEventListener('click', () => openChat(user.email));
            container.appendChild(item);
        });
    }

    function renderMessages() {
        const msgs = messages[activeChat || 'ALL'] || [];
        messageContainer.innerHTML = '';

        if (msgs.length === 0) {
            messageContainer.innerHTML = `
        <div class="chat-empty">
          <div class="chat-empty-icon">💬</div>
          <div class="chat-empty-text">Henüz mesaj yok<br>İlk mesajı gönderin!</div>
        </div>
      `;
            return;
        }

        let lastDate = null;

        msgs.forEach(msg => {
            const msgDate = new Date(msg.sentAt);
            const dateStr = formatDate(msgDate);

            // Date divider
            if (dateStr !== lastDate) {
                const divider = document.createElement('div');
                divider.className = 'chat-date-divider';
                divider.textContent = dateStr;
                messageContainer.appendChild(divider);
                lastDate = dateStr;
            }

            // Message
            const isOwn = msg.sender === currentUser;
            const msgEl = document.createElement('div');
            msgEl.className = `chat-message ${isOwn ? 'own' : ''}`;

            const initial = msg.sender.charAt(0).toUpperCase();
            const timeStr = formatTime(msgDate);

            msgEl.innerHTML = `
        <div class="chat-message-avatar">${initial}</div>
        <div class="chat-message-bubble">
          <div class="chat-message-text">${escapeHtml(msg.content)}</div>
          <div class="chat-message-time">${timeStr}</div>
          ${isOwn ? `<button class="chat-message-delete" data-id="${msg.id}">×</button>` : ''}
        </div>
      `;

            messageContainer.appendChild(msgEl);
        });

        // Scroll to bottom
        setTimeout(() => {
            chatBody.scrollTop = chatBody.scrollHeight;
        }, 50);

        // Delete listeners
        messageContainer.querySelectorAll('.chat-message-delete').forEach(btn => {
            btn.addEventListener('click', () => deleteMessage(btn.dataset.id));
        });
    }

    /* ══════════════════════════════════════════════
       CHAT ACTIONS
    ══════════════════════════════════════════════ */
    function openChat(email) {
        activeChat = email;
        isChatOpen = true;

        // Clear unread
        unreadCount[email] = 0;
        updateBadge();

        // Update header
        document.getElementById('chat-header-title').textContent = email.split('@')[0];
        document.getElementById('chat-back-btn').style.display = '';
        updateConnectionStatus();

        // Show chat, hide user list
        userList.style.display = 'none';
        chatBody.style.display = '';
        document.getElementById('chat-input-wrap').style.display = '';

        // Load history
        if (!messages[email]) {
            loadHistory(email);
        } else {
            renderMessages();
        }
    }

    function closeChat() {
        activeChat = null;
        isChatOpen = false;

        // Update header
        document.getElementById('chat-header-title').textContent = 'Mesajlar';
        document.getElementById('chat-header-status').textContent = '';
        document.getElementById('chat-back-btn').style.display = 'none';

        // Show user list, hide chat
        userList.style.display = '';
        chatBody.style.display = 'none';
        document.getElementById('chat-input-wrap').style.display = 'none';

        renderUserList();
    }

    function sendMessage() {
        const text = chatInput.value.trim();
        if (!text || !isConnected) return;

        const message = {
            content: text,
            receiver: activeChat || 'ALL',
            sentAt: new Date().toISOString(),
        };

        if (activeChat) {
            stompClient.send('/app/chat.sendPrivate', {}, JSON.stringify(message));
        } else {
            stompClient.send('/app/chat.sendAll', {}, JSON.stringify(message));
        }

        chatInput.value = '';
    }

    function onMessageReceived(payload) {
        const msg = JSON.parse(payload.body);

        // Add to messages
        const key = msg.receiver === 'ALL' ? 'ALL' :
            msg.sender === currentUser ? msg.receiver : msg.sender;

        if (!messages[key]) messages[key] = [];
        messages[key].push(msg);

        // If chat is open, render
        if (activeChat === key || (!activeChat && key === 'ALL')) {
            renderMessages();
        } else {
            // Increment unread
            unreadCount[key] = (unreadCount[key] || 0) + 1;
            updateBadge();
            renderUserList();
        }
    }

    async function deleteMessage(id) {
        if (!confirm('Bu mesajı silmek istediğinize emin misiniz?')) return;

        try {
            await api(`/api/chat/messages/${id}`, { method: 'DELETE' });

            // Remove from local state
            Object.keys(messages).forEach(key => {
                messages[key] = messages[key].filter(m => m.id != id);
            });

            renderMessages();
            showToast('Mesaj silindi.', 'success');
        } catch (e) {
            showToast('Mesaj silinemedi.', 'error');
        }
    }

    /* ══════════════════════════════════════════════
       HELPERS
    ══════════════════════════════════════════════ */
    function updateBadge() {
        const total = Object.values(unreadCount).reduce((a, b) => a + b, 0);
        if (total > 0) {
            widgetBadge.textContent = total > 99 ? '99+' : total;
            widgetBadge.style.display = '';
        } else {
            widgetBadge.style.display = 'none';
        }
    }

    function formatDate(date) {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const dateStr = date.toDateString();
        if (dateStr === today.toDateString()) return 'Bugün';
        if (dateStr === yesterday.toDateString()) return 'Dün';

        return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
    }

    function formatTime(date) {
        return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function showToast(msg, type) {
        if (window.showToast) window.showToast(msg, type);
    }

    /* ══════════════════════════════════════════════
       EVENT LISTENERS
    ══════════════════════════════════════════════ */
    function attachEventListeners() {
        // Widget toggle
        widgetBtn.addEventListener('click', () => {
            isWidgetOpen = !isWidgetOpen;
            chatWindow.style.display = isWidgetOpen ? '' : 'none';

            if (isWidgetOpen && !isChatOpen) {
                closeChat(); // Show user list
            }
        });

        // Close button
        document.getElementById('chat-close-btn').addEventListener('click', () => {
            isWidgetOpen = false;
            chatWindow.style.display = 'none';
        });

        // Back button
        document.getElementById('chat-back-btn').addEventListener('click', closeChat);

        // Search
        searchInput.addEventListener('input', e => {
            renderUserList(e.target.value);
        });

        // Send message
        document.getElementById('chat-send-btn').addEventListener('click', sendMessage);

        chatInput.addEventListener('keypress', e => {
            if (e.key === 'Enter') sendMessage();
        });

        // Close on outside click
        document.addEventListener('click', e => {
            if (isWidgetOpen &&
                !chatWindow.contains(e.target) &&
                !widgetBtn.contains(e.target)) {
                isWidgetOpen = false;
                chatWindow.style.display = 'none';
            }
        });
    }

    /* ══════════════════════════════════════════════
       INIT
    ══════════════════════════════════════════════ */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();