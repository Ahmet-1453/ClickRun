/* ================================================
   AFT COMPACT — navbar.js  v2.0
   ================================================ */
(function () {

    /* Token'dan bilgi */
    let userEmail = '', userRole = 'USER', userName = '';
    try {
        const t = localStorage.getItem('jwtToken');
        if (t) {
            const p = JSON.parse(decodeURIComponent(
                atob(t.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))
                    .split('').map(c => '%' + ('00'+c.charCodeAt(0).toString(16)).slice(-2)).join('')
            ));
            userEmail = p.sub || '';
            userRole  = p.role || 'USER';
            userName  = userEmail.split('@')[0];
        }
    } catch(e) {}

    /* Breadcrumb */
    const path  = window.location.pathname.toLowerCase();
    const pages = {
        'dashboard':        { crumb: 'Dashboard', title: 'Gösterge Paneli' },
        'scenarios.html':   { crumb: 'Senaryolar', title: 'Senaryo Listesi' },
        'scenario-builder': { crumb: 'Senaryolar / Tasarım', title: 'Senaryo Tasarım' },
        'scenario.html':    { crumb: 'Senaryo Tasarım', title: 'Senaryo Tasarım' },
        'runs':             { crumb: 'Koşum Geçmişi', title: 'Koşum Geçmişi' },
        'history':          { crumb: 'Koşum Geçmişi', title: 'Koşum Geçmişi' },
        'scheduled':        { crumb: 'Sistem / Zamanlanmış', title: 'Zamanlanmış Testler' },
        'selftest':         { crumb: 'Sistem / Self-Test', title: 'Self-Test' },
        'permissions':      { crumb: 'Sistem / Yetki Yönetimi', title: 'Yetki Yönetimi' },
        'settings':         { crumb: 'Ayarlar', title: 'Kullanıcı Ayarları' },
    };

    let pageInfo = { crumb: 'Click&Run', title: 'Dashboard' };
    for (const [key, val] of Object.entries(pages)) {
        if (path.includes(key)) { pageInfo = val; break; }
    }

    const crumbParts = pageInfo.crumb.split(' / ');
    const crumbHTML = crumbParts.map((p, i) =>
        i === crumbParts.length - 1
            ? `<span class="current">${p}</span>`
            : `<span>${p}</span><span class="sep">/</span>`
    ).join('');

    /* Initials */
    const initials = userName.charAt(0).toUpperCase() || '?';

    const navbarHTML = `
    <div id="toast-container"></div>
    <header class="aft-navbar" id="aft-navbar">
      <nav class="navbar-breadcrumb">${crumbHTML}</nav>

      <div class="navbar-actions">
        <button class="navbar-btn" id="navbar-notif" title="Bildirimler">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          <span class="notif-dot" id="notif-dot" style="display:none;"></span>
        </button>

        <div class="navbar-divider"></div>

        <div class="navbar-user" id="navbar-user">
          <div class="user-avatar" style="width:28px;height:28px;font-size:11px;">${initials}</div>
          <div>
            <div class="navbar-user-name">${userName || userEmail}</div>
          </div>
          <span class="navbar-user-role">${userRole}</span>
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="color:var(--text-3)"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
      </div>
    </header>

    <!-- Kullanıcı dropdown (tıklayınca açılır) -->
    <div id="user-dropdown" style="
      display:none; position:fixed;
      background:var(--surface);
      border:1px solid var(--border);
      border-radius:var(--radius-lg);
      box-shadow:var(--shadow-lg);
      width:200px; z-index:200;
      padding:6px;
      animation: modalIn 0.15s ease;
    ">
      <div style="padding:10px 12px 8px; border-bottom:1px solid var(--border); margin-bottom:4px;">
        <div style="font-size:12.5px;font-weight:600;color:var(--text-1);">${userEmail}</div>
        <div style="font-size:11px;color:var(--text-3);">${userRole}</div>
      </div>
      <a href="/Html/settings.html" style="
        display:flex; align-items:center; gap:8px;
        padding:8px 10px; border-radius:var(--radius-sm);
        color:var(--text-2); font-size:13px;
        text-decoration:none; transition:background var(--transition);
      " onmouseover="this.style.background='var(--surface-2)'" onmouseout="this.style.background=''">
        <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        Ayarlar
      </a>
      <button id="navbar-logout" style="
        display:flex; align-items:center; gap:8px;
        width:100%; padding:8px 10px;
        border:none; background:none; cursor:pointer;
        border-radius:var(--radius-sm);
        color:var(--danger); font-size:13px;
        font-family:inherit; transition:background var(--transition);
        text-align:left;
      " onmouseover="this.style.background='var(--danger-bg)'" onmouseout="this.style.background=''">
        <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        Çıkış Yap
      </button>
    </div>
  `;

    const container = document.getElementById('navbar-container');
    if (container) container.outerHTML = navbarHTML;
    else document.body.insertAdjacentHTML('afterbegin', navbarHTML);

    /* Dropdown */
    document.addEventListener('click', e => {
        const userBtn = document.getElementById('navbar-user');
        const dropdown = document.getElementById('user-dropdown');
        if (!userBtn || !dropdown) return;

        if (e.target.closest('#navbar-user')) {
            const rect = userBtn.getBoundingClientRect();
            dropdown.style.top  = (rect.bottom + 6) + 'px';
            dropdown.style.right = (window.innerWidth - rect.right) + 'px';
            dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
            return;
        }
        if (!e.target.closest('#user-dropdown')) {
            dropdown.style.display = 'none';
        }
    });

    /* Çıkış */
    document.addEventListener('click', e => {
        if (e.target.closest('#navbar-logout')) {
            localStorage.removeItem('jwtToken');
            window.location.replace('/Html/login.html');
        }
    });

    /* Global toast fonksiyonu */
    window.showToast = function(message, type = 'info', duration = 3500) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
      <span style="font-size:15px;">${
            type === 'success' ? '✓' :
                type === 'error'   ? '✕' :
                    type === 'warning' ? '⚠' : 'ℹ'
        }</span>
      <span>${message}</span>
    `;
        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('hiding');
            setTimeout(() => toast.remove(), 250);
        }, duration);
    };

    /* Eski isimle uyumluluk */
    window.showModernToast = window.showToast;

})();