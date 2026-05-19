(function () {

    /* Token'dan bilgi */
    let userEmail = '', userRole = 'USER', userName = '';

    function decodeJwtPart(part) {
        if (!part) return null;
        let base64 = part.replace(/-/g, '+').replace(/_/g, '/');
        base64 += '='.repeat((4 - (base64.length % 4)) % 4);
        try { return JSON.parse(atob(base64)); } catch { return null; }
    }

    function parseJWT(token) {
        const payload = (window.AuthUtils?.decodeJwtPart || decodeJwtPart)(token?.split?.('.')[1]);
        if (!payload) {
            console.error('JWT parse error');
        }
        return payload;
    }

    try {
        const t = window.AuthUtils?.getValidToken?.() || localStorage.getItem('jwtToken');
        if (t) {
            const p = parseJWT(t);
            if (p) {
                userEmail = p.sub || p.email || '';
                userRole  = p.role || 'USER';
                userName  = userEmail.split('@')[0];
            }
        }
    } catch(e) {
        console.error('Token processing error:', e);
    }

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

    <div id="user-dropdown" style="display:none; position:fixed; background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-lg); box-shadow:var(--shadow-lg); z-index:1000;">
      <a href="/Html/settings.html" style="display:block; padding:10px 16px; color:var(--text); text-decoration:none; border-bottom:1px solid var(--border);">
        <svg style="width:16px; height:16px; margin-right:8px; vertical-align:middle;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="1"/><path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m5.08 5.08l4.24 4.24M1 12h6m6 0h6M4.22 19.78l4.24-4.24m5.08-5.08l4.24-4.24"/></svg>
        Ayarlar
      </a>
      <button id="logout-btn" style="width:100%; padding:10px 16px; text-align:left; background:none; border:none; color:var(--text); cursor:pointer;">
        <svg style="width:16px; height:16px; margin-right:8px; vertical-align:middle;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 3l4 4m0 0l-4 4m4-4H9"/></svg>
        Çıkış Yap
      </button>
    </div>
    `;

    document.body.insertAdjacentHTML('afterbegin', navbarHTML);

    const navbar = document.getElementById('navbar-user');
    const dropdown = document.getElementById('user-dropdown');
    const logoutBtn = document.getElementById('logout-btn');

    navbar?.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    });

    document.addEventListener('click', () => {
        dropdown.style.display = 'none';
    });

    logoutBtn?.addEventListener('click', () => {
        localStorage.removeItem('jwtToken');
        window.location.replace('/Html/login.html');
    });

})();