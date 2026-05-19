(function () {
    'use strict';

    function decodeJwtPart(part) {
        if (!part) return null;
        let base64 = part.replace(/-/g, '+').replace(/_/g, '/');
        base64 += '='.repeat((4 - (base64.length % 4)) % 4);
        try { return JSON.parse(atob(base64)); } catch { return null; }
    }

    function getValidToken() {
        const token = localStorage.getItem('jwtToken');
        if (!token) return null;

        const parts = token.split('.');
        if (parts.length !== 3) {
            localStorage.removeItem('jwtToken');
            return null;
        }

        const payload = (window.AuthUtils?.decodeJwtPart || decodeJwtPart)(parts[1]);
        if (!payload) {
            localStorage.removeItem('jwtToken');
            return null;
        }

        if (payload.exp && Date.now() >= payload.exp * 1000) {
            localStorage.removeItem('jwtToken');
            return null;
        }

        return token;
    }

    const form = document.getElementById('login-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const toggleBtn = document.getElementById('toggle-password');
    const submitBtn = document.getElementById('btn-submit');
    const btnText = document.getElementById('btn-text');
    const btnLoader = document.getElementById('btn-loader');
    const errorMsg = document.getElementById('error-message');

    toggleBtn?.addEventListener('click', () => {
        const type = passwordInput.type === 'password' ? 'text' : 'password';
        passwordInput.type = type;
    });

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || !password) {
            showError('Lütfen tüm alanları doldurun.');
            return;
        }

        setLoading(true);
        hideError();

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                if (response.status === 429) {
                    throw new Error(data.message || 'Çok fazla deneme. Lütfen bekleyin.');
                }
                if (response.status === 401) {
                    throw new Error('E-posta veya şifre hatalı.');
                }
                throw new Error(data.message || 'Giriş başarısız.');
            }

            const data = await response.json().catch(() => ({}));

            if (!data.token || typeof data.token !== 'string') {
                throw new Error('Geçersiz token alındı. Lütfen tekrar deneyin.');
            }

            localStorage.setItem('jwtToken', data.token);

            window.location.replace('/Html/dashboard.html');

        } catch (err) {
            showError(err.message);
            setLoading(false);
        }
    });

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

    if (getValidToken()) {
        window.location.replace('/Html/dashboard.html');
    }
})();