/* ================================================
   AFT COMPACT — sidebar.js  v2.0
   ================================================ */
(function () {

    /* Token'dan kullanıcı bilgilerini al */
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

    const initials = userName.charAt(0).toUpperCase() || '?';

    /* Aktif sayfayı bul */
    const path = window.location.pathname.toLowerCase();

    function isActive(key) {
        const map = {
            dashboard:   ['dashboard'],
            scenarios:   ['scenarios'],
            builder:     ['scenario-builder', 'scenario.html'],
            runs:        ['runs', 'history'],
            scheduled:   ['scheduled'],
            selftest:    ['selftest'],
            permissions: ['permissions'],
            settings:    ['settings'],
        };
        return (map[key] || []).some(k => path.includes(k));
    }

    /* Nav bağlantıları */
    const navItems = [
        {
            section: 'ÇALIŞMA ALANI',
            items: [
                {
                    id: 'dashboard',
                    label: 'Dashboard',
                    href: '/Html/dashboard.html',
                    icon: `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`,
                },
                {
                    id: 'scenarios',
                    label: 'Senaryolar',
                    href: '/Html/scenarios.html',
                    icon: `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/></svg>`,
                },
                {
                    id: 'builder',
                    label: 'Senaryo Tasarım',
                    href: '/Html/scenario-builder.html',
                    icon: `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1M5.6 18.4l2.1-2.1m8.6-8.6 2.1-2.1"/></svg>`,
                },
                {
                    id: 'runs',
                    label: 'Koşum Geçmişi',
                    href: '/Html/runs.html',
                    icon: `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
                },
            ]
        },
        {
            section: 'SİSTEM',
            items: [
                {
                    id: 'scheduled',
                    label: 'Zamanlanmış',
                    href: '/Html/scheduled.html',
                    icon: `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
                },
                {
                    id: 'selftest',
                    label: 'Self-Test',
                    href: '/Html/selftest.html',
                    icon: `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
                },
                ...(userRole === 'ADMIN' ? [{
                    id: 'permissions',
                    label: 'Yetki Yönetimi',
                    href: '/Html/permissions.html',
                    icon: `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
                }] : []),
                {
                    id: 'settings',
                    label: 'Ayarlar',
                    href: '/Html/settings.html',
                    icon: `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
                },
            ]
        }
    ];

    /* HTML oluştur */
    const sidebarHTML = `
    <aside class="aft-sidebar" id="aft-sidebar">
      <div class="sidebar-logo">
        <div class="sidebar-logo-mark">C</div>
        <div class="sidebar-logo-text">Click<span>&Run</span></div>
        <button class="sidebar-toggle" id="sidebar-toggle" title="Menüyü daralt/genişlet">
          <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
      </div>

      <nav class="sidebar-nav">
        ${navItems.map(section => `
          <div class="nav-section-label">${section.section}</div>
          <ul style="list-style:none;padding:0;margin:0 0 4px 0;">
            ${section.items.map(item => `
              <li class="nav-item">
                <a href="${item.href}" class="nav-link${isActive(item.id) ? ' active' : ''}" id="nav-${item.id}">
                  <span class="nav-icon">${item.icon}</span>
                  <span class="nav-label">${item.label}</span>
                </a>
              </li>
            `).join('')}
          </ul>
        `).join('')}
      </nav>

      <div class="sidebar-user">
        <div class="user-avatar">${initials}</div>
        <div class="user-info">
          <div class="user-name">${userName || userEmail}</div>
          <div class="user-role">${userRole} · QA Engineer</div>
        </div>
      </div>
    </aside>
  `;

    /* Container'a ekle */
    const container = document.getElementById('sidebar-container');
    if (container) {
        container.outerHTML = sidebarHTML;
    } else {
        document.body.insertAdjacentHTML('afterbegin', sidebarHTML);
    }

    /* Toggle */
    document.addEventListener('click', e => {
        if (e.target.closest('#sidebar-toggle')) {
            document.body.classList.toggle('sidebar-collapsed');
            localStorage.setItem('sidebarCollapsed',
                document.body.classList.contains('sidebar-collapsed') ? '1' : '0');
        }
    });

    /* Kayıtlı durum */
    if (localStorage.getItem('sidebarCollapsed') === '1') {
        document.body.classList.add('sidebar-collapsed');
    }

})();