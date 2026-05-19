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

    const form = document.getElementById('register-form');
    const usernameInput = document.getElementById('username');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const toggleBtn = document.getElementById('toggle-password');
    const submitBtn = document.getElementById('btn-submit');
    const btnText = document.getElementById('btn-text');
    const btnLoader = document.getElementById('btn-loader');
    const errorMsg = document.getElementById('error-message');
    const successMsg = document.getElementById('success-message');

    toggleBtn?.addEventListener('click', () => {
        const type = passwordInput.type === 'password' ? 'text' : 'password';
        passwordInput.type = type;
    });

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = usernameInput.value.trim();
        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!username || !email || !password) {
            showError('Lütfen tüm alanları doldurun.');
            return;
        }

        if (username.length < 3) {
            showError('Kullanıcı adı en az 3 karakter olmalıdır.');
            return;
        }

        if (password.length < 6) {
            showError('Şifre en az 6 karakter olmalıdır.');
            return;
        }

        if (!isValidEmail(email)) {
            showError('Geçerli bir e-posta adresi girin.');
            return;
        }

        setLoading(true);
        hideMessages();

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });

            if (!response.ok) {
                if (response.status === 409) {
                    throw new Error('Bu e-posta adresi zaten kayıtlı.');
                }
                const data = await response.json().catch(() => ({}));
                throw new Error(data.message || 'Kayıt başarısız.');
            }

            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                await response.json().catch(() => ({}));
            } else {
                await response.text().catch(() => '');
            }

            showSuccess('Kayıt başarılı! Giriş sayfasına yönlendiriliyorsunuz...');
            form.reset();

            setTimeout(() => {
                window.location.href = '/Html/login.html';
            }, 2000);

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

    function showSuccess(msg) {
        successMsg.textContent = msg;
        successMsg.style.display = '';
    }

    function hideMessages() {
        errorMsg.style.display = 'none';
        successMsg.style.display = 'none';
    }

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    if (getValidToken()) {
        window.location.replace('/Html/dashboard.html');
    }
})();