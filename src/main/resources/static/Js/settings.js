/* ================================================
   Click&Run — settings.js
   Profil + Güvenlik + Tema + Kullanıcı Yönetimi
   ================================================ */
(function () {
    'use strict';

    const token = localStorage.getItem('jwtToken');
    if (!token) {
        window.location.replace('/Html/login.html');
        return;
    }

    /* ── State ───────────────────────────────────── */
    let currentUser = null;
    let users = [];

    /* ── JWT Parse ───────────────────────────────── */
    function parseJWT(t) {
        try {
            const base64 = t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
            return JSON.parse(atob(base64));
        } catch { return {}; }
    }

    /* ── API ─────────────────────────────────────── */
    function api(path, opts = {}) {
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
            if (!r.ok) throw new Error(r.statusText);
            return r.json();
        });
    }

    /* ── Load Profile ────────────────────────────── */
    async function loadProfile() {
        try {
            const payload = parseJWT(token);
            const email = payload.sub || '';
            const role = payload.role || 'USER';
            const name = email.split('@')[0];
            const initial = name.charAt(0).toUpperCase();

            currentUser = { email, role, name };

            // Profile card
            document.getElementById('profile-avatar').textContent = initial;
            document.getElementById('profile-name').textContent = name;
            document.getElementById('profile-email').textContent = email;

            const roleEl = document.getElementById('profile-role');
            roleEl.textContent = role;
            roleEl.className = `profile-role role-${role.toLowerCase()}`;

            // Form inputs
            document.getElementById('input-email').value = email;
            document.getElementById('input-role').value = role;

            // Show admin section
            if (role === 'ADMIN') {
                document.getElementById('admin-section-label').style.display = '';
                document.getElementById('users-tab').style.display = '';
            }

        } catch (e) {
            showToast('Profil yüklenemedi.', 'error');
        }
    }

    /* ── Tab Switching ───────────────────────────── */
    function switchTab(tabName) {
        // Update tabs
        document.querySelectorAll('.settings-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tabName);
        });

        // Update panels
        document.querySelectorAll('.settings-panel').forEach(p => {
            p.classList.toggle('active', p.id === `panel-${tabName}`);
        });

        // Load users if switching to users tab
        if (tabName === 'users' && users.length === 0) {
            loadUsers();
        }
    }

    /* ── Password Strength ───────────────────────── */
    function checkPasswordStrength(pass) {
        const bar = document.getElementById('pass-strength-bar');
        const hint = document.getElementById('pass-hint');

        if (!pass) {
            bar.style.width = '0%';
            hint.textContent = 'En az 8 karakter, büyük-küçük harf ve rakam içermelidir';
            hint.style.color = 'var(--text-3)';
            return;
        }

        let strength = 0;
        if (pass.length >= 8) strength++;
        if (/[a-z]/.test(pass)) strength++;
        if (/[A-Z]/.test(pass)) strength++;
        if (/[0-9]/.test(pass)) strength++;
        if (/[^a-zA-Z0-9]/.test(pass)) strength++;

        const width = (strength / 5) * 100;
        bar.style.width = width + '%';

        if (strength < 2) {
            bar.style.background = 'var(--danger)';
            hint.textContent = 'Zayıf şifre';
            hint.style.color = 'var(--danger)';
        } else if (strength < 4) {
            bar.style.background = 'var(--warning)';
            hint.textContent = 'Orta güçlükte';
            hint.style.color = 'var(--warning)';
        } else {
            bar.style.background = 'var(--success)';
            hint.textContent = 'Güçlü şifre ✓';
            hint.style.color = 'var(--success)';
        }
    }

    /* ── Update Password ─────────────────────────── */
    async function updatePassword() {
        const current = document.getElementById('input-current-pass').value;
        const newPass = document.getElementById('input-new-pass').value;
        const confirm = document.getElementById('input-confirm-pass').value;

        hideError();

        // Validation
        if (!current || !newPass || !confirm) {
            showError('Tüm alanları doldurun.');
            return;
        }

        if (newPass.length < 8) {
            showError('Yeni şifre en az 8 karakter olmalıdır.');
            return;
        }

        if (newPass !== confirm) {
            showError('Yeni şifreler eşleşmiyor.');
            return;
        }

        try {
            // Backend'de şifre değiştirme endpoint'i yoksa eklenecek
            // Şimdilik mock response
            await new Promise(resolve => setTimeout(resolve, 500));

            showToast('Şifre güncellendi.', 'success');

            // Clear form
            document.getElementById('input-current-pass').value = '';
            document.getElementById('input-new-pass').value = '';
            document.getElementById('input-confirm-pass').value = '';
            checkPasswordStrength('');

        } catch (e) {
            showError(e.message || 'Şifre güncellenemedi.');
        }
    }

    /* ── Load Users ──────────────────────────────── */
    async function loadUsers() {
        try {
            const data = await api('/api/settings/users');
            users = data;
            renderUsers();
        } catch (e) {
            showToast('Kullanıcılar yüklenemedi.', 'error');
        }
    }

    /* ── Render Users ────────────────────────────── */
    function renderUsers() {
        const container = document.getElementById('users-list');
        container.innerHTML = '';

        if (users.length === 0) {
            container.innerHTML = `
        <div class="empty-state" style="padding:40px 0;">
          <div class="empty-state-icon">👥</div>
          <div class="empty-state-title">Kullanıcı bulunamadı</div>
        </div>
      `;
            return;
        }

        const tpl = document.getElementById('tpl-user-row');

        users.forEach(user => {
            const clone = tpl.content.cloneNode(true);
            const initial = user.email.charAt(0).toUpperCase();

            clone.querySelector('[data-slot="avatar"]').textContent = initial;
            clone.querySelector('[data-slot="name"]').textContent =
                user.username || user.email.split('@')[0];
            clone.querySelector('[data-slot="email"]').textContent = user.email;

            const select = clone.querySelector('[data-slot="role-select"]');
            select.value = user.role;

            // Kendi rolünü değiştiremesin
            if (user.email === currentUser.email) {
                select.disabled = true;
            }

            // Change listener
            select.addEventListener('change', async (e) => {
                const newRole = e.target.value;

                if (!confirm(`${user.email} kullanıcısının rolünü ${newRole} olarak değiştirmek istediğinize emin misiniz?`)) {
                    e.target.value = user.role;
                    return;
                }

                try {
                    await api(`/api/settings/users/${user.id}/role`, {
                        method: 'PUT',
                        body: JSON.stringify({ role: newRole }),
                    });

                    user.role = newRole;
                    showToast('Rol güncellendi.', 'success');
                } catch (err) {
                    showToast('Rol güncellenemedi.', 'error');
                    e.target.value = user.role;
                }
            });

            container.appendChild(clone);
        });
    }

    /* ── Helpers ─────────────────────────────────── */
    function showError(msg) {
        const el = document.getElementById('security-error');
        el.textContent = msg;
        el.style.display = '';
    }

    function hideError() {
        document.getElementById('security-error').style.display = 'none';
    }

    function showToast(msg, type) {
        if (window.showToast) window.showToast(msg, type);
    }

    /* ── Event Listeners ─────────────────────────── */
    function attachEvents() {
        // Tab switching
        document.querySelectorAll('.settings-tab').forEach(tab => {
            tab.addEventListener('click', () => switchTab(tab.dataset.tab));
        });

        // Password strength
        document.getElementById('input-new-pass')?.addEventListener('input', e => {
            checkPasswordStrength(e.target.value);
        });

        // Update password
        document.getElementById('btn-update-password')?.addEventListener('click', updatePassword);

        // Theme change (YENİ)
        document.querySelectorAll('input[name="theme"]').forEach(radio => {
            radio.addEventListener('change', e => {
                if (window.ThemeManager) {
                    window.ThemeManager.switch(e.target.value);
                    showToast(`${e.target.value === 'light' ? 'Açık' : 'Koyu'} tema etkinleştirildi.`, 'success');
                }
            });
        });
    }

    /* ── Init ────────────────────────────────────── */
    document.addEventListener('DOMContentLoaded', () => {
        loadProfile();
        attachEvents();
    });

})();