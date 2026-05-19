(function () {

    function createLoader() {
        if (document.getElementById('aft-loader')) return;
        const loader = document.createElement('div');
        loader.id = 'aft-loader';
        loader.className = 'page-loader';
        loader.innerHTML = `
      <div class="loader-logo">
        <div class="loader-logo-mark">C</div>
        <span>Click<strong>&Run</strong></span>
      </div>
      <div class="loader-bar">
        <div class="loader-bar-fill"></div>
      </div>
    `;
        document.body.prepend(loader);
    }

    function hideLoader() {
        const loader = document.getElementById('aft-loader');
        if (!loader) return;
        setTimeout(() => {
            loader.classList.add('hidden');
            setTimeout(() => loader.remove(), 350);
        }, 200);
    }

    function decodeJwtPart(part) {
        if (!part) return null;
        let base64 = part.replace(/-/g, '+').replace(/_/g, '/');
        base64 += '='.repeat((4 - (base64.length % 4)) % 4);
        try {
            return JSON.parse(atob(base64));
        } catch {
            return null;
        }
    }

    function getValidToken() {
        const token = localStorage.getItem('jwtToken');
        if (!token) return null;

        const parts = token.split('.');
        if (parts.length !== 3) {
            localStorage.removeItem('jwtToken');
            return null;
        }

        const payload = decodeJwtPart(parts[1]);
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

    function handleAuthFailure() {
        localStorage.removeItem('jwtToken');
        window.location.replace('/Html/login.html');
    }

    window.AuthUtils = {
        decodeJwtPart,
        getValidToken,
        handleAuthFailure
    };
    void window.AuthUtils.getValidToken;
    void window.AuthUtils.handleAuthFailure;

    function animateContent() {
        const main = document.querySelector('.aft-main');
        if (main) {
            main.style.opacity = '0';
            main.style.transform = 'translateY(8px)';
            requestAnimationFrame(() => {
                main.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
                main.style.opacity = '1';
                main.style.transform = 'translateY(0)';
            });
        }
    }

    function setupTransitions() {
        document.addEventListener('click', e => {
            const link = e.target.closest('a[href]');
            if (!link) return;
            if (link.target === '_blank') return;
            if (link.href.startsWith('javascript:')) return;
            if (link.href.startsWith('#')) return;
            if (link.hostname !== window.location.hostname) return;
            if (link.href === window.location.href) return;

            e.preventDefault();
            const href = link.href;

            const loader = document.getElementById('aft-loader');
            if (loader) {
                loader.classList.remove('hidden');
                const fill = loader.querySelector('.loader-bar-fill');
                if (fill) {
                    fill.style.animation = 'none';
                    fill.offsetHeight;
                    fill.style.animation = '';
                }
            } else {
                createLoader();
            }

            setTimeout(() => window.location.assign(href), 280);
        });
    }

    function checkAuth() {
        const path = window.location.pathname.toLowerCase();
        const isPublic = ['login', 'register'].some(p => path.includes(p));
        if (!isPublic) {
            const token = getValidToken();
            if (!token) {
                handleAuthFailure();
                return false;
            }
        }
        return true;
    }

    function init() {
        const path = window.location.pathname.toLowerCase();
        const isAuthPage = ['login', 'register'].some(p => path.includes(p));

        if (!isAuthPage) {
            if (!checkAuth()) return;
            createLoader();
        }

        document.addEventListener('DOMContentLoaded', () => {
            hideLoader();
            if (!isAuthPage) animateContent();
        });

        if (document.readyState !== 'loading') {
            hideLoader();
            if (!isAuthPage) animateContent();
        }

        setupTransitions();
    }

    init();

})();