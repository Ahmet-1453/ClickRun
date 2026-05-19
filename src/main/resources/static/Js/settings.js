(function () {
    'use strict';

    function decodeJwtPart(part) {
        if (!part) return null;
        let base64 = part.replace(/-/g, '+').replace(/_/g, '/');
        base64 += '='.repeat((4 - (base64.length % 4)) % 4);
        try { return JSON.parse(atob(base64)); } catch { return null; }
    }

    const token = window.AuthUtils?.getValidToken?.() || localStorage.getItem('jwtToken');
    if (!token) {
        window.location.replace('/Html/login.html');
        return;
    }

    let currentUser = null;
    let users = [];

    function parseJWT(t) {
        try {
            return (window.AuthUtils?.decodeJwtPart || decodeJwtPart)(t.split('.')[1]);
        } catch { return {}; }
    }

    function api(path, opts = {}) {
        return fetch(path, {
            ...opts,
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...(opts.headers || {}),
            },
        }).then(async r => {
            if (r.status === 401 || r.status === 403) {
                window.AuthUtils?.handleAuthFailure?.();
                throw new Error('Unauthorized');
            }
            if (!r.ok) {
                const err = await r.json().catch(() => ({}));
                throw new Error(err.message || err.error || r.statusText);
            }
            return r.status === 204 ? {} : r.json().catch(() => ({}));
        });
    }

    async function loadProfile() {
        try {
            const payload = parseJWT(token);
            const email = payload.sub || '';
            const role = payload.role || 'USER';
            const name = email.split('@')[0];
            const initial = name.charAt(0).toUpperCase();

            currentUser = { email, role, name };

            document.getElementById('profile-avatar').textContent = initial;
            document.getElementById('profile-name').textContent = name;
            document.getElementById('profile-email').textContent = email;

            const roleEl = document.getElementById('profile-role');
            roleEl.textContent = role;
            roleEl.className = `profile-role role-${role.toLowerCase()}`;

            document.getElementById('input-email').value = email;
            document.getElementById('input-role').value = role;

            if (role === 'ADMIN') {
                document.getElementById('admin-section-label').style.display = '';
                document.getElementById('users-tab').style.display = '';
            }

        } catch (e) {
            showToast('Profil yüklenemedi.', 'error');
        }
    }

    function switchTab(tabName) {
        document.querySelectorAll('.settings-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tabName);
        });

        document.querySelectorAll('.settings-panel').forEach(p => {
            p.classList.toggle('active', p.id === `panel-${tabName}`);
        });

        if (tabName === 'users' && users.length === 0) {
            loadUsers();
        }
    }

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

    async function updatePassword() {
        const current = document.getElementById('input-current-pass').value;
        const newPass = document.getElementById('input-new-pass').value;
        const confirm = document.getElementById('input-confirm-pass').value;

        hideError();

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
            await api('/api/auth/change-password', {
                method: 'PATCH',
                body: JSON.stringify({ currentPassword: current, newPassword: newPass }),
            });

            showToast('Şifre güncellendi.', 'success');

            document.getElementById('input-current-pass').value = '';
            document.getElementById('input-new-pass').value = '';
            document.getElementById('input-confirm-pass').value = '';
            checkPasswordStrength('');

        } catch (e) {
            showError(e.message || 'Şifre güncellenemedi.');
        }
    }

    async function loadUsers() {
        try {
            const data = await api('/api/settings/users');
            users = data;
            renderUsers();
        } catch (e) {
            showToast('Kullanıcılar yüklenemedi.', 'error');
        }
    }

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

            if (user.email === currentUser.email) {
                select.disabled = true;
            }

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

    function attachEvents() {
        document.querySelectorAll('.settings-tab').forEach(tab => {
            tab.addEventListener('click', () => switchTab(tab.dataset.tab));
        });

        document.getElementById('input-new-pass')?.addEventListener('input', e => {
            checkPasswordStrength(e.target.value);
        });

        document.getElementById('btn-update-password')?.addEventListener('click', updatePassword);

        document.querySelectorAll('input[name="theme"]').forEach(radio => {
            radio.addEventListener('change', e => {
                if (window.ThemeManager) {
                    window.ThemeManager.switch(e.target.value);
                    showToast(`${e.target.value === 'light' ? 'Açık' : 'Koyu'} tema etkinleştirildi.`, 'success');
                }
            });
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        loadProfile();
        attachEvents();
    });
})();