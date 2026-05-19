/* ================================================
   Click&Run — dashboard.js  v5.0
   Sade: 3 stat + son 10 senaryo tablosu
   ================================================ */
(function () {
    'use strict';

    const token = window.AuthUtils?.getValidToken?.() || localStorage.getItem('jwtToken');
    if (!token) { window.location.replace('/Html/login.html'); return; }

    /* ── API ─────────────────────────────────────── */
    function api(path) {
        return fetch(path, {
            headers: { Authorization: `Bearer ${token}` }
        }).then(r => {
            if (r.status === 401 || r.status === 403) {
                window.AuthUtils?.handleAuthFailure?.();
                throw new Error('Unauthorized');
            }
            return r.json().catch(() => ({}));
        });
    }

    /* ── Başlat ──────────────────────────────────── */
    async function init() {
        try {
            const [stats, runs] = await Promise.all([
                api('/api/scenarios/dashboard-stats'),
                api('/api/test-runs/history')
            ]);
            removeSkeleton();
            renderStats(stats, runs);
            renderTable(stats.recentScenarios || []);
        } catch (e) {
            console.error('Dashboard yüklenemedi:', e);
        }
    }

    /* ── Skeleton kaldır ─────────────────────────── */
    function removeSkeleton() {
        ['sk-s1','sk-s2','sk-s3','sk-r1','sk-r2','sk-r3']
            .forEach(id => document.getElementById(id)?.remove());
    }

    /* ── Stat kartları ───────────────────────────── */
    function renderStats(stats, runs) {
        const total   = runs.length;
        const success = runs.filter(isOk).length;
        const fail    = total - success;

        const cards = [
            { icon: '▦',  label: 'Toplam Senaryo',   value: stats.totalScenarios ?? 0, delta: null,   color: '#F97316' },
            { icon: '✓',  label: 'Başarılı Koşum',   value: success,                   delta: null,   color: '#10B981' },
            { icon: '✕',  label: 'Başarısız Koşum',  value: fail,                      delta: null,   color: '#EF4444' },
        ];

        const grid = document.getElementById('stat-grid');
        const tpl  = document.getElementById('tpl-stat');

        cards.forEach(c => {
            const clone = tpl.content.cloneNode(true);
            const card  = clone.querySelector('[data-slot="card"]');
            card.style.borderLeft = `3px solid ${c.color}`;

            clone.querySelector('[data-slot="icon"]').textContent  = c.icon;
            clone.querySelector('[data-slot="label"]').textContent = c.label;
            clone.querySelector('[data-slot="value"]').textContent = c.value;

            const delta = clone.querySelector('[data-slot="delta"]');
            if (c.delta) {
                delta.textContent = c.delta;
                delta.style.color = c.color;
            } else {
                delta.remove();
            }

            grid.appendChild(clone);
        });
    }

    /* ── Senaryo tablosu ─────────────────────────── */
    function renderTable(list) {
        const tbody = document.getElementById('scenario-tbody');
        const tpl   = document.getElementById('tpl-row');

        if (list.length === 0) {
            tbody.innerHTML = `
        <tr>
          <td colspan="5"
            style="text-align:center;padding:48px;color:var(--text-3);font-size:13px;">
            Henüz senaryo eklenmedi.
          </td>
        </tr>`;
            return;
        }

        // En son eklenen 10 tanesi (id'ye göre azalan)
        const sorted = [...list]
            .sort((a, b) => b.id - a.id)
            .slice(0, 10);

        sorted.forEach(s => {
            const clone = tpl.content.cloneNode(true);
            const row   = clone.querySelector('[data-slot="row"]');
            const steps = Array.isArray(s.steps) ? s.steps.length : 0;

            // Tıklayınca scenarios.html'e git
            row.addEventListener('click', () => {
                window.location.assign('../Html/scenarios.html');
            });

            // Hover
            row.addEventListener('mouseenter', () => row.style.background = 'var(--surface-2)');
            row.addEventListener('mouseleave', () => row.style.background = '');

            clone.querySelector('[data-slot="id"]').textContent    = `#${s.id}`;
            clone.querySelector('[data-slot="name"]').textContent  = s.scenarioName;
            clone.querySelector('[data-slot="sub"]').textContent   = buildSub(s);
            clone.querySelector('[data-slot="steps"]').textContent = `${steps} Adım`;
            clone.querySelector('[data-slot="date"]').textContent  = fmtDate(s.updatedAt || s.createdAt);

            tbody.appendChild(clone);
        });
    }

    /* ── Yardımcılar ─────────────────────────────── */
    function isOk(r) {
        return r.success === true || r.isSuccess === true;
    }

    function fmtDate(iso) {
        if (!iso) return '—';
        return new Date(iso).toLocaleDateString('tr-TR', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        });
    }

    function buildSub(s) {
        if (s.description) return s.description;
        if (s.targetUrl)   return s.targetUrl;
        return '—';
    }

    /* ── Başlat ──────────────────────────────────── */
    document.addEventListener('DOMContentLoaded', init);

})();