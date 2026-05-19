/* ================================================
   Click&Run — theme.js
   Kullanıcı bazlı tema sistemi (Light/Dark)
   ================================================ */
(function () {
    'use strict';

    const token = localStorage.getItem('jwtToken');
    if (!token) return;

    /* ── Theme Manager ───────────────────────────── */
    const ThemeManager = {
        current: 'light',

        // Initialize
        async init() {
            // Backend'den tema yükle
            await this.loadFromBackend();

            // Temayı uygula
            this.apply(this.current);

            // Settings sayfasında radio button'ı sync et
            this.syncSettingsUI();
        },

        // Backend'den tema yükle
        async loadFromBackend() {
            try {
                const response = await fetch('/api/settings/me', {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (response.ok) {
                    const data = await response.json();
                    this.current = data.theme || 'light';
                }
            } catch (e) {
                console.warn('[Theme] Backend yüklenemedi, varsayılan: light');
                this.current = 'light';
            }
        },

        // Temayı uygula
        apply(theme) {
            this.current = theme;
            document.documentElement.setAttribute('data-theme', theme);

            // localStorage'a da yaz (offline fallback)
            localStorage.setItem('user-theme', theme);
        },

        // Tema değiştir ve backend'e kaydet
        async switch(theme) {
            if (theme !== 'light' && theme !== 'dark') return;

            // UI'ı hemen güncelle
            this.apply(theme);

            // Backend'e kaydet
            try {
                await fetch('/api/settings/me', {
                    method: 'PATCH',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ theme })
                });
            } catch (e) {
                console.error('[Theme] Backend güncellenemedi:', e);
            }

            // Settings UI'ı sync et
            this.syncSettingsUI();
        },

        // Settings sayfasındaki radio button'ları sync et
        syncSettingsUI() {
            const lightRadio = document.querySelector('input[name="theme"][value="light"]');
            const darkRadio = document.querySelector('input[name="theme"][value="dark"]');

            if (lightRadio) lightRadio.checked = this.current === 'light';
            if (darkRadio) darkRadio.checked = this.current === 'dark';
        }
    };

    /* ── Global access ───────────────────────────── */
    window.ThemeManager = ThemeManager;

    /* ── Auto-init ───────────────────────────────── */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => ThemeManager.init());
    } else {
        ThemeManager.init();
    }

})();