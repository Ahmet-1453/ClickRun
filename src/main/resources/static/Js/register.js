/* ================================================
   Click&Run — register.js
   Backend API: POST /api/auth/register
   ================================================ */
(function () {
    'use strict';

    /* ── DOM Elements ────────────────────────────── */
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

    /* ── Password Toggle ─────────────────────────── */
    toggleBtn?.addEventListener('click', () => {
        const type = passwordInput.type === 'password' ? 'text' : 'password';
        passwordInput.type = type;
    });

    /* ── Form Submit ─────────────────────────────── */
    form?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = usernameInput.value.trim();
        const email = emailInput.value.trim();
        const password = passwordInput.value;

        // Validation
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

        // Loading state
        setLoading(true);
        hideMessages();

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                // Backend error
                if (response.status === 409) {
                    throw new Error('Bu e-posta adresi zaten kayıtlı.');
                }
                throw new Error(data.message || 'Kayıt başarısız.');
            }

            // Success
            showSuccess('Kayıt başarılı! Giriş sayfasına yönlendiriliyorsunuz...');

            // Clear form
            form.reset();

            // Redirect after 2 seconds
            setTimeout(() => {
                window.location.href = '/Html/login.html';
            }, 2000);

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

    /* ── Auto-redirect if logged in ──────────────── */
    if (localStorage.getItem('jwtToken')) {
        window.location.replace('/Html/dashboard.html');
    }

})();