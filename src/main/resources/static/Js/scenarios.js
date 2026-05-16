/* ================================================
   Click&Run — scenarios.js  v3.0
   Template tabanlı · minimal innerHTML
   ================================================ */
(function () {
    'use strict';

    const token = localStorage.getItem('jwtToken');
    if (!token) { window.location.replace('/Html/login.html'); return; }

    const COLORS  = ['#3B82F6','#10B981','#8B5CF6','#F59E0B','#EF4444','#06B6D4'];
    let allData   = [];
    let viewMode  = localStorage.getItem('cr-view') || 'grid';
    let delTarget = null;

    /* ── API ─────────────────────────────────────── */
    function api(path, opts = {}) {
        return fetch(path, {
            ...opts,
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...(opts.headers || {})
            }
        }).then(r => {
            if (r.status === 401 || r.status === 403) {
                localStorage.removeItem('jwtToken');
                window.location.replace('/Html/login.html');
                throw new Error('Unauthorized');
            }
            return r.json().catch(() => ({}));
        });
    }

    /* ── Veri yükle ──────────────────────────────── */
    async function load() {
        try {
            const data = await api('/api/scenarios/list');
            allData = Array.isArray(data) ? data : [];
            document.getElementById('total-badge').textContent = allData.length + ' toplam';
            removeSkeleton();
            render(allData);
        } catch (e) {
            removeSkeleton();
            showEmpty(true);
        }
    }

    function removeSkeleton() {
        ['sk-c1','sk-c2','sk-c3'].forEach(id => document.getElementById(id)?.remove());
        document.getElementById('sk-grid')?.remove();
    }

    /* ── Render ──────────────────────────────────── */
    function render(list) {
        if (viewMode === 'grid') renderGrid(list);
        else                     renderList(list);
    }

    /* ── Kart grid ───────────────────────────────── */
    function renderGrid(list) {
        document.getElementById('grid-view').style.display = '';
        document.getElementById('list-view').style.display = 'none';

        const container = document.getElementById('card-container');
        const emptyEl   = document.getElementById('empty-grid');
        const tpl       = document.getElementById('tpl-card');

        // Temizle
        container.innerHTML = '';

        if (list.length === 0) {
            container.style.display = 'none';
            emptyEl.style.display   = '';
            return;
        }

        emptyEl.style.display   = 'none';
        container.style.display = 'grid';

        list.forEach((s, i) => {
            const clone = tpl.content.cloneNode(true);
            const card  = clone.querySelector('.scenario-card');
            const color = COLORS[s.id % COLORS.length];
            const steps = Array.isArray(s.steps) ? s.steps.length : 0;
            const delay = Math.min(i * 0.04, 0.4);

            // Animasyon
            card.style.animationDelay = delay + 's';
            card.classList.add('animate-up');

            // Renk bandı
            const band = clone.querySelector('[data-slot="band"]');
            band.style.background = `linear-gradient(135deg, ${color}18 0%, ${color}08 100%)`;

            // Mini adım önizleme
            buildPreview(clone.querySelector('[data-slot="preview"]'), steps, color);

            // ID chip
            clone.querySelector('[data-slot="id-chip"]').textContent = `#${s.id}`;

            // İsim
            clone.querySelector('[data-slot="name"]').textContent = s.scenarioName;

            // Adım badge
            clone.querySelector('[data-slot="badge-steps"]').textContent = `${steps} adım`;

            // Karta tıklama → builder
            card.addEventListener('click', e => {
                if (e.target.closest('button')) return;
                goBuilder(s.id);
            });

            // Çalıştır
            clone.querySelector('[data-slot="btn-run"]').addEventListener('click', e => {
                e.stopPropagation();
                runScenario(s.id, s.scenarioName);
            });

            // Sil
            clone.querySelector('[data-slot="btn-del"]').addEventListener('click', e => {
                e.stopPropagation();
                openDelModal(s.id, s.scenarioName);
            });

            container.appendChild(clone);
        });
    }

    /* Mini adım çubukları */
    function buildPreview(wrap, steps, color) {
        if (steps === 0) {
            const span = document.createElement('span');
            span.style.cssText = 'font-size:12px;color:var(--text-3);';
            span.textContent   = 'Adım yok';
            wrap.appendChild(span);
            return;
        }

        const count = Math.min(steps, 5);
        for (let i = 0; i < count; i++) {
            const bar = document.createElement('div');
            bar.style.cssText = `
        width:${i === 0 ? 48 : 32}px;height:22px;
        background:${color};border-radius:4px;
        opacity:${1 - i * 0.15};
      `;
            wrap.appendChild(bar);

            if (i < count - 1) {
                const sep = document.createElement('div');
                sep.style.cssText = `width:14px;height:1.5px;background:${color};opacity:0.4;`;
                wrap.appendChild(sep);
            }
        }

        if (steps > 5) {
            const more = document.createElement('span');
            more.style.cssText = `font-size:10px;color:${color};font-weight:700;margin-left:3px;`;
            more.textContent   = `+${steps - 5}`;
            wrap.appendChild(more);
        }
    }

    /* ── Liste görünümü ──────────────────────────── */
    function renderList(list) {
        document.getElementById('grid-view').style.display = 'none';
        document.getElementById('list-view').style.display = '';

        const tbody   = document.getElementById('list-tbody');
        const emptyEl = document.getElementById('empty-list');
        const tpl     = document.getElementById('tpl-list-row');

        tbody.innerHTML = '';

        if (list.length === 0) {
            emptyEl.style.display = '';
            return;
        }

        emptyEl.style.display = 'none';

        list.forEach(s => {
            const clone = tpl.content.cloneNode(true);
            const row   = clone.querySelector('[data-slot="row"]');
            const steps = Array.isArray(s.steps) ? s.steps.length : 0;

            clone.querySelector('[data-slot="id"]').textContent    = `#${s.id}`;
            clone.querySelector('[data-slot="name"]').textContent  = s.scenarioName;
            clone.querySelector('[data-slot="steps"]').textContent = `${steps} adım`;

            // Satır tıklama
            row.addEventListener('click', e => {
                if (e.target.closest('button')) return;
                goBuilder(s.id);
            });

            // Çalıştır
            clone.querySelector('[data-slot="btn-run"]').addEventListener('click', () => {
                runScenario(s.id, s.scenarioName);
            });

            // Sil
            clone.querySelector('[data-slot="btn-del"]').addEventListener('click', () => {
                openDelModal(s.id, s.scenarioName);
            });

            tbody.appendChild(clone);
        });
    }

    /* ── Boş durum ───────────────────────────────── */
    function showEmpty(show) {
        document.getElementById('empty-grid').style.display = show ? '' : 'none';
    }

    /* ── Yönlendirme & Aksiyonlar ────────────────── */
    function goBuilder(id) {
        window.location.assign(`../Html/scenario-builder.html`);
    }

    async function runScenario(id, name) {
        showToast(`"${name}" başlatılıyor...`, 'info');
        try {
            await fetch(`/api/scenarios/run/${id}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            showToast('Test başlatıldı!', 'success');
        } catch (e) {
            showToast('Başlatılamadı.', 'error');
        }
    }

    /* ── Silme modal ─────────────────────────────── */
    function openDelModal(id, name) {
        delTarget = id;
        document.getElementById('del-name').textContent = name;
        document.getElementById('del-modal').classList.add('open');
    }

    function closeDelModal() {
        document.getElementById('del-modal').classList.remove('open');
        delTarget = null;
    }

    async function doDelete() {
        if (!delTarget) return;

        const btn     = document.getElementById('del-confirm');
        btn.disabled  = true;
        btn.textContent = 'Siliniyor...';

        try {
            await api(`/api/scenarios/delete/${delTarget}`, { method: 'DELETE' });
            closeDelModal();
            showToast('Senaryo silindi.', 'success');
            load();
        } catch (e) {
            showToast('Silinemedi.', 'error');
        } finally {
            btn.disabled    = false;
            btn.textContent = 'Evet, Sil';
        }
    }

    /* ── Yeni senaryo modal ──────────────────────── */
    function openNewModal() {
        document.getElementById('new-name').value          = '';
        document.getElementById('new-desc').value          = '';
        document.getElementById('new-modal-msg').style.display = 'none';
        document.getElementById('new-modal').classList.add('open');
        setTimeout(() => document.getElementById('new-name').focus(), 80);
    }

    function closeNewModal() {
        document.getElementById('new-modal').classList.remove('open');
    }

    async function createScenario() {
        const name = document.getElementById('new-name').value.trim();
        if (!name) {
            showFormMsg('Senaryo adı zorunludur.', 'error');
            return;
        }

        const btn       = document.getElementById('new-modal-create');
        btn.disabled    = true;
        btn.textContent = 'Oluşturuluyor...';

        try {
            const res = await api('/api/scenarios/create', {
                method: 'POST',
                body:   JSON.stringify({ scenarioName: name, steps: [] })
            });

            if (res && res.id) {
                closeNewModal();
                showToast('Senaryo oluşturuldu!', 'success');
                goBuilder(res.id);
            } else {
                showFormMsg('Oluşturulamadı, tekrar deneyin.', 'error');
            }
        } catch (e) {
            showFormMsg('Bağlantı hatası.', 'error');
        } finally {
            btn.disabled    = false;
            btn.textContent = 'Oluştur ve Tasarıma Geç';
        }
    }

    function showFormMsg(msg, type) {
        const el         = document.getElementById('new-modal-msg');
        el.textContent   = msg;
        el.className     = `form-msg ${type}`;
        el.style.display = 'block';
    }

    /* ── Görünüm toggle ──────────────────────────── */
    function setView(mode) {
        viewMode = mode;
        localStorage.setItem('cr-view', mode);
        document.getElementById('view-grid').style.color =
            mode === 'grid' ? 'var(--accent)' : '';
        document.getElementById('view-list').style.color =
            mode === 'list' ? 'var(--accent)' : '';
        render(allData);
    }

    /* ── Arama ───────────────────────────────────── */
    function applySearch(term) {
        if (!term) { render(allData); return; }
        const filtered = allData.filter(s =>
            s.scenarioName.toLowerCase().includes(term.toLowerCase())
        );
        render(filtered);
    }

    /* ── Event listeners ─────────────────────────── */
    document.addEventListener('DOMContentLoaded', () => {
        load();
        setView(viewMode);

        // Yeni senaryo
        document.getElementById('btn-new')
            ?.addEventListener('click', openNewModal);
        document.getElementById('empty-new-btn')
            ?.addEventListener('click', openNewModal);
        document.getElementById('new-modal-close')
            ?.addEventListener('click', closeNewModal);
        document.getElementById('new-modal-cancel')
            ?.addEventListener('click', closeNewModal);
        document.getElementById('new-modal-create')
            ?.addEventListener('click', createScenario);
        document.getElementById('new-modal')
            ?.addEventListener('click', e => {
                if (e.target === e.currentTarget) closeNewModal();
            });
        document.getElementById('new-name')
            ?.addEventListener('keydown', e => {
                if (e.key === 'Enter') createScenario();
            });

        // Silme modal
        document.getElementById('del-confirm')
            ?.addEventListener('click', doDelete);
        document.getElementById('del-cancel')
            ?.addEventListener('click', closeDelModal);
        document.getElementById('del-modal-close')
            ?.addEventListener('click', closeDelModal);
        document.getElementById('del-modal')
            ?.addEventListener('click', e => {
                if (e.target === e.currentTarget) closeDelModal();
            });

        // Görünüm
        document.getElementById('view-grid')
            ?.addEventListener('click', () => setView('grid'));
        document.getElementById('view-list')
            ?.addEventListener('click', () => setView('list'));

        // Arama
        document.getElementById('search-input')
            ?.addEventListener('input', e => applySearch(e.target.value));

        // Filtre tab
        document.querySelectorAll('.ftab').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.ftab')
                    .forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                if (btn.dataset.filter === 'recent') {
                    render([...allData].sort((a, b) => b.id - a.id).slice(0, 10));
                } else {
                    render(allData);
                }
            });
        });

        // Boş durum yeni buton (dinamik eklenen)
        document.addEventListener('click', e => {
            if (e.target.id === 'empty-new-btn') openNewModal();
        });
    });

})();