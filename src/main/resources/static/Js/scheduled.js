/* ================================================
   Click&Run — scheduled.js v2
   Zamanlanmış testler yönetimi
   ================================================ */
(function () {
    'use strict';

    const token = localStorage.getItem('jwtToken');
    if (!token) {
        window.location.replace('/Html/login.html');
        return;
    }

    /* ── State ───────────────────────────────────── */
    let schedules = [];
    let scenarios = [];
    let editingId = null;
    let selectedMode = 'INTERVAL';

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

    /* ── Load Data ───────────────────────────────── */
    async function loadSchedules() {
        try {
            schedules = await api('/api/schedules');
            renderStats();
            renderTable();
        } catch (e) {
            showToast('Zamanlamalar yüklenemedi.', 'error');
        }
    }

    async function loadScenarios() {
        try {
            scenarios = await api('/api/scenarios/list');
            renderScenarioOptions();
        } catch (e) {
            console.error('Scenarios load error:', e);
        }
    }

    /* ── Render Stats ────────────────────────────── */
    function renderStats() {
        const total = schedules.length;
        const active = schedules.filter(s => s.active).length;
        const passive = total - active;

        document.getElementById('stat-total').textContent = total;
        document.getElementById('stat-active').textContent = active;
        document.getElementById('stat-passive').textContent = passive;
    }

    /* ── Render Table ────────────────────────────── */
    function renderTable() {
        const tbody = document.getElementById('schedule-tbody');
        const table = document.getElementById('schedule-table');
        const empty = document.getElementById('empty-state');

        if (schedules.length === 0) {
            table.style.display = 'none';
            empty.style.display = '';
            return;
        }

        table.style.display = '';
        empty.style.display = 'none';
        tbody.innerHTML = '';

        const tpl = document.getElementById('tpl-schedule-row');

        schedules.forEach((s, idx) => {
            const clone = tpl.content.cloneNode(true);
            const row = clone.querySelector('[data-slot="row"]');

            // ID
            clone.querySelector('[data-slot="id"]').textContent = `#${s.id || idx + 1}`;

            // Senaryo
            clone.querySelector('[data-slot="name"]').textContent =
                s.scenario?.scenarioName || 'Senaryo';

            // Mod Badge
            const modeBadge = clone.querySelector('[data-slot="mode"]');
            if (s.scheduleMode === 'INTERVAL') {
                modeBadge.textContent = '🔄 Periyodik';
                modeBadge.className = 'badge badge-periodic';
            } else {
                modeBadge.textContent = '🌙 Günlük Sabit';
                modeBadge.className = 'badge badge-daily';
            }

            // Frequency
            const freq = s.scheduleMode === 'INTERVAL'
                ? `Her ${s.intervalMinutes} dakikada`
                : `Günlük ${s.dailyTime}`;
            clone.querySelector('[data-slot="frequency"]').textContent = freq;

            // Son Çalışma
            clone.querySelector('[data-slot="last"]').textContent =
                s.lastRunAt ? formatDateTime(s.lastRunAt) : '—';

            // Sonraki Çalışma
            clone.querySelector('[data-slot="next"]').textContent =
                s.nextRunAt ? formatDateTime(s.nextRunAt) : '—';

            // Toggle
            const toggle = clone.querySelector('[data-slot="toggle"]');
            toggle.checked = s.active;
            toggle.addEventListener('change', () => toggleSchedule(s.id, toggle.checked));

            // Edit
            clone.querySelector('[data-slot="btn-edit"]')
                .addEventListener('click', () => openEditModal(s));

            // Delete
            clone.querySelector('[data-slot="btn-delete"]')
                .addEventListener('click', () => deleteSchedule(s.id));

            // Inactive style
            if (!s.active) row.style.opacity = '0.6';

            tbody.appendChild(clone);
        });
    }

    function renderScenarioOptions() {
        const sel = document.getElementById('modal-scenario');
        sel.innerHTML = '<option value="">Senaryo seçin...</option>';

        scenarios.forEach(sc => {
            const opt = document.createElement('option');
            opt.value = sc.id;
            opt.textContent = sc.scenarioName;
            sel.appendChild(opt);
        });
    }

    /* ── Modal ───────────────────────────────────── */
    function openNewModal() {
        editingId = null;
        selectedMode = 'INTERVAL';

        document.getElementById('modal-title').textContent = 'Yeni Zamanlama';
        document.getElementById('modal-scenario').value = '';
        document.getElementById('modal-scenario').disabled = false;
        document.getElementById('modal-interval').value = '360';
        document.getElementById('modal-time').value = '03:00';
        document.getElementById('modal-passive').checked = false;

        setModeActive('INTERVAL');
        updateIntervalHint();
        hideError();
        document.getElementById('schedule-modal').classList.add('open');
    }

    function openEditModal(s) {
        editingId = s.id;
        selectedMode = s.scheduleMode;

        document.getElementById('modal-title').textContent = `${s.scenario?.scenarioName || 'Senaryo'} — Zamanlama`;
        document.getElementById('modal-scenario').value = s.scenario.id;
        document.getElementById('modal-scenario').disabled = true;

        if (s.scheduleMode === 'INTERVAL') {
            document.getElementById('modal-interval').value = s.intervalMinutes || 360;
        } else {
            document.getElementById('modal-time').value = s.dailyTime || '03:00';
        }

        document.getElementById('modal-passive').checked = !s.active;

        setModeActive(s.scheduleMode);
        updateIntervalHint();
        hideError();
        document.getElementById('schedule-modal').classList.add('open');
    }

    function closeModal() {
        document.getElementById('schedule-modal').classList.remove('open');
        document.getElementById('modal-scenario').disabled = false;
        editingId = null;
    }

    function setModeActive(mode) {
        selectedMode = mode;

        // Update cards
        document.getElementById('mode-periodic').classList.toggle('active', mode === 'INTERVAL');
        document.getElementById('mode-daily').classList.toggle('active', mode === 'DAILY');

        // Update config visibility
        document.getElementById('periodic-config').style.display =
            mode === 'INTERVAL' ? '' : 'none';
        document.getElementById('daily-config').style.display =
            mode === 'DAILY' ? '' : 'none';
    }

    /* ── CRUD Operations ─────────────────────────── */
    async function saveSchedule() {
        const scenarioId = document.getElementById('modal-scenario').value;
        const interval   = document.getElementById('modal-interval').value;
        const time       = document.getElementById('modal-time').value;
        const passive    = document.getElementById('modal-passive').checked;

        // Validation
        if (!scenarioId) {
            showError('Lütfen bir senaryo seçin.');
            return;
        }

        if (selectedMode === 'INTERVAL' && (!interval || interval < 1)) {
            showError('Aralık en az 1 dakika olmalıdır.');
            return;
        }

        const payload = {
            scenarioId,
            scheduleMode: selectedMode,
            active: !passive,
        };

        if (selectedMode === 'INTERVAL') {
            payload.intervalMinutes = parseInt(interval);
        } else {
            payload.dailyTime = time;
        }

        try {
            if (editingId) {
                await api(`/api/schedules/${editingId}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload),
                });
                showToast('Zamanlama güncellendi.', 'success');
            } else {
                await api('/api/schedules', {
                    method: 'POST',
                    body: JSON.stringify(payload),
                });
                showToast('Zamanlama oluşturuldu.', 'success');
            }

            closeModal();
            loadSchedules();
        } catch (e) {
            showError(e.message || 'İşlem başarısız.');
        }
    }

    async function toggleSchedule(id, active) {
        try {
            await api(`/api/schedules/${id}/toggle`, { method: 'PATCH' });

            const s = schedules.find(x => x.id === id);
            if (s) s.active = active;

            showToast(
                active ? 'Zamanlama aktif edildi.' : 'Zamanlama duraklatıldı.',
                'success'
            );
            renderStats();
        } catch (e) {
            showToast('İşlem başarısız.', 'error');
            loadSchedules();
        }
    }

    async function deleteSchedule(id) {
        if (!confirm('Bu zamanlamayı silmek istediğinize emin misiniz?')) return;

        try {
            await api(`/api/schedules/${id}`, { method: 'DELETE' });
            showToast('Zamanlama silindi.', 'success');
            loadSchedules();
        } catch (e) {
            showToast('Silme işlemi başarısız.', 'error');
        }
    }

    /* ── Helpers ─────────────────────────────────── */
    function formatDateTime(isoStr) {
        const d = new Date(isoStr);
        return d.toLocaleDateString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function updateIntervalHint() {
        const val = parseInt(document.getElementById('modal-interval').value) || 0;
        const hint = document.getElementById('interval-hint');

        if (val < 60) {
            hint.textContent = `🚀 Her ${val} dakikada bir çalışır`;
        } else if (val < 1440) {
            const hours = (val / 60).toFixed(1);
            hint.textContent = `🚀 Her ${hours} saatte bir çalışır`;
        } else {
            const days = (val / 1440).toFixed(1);
            hint.textContent = `🚀 Her ${days} günde bir çalışır`;
        }
    }

    function showError(msg) {
        const el = document.getElementById('modal-error');
        el.textContent = msg;
        el.style.display = '';
    }

    function hideError() {
        document.getElementById('modal-error').style.display = 'none';
    }

    function showToast(msg, type) {
        if (window.showToast) window.showToast(msg, type);
    }

    /* ── Event Listeners ─────────────────────────── */
    function attachEvents() {
        // New buttons
        ['btn-new-schedule', 'btn-new-empty'].forEach(id => {
            document.getElementById(id)?.addEventListener('click', openNewModal);
        });

        // Refresh
        document.getElementById('btn-refresh')?.addEventListener('click', loadSchedules);

        // Modal controls
        document.getElementById('modal-close')?.addEventListener('click', closeModal);
        document.getElementById('modal-cancel')?.addEventListener('click', closeModal);
        document.getElementById('modal-save')?.addEventListener('click', saveSchedule);

        // Mode cards
        document.getElementById('mode-periodic')?.addEventListener('click', () => {
            setModeActive('INTERVAL');
        });
        document.getElementById('mode-daily')?.addEventListener('click', () => {
            setModeActive('DAILY');
        });

        // Preset buttons
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const val = btn.dataset.value;
                document.getElementById('modal-interval').value = val;
                updateIntervalHint();

                // Active state
                document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // Interval input change
        document.getElementById('modal-interval')?.addEventListener('input', updateIntervalHint);

        // Modal overlay click
        document.getElementById('schedule-modal')?.addEventListener('click', e => {
            if (e.target === e.currentTarget) closeModal();
        });
    }

    /* ── Init ────────────────────────────────────── */
    document.addEventListener('DOMContentLoaded', () => {
        loadScenarios();
        loadSchedules();
        attachEvents();
    });

})();