/* ================================================
   Click&Run — login.js
   Backend API: POST /api/auth/login
   ================================================ */
(function () {
    'use strict';

    /* ── DOM Elements ────────────────────────────── */
    const form = document.getElementById('login-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const toggleBtn = document.getElementById('toggle-password');
    const submitBtn = document.getElementById('btn-submit');
    const btnText = document.getElementById('btn-text');
    const btnLoader = document.getElementById('btn-loader');
    const errorMsg = document.getElementById('error-message');

    /* ── Password Toggle ─────────────────────────── */
    toggleBtn?.addEventListener('click', () => {
        const type = passwordInput.type === 'password' ? 'text' : 'password';
        passwordInput.type = type;
    });

    /* ── Form Submit ─────────────────────────────── */
    form?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        // Validation
        if (!email || !password) {
            showError('Lütfen tüm alanları doldurun.');
            return;
        }

        // Loading state
        setLoading(true);
        hideError();

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                // Backend error mesajları
                if (response.status === 429) {
                    throw new Error(data.message || 'Çok fazla deneme. Lütfen bekleyin.');
                }
                if (response.status === 401) {
                    throw new Error('E-posta veya şifre hatalı.');
                }
                throw new Error(data.message || 'Giriş başarısız.');
            }

            // Token kaydet
            localStorage.setItem('jwtToken', data.token);

            // Success → Dashboard
            window.location.href = '/Html/dashboard.html';

        } catch (err) {
            showError(err.message);
            setLoading(false);
        }
    });

    /* ── Helpers ─────────────────────────────────── */
    function setLoading(loading) {
        submitBtn.disabled = loading;
        btnText.style.display = loading ? 'none' : '';
        btnLoader.style.display = loading ? '' : 'none';
    }

    function showError(msg) {
        errorMsg.textContent = msg;
        errorMsg.style.display = '';
    }

    function hideError() {
        errorMsg.style.display = 'none';
    }

    /* ── Auto-redirect if logged in ──────────────── */
    if (localStorage.getItem('jwtToken')) {
        window.location.replace('/Html/dashboard.html');
    }

})();