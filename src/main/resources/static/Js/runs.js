/* ================================================
   Click&Run — runs.js  v4.0
   ─────────────────────────────────────────────────
   v3 → v4 DEĞİŞİKLİKLER:
   [+] Kullanıcı avatarı + isim kolonu
   [+] Adım ilerleme: "7/12 ⚠" formatı
   [+] RUNNING + SKIPPED durum badge'leri
   [+] Zaman: "X dakika önce" + alt satırda tarih
   [+] Tetikleyen ikonlu (Manuel/CI/Zamanlı)
   [+] Drawer: Adım geçmişi listesi
   [+] Drawer: Log İndir → Rapor İndir (Excel)
   [~] isOk() → getStatus() ile genişletildi
   [~] fmtDate() → fmtRelative() + fmtAbs() ayrıldı
   [~] Stat: Başarı Oranı (ort. süre yerine)
   [~] <style> head'e taşındı
   ================================================ */
(function () {
    'use strict';

    const token = localStorage.getItem('jwtToken');
    if (!token) { window.location.replace('/Html/login.html'); return; }

    /* ── State ──────────────────────────────────── */
    let allRuns      = [];
    let filtered     = [];
    let activeStatus = 'ALL';
    let activeDate   = 'week';
    let searchTerm   = '';
    let drawerRunId  = null;

    // [+] Kullanıcı avatarı için deterministik renk paleti
    const AV_COLORS = [
        '#3B82F6','#10B981','#8B5CF6',
        '#F59E0B','#EF4444','#06B6D4',
        '#EC4899','#84CC16'
    ];

    /* ── API ──────────────────────────────────────── */
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

    /* ── Veri yükle ───────────────────────────────── */
    async function load() {
        try {
            const data = await api('/api/test-runs/history');
            // [~] runDate veya timestamp her ikisini de dene
            allRuns = (data || []).sort((a, b) =>
                new Date(b.runDate || b.timestamp || 0) -
                new Date(a.runDate || a.timestamp || 0)
            );
            removeSkeleton();
            renderStats();
            applyFilters();
        } catch (e) {
            removeSkeleton();
            showToast('Koşumlar yüklenemedi.', 'error');
        }
    }

    function removeSkeleton() {
        ['sk-s1','sk-s2','sk-s3','sk-s4',
            'sk-r1','sk-r2','sk-r3']
            .forEach(id => document.getElementById(id)?.remove());
    }

    /* ── Durum yardımcısı ─────────────────────────── */
    // [~] v3'te sadece isOk() vardı
    function getStatus(r) {
        if (r.status === 'RUNNING') return 'RUNNING';
        if (r.status === 'SKIPPED') return 'SKIPPED';
        if (r.success === true || r.isSuccess === true) return 'SUCCESS';
        return 'FAIL';
    }

    /* ── Stat kartları ────────────────────────────── */
    // [~] 4. kart: ort. süre kaldırıldı → Başarı Oranı eklendi
    function renderStats() {
        const total   = allRuns.length;
        const success = allRuns.filter(r => getStatus(r) === 'SUCCESS').length;
        const fail    = allRuns.filter(r => getStatus(r) === 'FAIL').length;
        const rate    = total > 0 ? Math.round((success / total) * 100) : 0;

        const cards = [
            {
                bg: '#EFF6FF', color: '#3B82F6', label: 'TOPLAM KOŞUM', value: total,
                path: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>'
            },
            {
                bg: '#ECFDF5', color: '#10B981', label: 'BAŞARILI', value: success,
                path: '<polyline points="20 6 9 17 4 12"/>'
            },
            {
                bg: '#FEF2F2', color: '#EF4444', label: 'BAŞARISIZ', value: fail,
                path: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>'
            },
            {
                bg: '#FFF7ED', color: '#F97316', label: 'BAŞARI ORANI', value: rate + '%',
                path: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>'
            },
        ];

        const grid = document.getElementById('stat-grid');
        const tpl  = document.getElementById('tpl-stat');

        cards.forEach(c => {
            const clone   = tpl.content.cloneNode(true);
            const wrap    = clone.querySelector('[data-slot="icon-wrap"]');
            const svg     = clone.querySelector('[data-slot="icon-svg"]');

            wrap.style.background = c.bg;
            svg.style.color       = c.color;
            svg.innerHTML         = c.path;  // sadece SVG path, XSS riski yok

            clone.querySelector('[data-slot="label"]').textContent = c.label;
            clone.querySelector('[data-slot="value"]').textContent = c.value;

            grid.appendChild(clone);
        });
    }

    /* ── Filtrele ─────────────────────────────────── */
    function applyFilters() {
        const now   = Date.now();
        const dayMs = 86_400_000;

        filtered = allRuns.filter(r => {
            const st = getStatus(r);

            // [~] RUNNING filtresi eklendi
            if (activeStatus === 'SUCCESS' && st !== 'SUCCESS') return false;
            if (activeStatus === 'FAIL'    && st !== 'FAIL')    return false;
            if (activeStatus === 'RUNNING' && st !== 'RUNNING') return false;

            // Tarih — [~] timestamp fallback eklendi
            const ds = r.runDate || r.timestamp;
            if (activeDate !== 'all' && ds) {
                const diff = now - new Date(ds).getTime();
                if (activeDate === 'today' && diff > dayMs)       return false;
                if (activeDate === 'week'  && diff > 7  * dayMs)  return false;
                if (activeDate === 'month' && diff > 30 * dayMs)  return false;
            }

            // [+] Arama: kullanıcı adında da arar
            if (searchTerm) {
                const name = (r.scenario?.scenarioName || '').toLowerCase();
                const id   = String(r.id);
                const user = (r.triggeredBy || r.userName || '').toLowerCase();
                if (!name.includes(searchTerm) &&
                    !id.includes(searchTerm)   &&
                    !user.includes(searchTerm)) return false;
            }

            return true;
        });

        renderTable();
    }

    /* ── Tablo render ─────────────────────────────── */
    function renderTable() {
        const tbody   = document.getElementById('runs-tbody');
        const emptyEl = document.getElementById('runs-empty');
        const tpl     = document.getElementById('tpl-run-row');

        tbody.innerHTML = '';

        if (filtered.length === 0) {
            emptyEl.style.display = '';
            return;
        }
        emptyEl.style.display = 'none';

        filtered.forEach(r => {
            const clone  = tpl.content.cloneNode(true);
            const row    = clone.querySelector('[data-slot="row"]');
            const status = getStatus(r);
            const ds     = r.runDate || r.timestamp;

            // [~] Badge: createElement, class ile (v3'te innerHTML vardı)
            clone.querySelector('[data-slot="status-td"]')
                .appendChild(makeBadge(status));

            // Senaryo adı + meta satırı
            clone.querySelector('[data-slot="name"]').textContent =
                r.scenario?.scenarioName || '—';
            const metaParts = [`R-${r.id}`];
            if (r.scenario?.code)  metaParts.push(r.scenario.code);
            if (r.scenarioVersion) metaParts.push(`v${r.scenarioVersion}`);
            clone.querySelector('[data-slot="meta"]').textContent =
                metaParts.join(' · ');

            // [+] Adım ilerleme
            clone.querySelector('[data-slot="steps-td"]')
                .appendChild(makeStepsProgress(r, status));

            // Süre
            clone.querySelector('[data-slot="dur"]').textContent =
                r.durationInSeconds ? r.durationInSeconds + 's' : '—';

            // [+] Tetikleyen ikonlu
            clone.querySelector('[data-slot="trig-td"]')
                .appendChild(makeTrigCell(r.triggerType || r.triggeredBy));

            // [+] Kullanıcı avatarı + isim
            clone.querySelector('[data-slot="user-td"]')
                .appendChild(makeUserCell(r.userName || r.triggeredBy));

            // [+] Zaman: "X dakika önce" + "2 May 14:23"
            clone.querySelector('[data-slot="time-rel"]').textContent =
                fmtRelative(ds);
            clone.querySelector('[data-slot="time-abs"]').textContent =
                fmtAbs(ds);

            // Tıklama
            row.addEventListener('click', () => openDrawer(r.id));
            clone.querySelector('[data-slot="btn-detail"]')
                .addEventListener('click', () => openDrawer(r.id));

            tbody.appendChild(clone);
        });
    }

    /* ── Badge yapıcı ─────────────────────────────── */
    function makeBadge(status) {
        const cfg = {
            SUCCESS: { cls:'success', text:'Başarılı'  },
            FAIL:    { cls:'fail',    text:'Başarısız' },
            RUNNING: { cls:'running', text:'Çalışıyor' },
            SKIPPED: { cls:'skipped', text:'Atlandı'   },
        }[status] || { cls:'skipped', text: status };

        const span = document.createElement('span');
        span.className = `run-badge ${cfg.cls}`;
        const dot = document.createElement('span');
        dot.className = 'run-badge-dot';
        span.appendChild(dot);
        span.appendChild(document.createTextNode(cfg.text));
        return span;
    }

    /* ── Adım ilerleme yapıcı ─────────────────────── */
    // [+] Yeni — "7/12 ⚠" gösterimi
    function makeStepsProgress(r, status) {
        const wrap = document.createElement('div');
        wrap.className = 'steps-prog';

        const total = r.totalSteps || (r.scenario?.steps?.length) || 0;
        const done  = r.completedSteps ?? (status === 'SUCCESS' ? total : 0);

        const doneEl = document.createElement('span');
        doneEl.className   = 's-done';
        doneEl.textContent = done;

        const totEl = document.createElement('span');
        totEl.className   = 's-total';
        totEl.textContent = '/' + total;

        wrap.appendChild(doneEl);
        wrap.appendChild(totEl);

        if (status === 'FAIL' && done < total) {
            const w = document.createElement('span');
            w.className   = 's-warn';
            w.textContent = '⚠';
            w.title       = 'Bazı adımlar tamamlanamadı';
            wrap.appendChild(w);
        }
        return wrap;
    }

    /* ── Tetikleyen hücresi ───────────────────────── */
    // [+] Yeni — ikonlu
    function makeTrigCell(trig) {
        const wrap = document.createElement('div');
        wrap.className = 'trig-cell';

        const norm = (trig || '').toUpperCase();
        let paths, label;

        if (norm.includes('CI')) {
            paths = '<path d="M9 3H5a2 2 0 0 0-2 2v4"/><path d="M15 3h4a2 2 0 0 1 2 2v4"/><path d="M9 21H5a2 2 0 0 1-2-2v-4"/><path d="M15 21h4a2 2 0 0 0 2-2v-4"/>';
            label = 'CI';
        } else if (norm.includes('ZAM') || norm.includes('SCHED')) {
            paths = '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>';
            label = 'Zamanlı';
        } else {
            paths = '<polygon points="5 3 19 12 5 21 5 3"/>';
            label = 'Manuel';
        }

        const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
        svg.setAttribute('width','11'); svg.setAttribute('height','11');
        svg.setAttribute('fill','none'); svg.setAttribute('stroke','currentColor');
        svg.setAttribute('stroke-width','2'); svg.setAttribute('viewBox','0 0 24 24');
        svg.innerHTML = paths;

        wrap.appendChild(svg);
        wrap.appendChild(document.createTextNode(label));
        return wrap;
    }

    /* ── Kullanıcı hücresi ────────────────────────── */
    // [+] Yeni — avatar + isim
    function makeUserCell(name) {
        const wrap = document.createElement('div');
        wrap.className = 'user-cell';

        const displayName = name || 'Sistem';
        const initials    = displayName.split(' ')
            .slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('');
        const colorIdx    = [...displayName]
            .reduce((s, c) => s + c.charCodeAt(0), 0) % AV_COLORS.length;

        const av = document.createElement('div');
        av.className        = 'user-av';
        av.style.background = AV_COLORS[colorIdx];
        av.textContent      = initials || '?';

        const nm = document.createElement('span');
        nm.className   = 'user-nm';
        nm.textContent = displayName;

        wrap.appendChild(av);
        wrap.appendChild(nm);
        return wrap;
    }

    /* ── Drawer ───────────────────────────────────── */
    async function openDrawer(runId) {
        drawerRunId = runId;

        // Sıfırla
        document.getElementById('dw-title').textContent      = `Koşum #${runId}`;
        document.getElementById('dw-badge').innerHTML        = '';
        document.getElementById('dw-log').textContent        = 'Yükleniyor...';
        document.getElementById('dw-meta').innerHTML         = '';
        document.getElementById('dw-steps-list').innerHTML   = '';
        document.getElementById('dw-error-wrap').style.display      = 'none';
        document.getElementById('dw-steps-wrap').style.display      = 'none';
        document.getElementById('dw-screenshot-wrap').style.display = 'none';

        document.getElementById('detail-drawer').classList.add('open');
        document.getElementById('drawer-overlay').classList.add('open');
        document.body.style.overflow = 'hidden';

        try {
            const r      = await api(`/api/test-runs/${runId}`);
            const status = getStatus(r);
            const ds     = r.runDate || r.timestamp;

            // Badge + başlık
            document.getElementById('dw-badge').appendChild(makeBadge(status));
            document.getElementById('dw-title').textContent =
                r.scenario?.scenarioName || `Koşum #${runId}`;

            // Meta tablo — createElement ile
            const meta = [
                ['Run ID',     `R-${r.id}`],
                ['Senaryo',    r.scenario?.scenarioName || '—'],
                ['Adımlar',    `${r.completedSteps ?? 0} / ${r.totalSteps ?? 0}`],
                ['Süre',       (r.durationInSeconds || 0) + 's'],
                ['Tetikleyen', [r.triggeredBy, r.userName].filter(Boolean).join(' · ') || '—'],
                ['Ortam',      [r.environment, r.browserInfo].filter(Boolean).join(' · ') || '—'],
                ['Zaman',      fmtAbs(ds) + (ds ? ' (' + fmtRelative(ds) + ')' : '')],
                ['Build',      r.buildVersion || '—'],
            ];

            const tbody = document.getElementById('dw-meta');
            meta.forEach(([k, v]) => {
                const tr = document.createElement('tr');
                const k_ = document.createElement('td');
                const v_ = document.createElement('td');
                k_.textContent = k;
                v_.textContent = v;
                tr.appendChild(k_); tr.appendChild(v_);
                tbody.appendChild(tr);
            });

            // Hata kutusu
            if (status === 'FAIL' && r.errorMessage) {
                document.getElementById('dw-error-msg').textContent = r.errorMessage;
                document.getElementById('dw-error-wrap').style.display = '';
            }

            // [+] Adım geçmişi
            const steps = r.stepResults || r.steps || [];
            if (steps.length > 0) {
                document.getElementById('dw-steps-count').textContent = steps.length;
                renderStepList(steps);
                document.getElementById('dw-steps-wrap').style.display = '';
            }

            // Log
            const logText = r.logOutput || r.errorMessage ||
                (status === 'SUCCESS' ? 'TÜM ADIMLAR BAŞARIYLA TAMAMLANDI.' : '—');
            renderLog(logText);

            // Screenshot
            if (status === 'FAIL' && r.screenshotBase64) {
                document.getElementById('dw-screenshot').src =
                    'data:image/png;base64,' + r.screenshotBase64;
                document.getElementById('dw-screenshot-wrap').style.display = '';
            }

            // [+] Rapor İndir butonu (v3'te Log İndir txt idi)
            document.getElementById('dw-report-dl').onclick = () =>
                exportSingle(r);

            // Tekrar çalıştır
            document.getElementById('dw-rerun').onclick = () =>
                reRun(r.scenario?.id);

        } catch (e) {
            document.getElementById('dw-log').textContent = 'Detay yüklenemedi.';
        }
    }

    /* ── Adım listesi ─────────────────────────────── */
    // [+] Yeni
    function renderStepList(steps) {
        const list = document.getElementById('dw-steps-list');
        const tpl  = document.getElementById('tpl-step');

        steps.forEach((s, i) => {
            const clone = tpl.content.cloneNode(true);
            const row   = clone.querySelector('[data-slot="row"]');
            const st    = s.success === false ? 'fail' : s.skipped ? 'skip' : 'ok';

            row.classList.add(st);
            clone.querySelector('[data-slot="num"]').textContent  = i + 1;
            clone.querySelector('[data-slot="name"]').textContent = s.stepName || s.action || '—';
            clone.querySelector('[data-slot="dur"]').textContent  =
                s.durationMs ? (s.durationMs / 1000).toFixed(1) + 's' : '';
            clone.querySelector('[data-slot="icon"]').textContent =
                st === 'ok' ? '✓' : st === 'fail' ? '✕' : '—';

            list.appendChild(clone);
        });
    }

    /* ── Log renklendirme ─────────────────────────── */
    function renderLog(text) {
        const box = document.getElementById('dw-log');
        box.innerHTML = '';
        (text || '').split('\n').forEach(line => {
            const span = document.createElement('span');
            span.style.display = 'block';
            span.className =
                /BAŞARILI|BASARILI|✅/.test(line)                    ? 'log-success' :
                    /BAŞARISIZ|BASARISIZ|❌|Hata:|Exception/.test(line)  ? 'log-error'   :
                        /İşleniyor|⏳/.test(line)                             ? 'log-warn'    :
                            /Selenium|Chrome|WebDriver|Test Motoru/.test(line)   ? 'log-info'    :
                                'log-dim';
            span.textContent = line;
            box.appendChild(span);
        });
    }

    function closeDrawer() {
        document.getElementById('detail-drawer').classList.remove('open');
        document.getElementById('drawer-overlay').classList.remove('open');
        document.body.style.overflow = '';
        drawerRunId = null;
    }

    /* ── Tekrar çalıştır ──────────────────────────── */
    async function reRun(scenarioId) {
        if (!scenarioId) return;
        showToast('Test başlatılıyor...', 'info');
        try {
            await fetch(`/api/scenarios/run/${scenarioId}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            showToast('Test başlatıldı!', 'success');
            setTimeout(load, 2000);
        } catch (e) {
            showToast('Başlatılamadı.', 'error');
        }
    }

    /* ── Rapor İndir (toplu) ──────────────────────── */
    // [~] v3'te txt indiriyordu, şimdi Excel
    function exportAll() {
        if (filtered.length === 0) {
            showToast('İndirilecek veri yok.', 'warning');
            return;
        }
        writeExcel(buildRows(filtered), `ClickRun_Kosumlar_${Date.now()}.xlsx`);
        showToast('Rapor indirildi.', 'success');
    }

    /* ── Rapor İndir (tekil, drawer) ─────────────── */
    // [+] Yeni — drawer'dan tek koşum raporu
    function exportSingle(r) {
        writeExcel(buildRows([r]), `ClickRun_R${r.id}.xlsx`);
        showToast('Rapor indirildi.', 'success');
    }

    function buildRows(data) {
        return [
            ['Click&Run — Koşum Raporu'],
            ['Oluşturma', new Date().toLocaleString('tr-TR')],
            [],
            ['ID','Senaryo','Tarih','Süre (s)','Durum','Tetikleyen','Kullanıcı'],
            ...data.map(r => {
                const ds = r.runDate || r.timestamp;
                return [
                    'R-' + r.id,
                    r.scenario?.scenarioName || '—',
                    fmtAbs(ds),
                    r.durationInSeconds || 0,
                    getStatus(r),
                    r.triggerType || r.triggeredBy || 'MANUEL',
                    r.userName || '—',
                ];
            })
        ];
    }

    function writeExcel(rows, filename) {
        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws['!cols'] = [12,35,20,10,14,14,16].map(w => ({ wch: w }));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Koşumlar');
        XLSX.writeFile(wb, filename);
    }

    /* ── Zaman formatları ─────────────────────────── */
    // [~] v3'te tek fmtDate() vardı, ikiye ayrıldı

    // "2 dakika önce" / "şu an" / "dün"
    function fmtRelative(iso) {
        if (!iso) return '—';
        const diff = Date.now() - new Date(iso).getTime();
        const m    = Math.floor(diff / 60000);
        if (m < 1)   return 'şu an';
        if (m < 60)  return `${m} dakika önce`;
        const h = Math.floor(m / 60);
        if (h < 24)  return `${h} saat önce`;
        const d = Math.floor(h / 24);
        if (d === 1) return 'dün';
        return `${d} gün önce`;
    }

    // "2 May 14:23"
    function fmtAbs(iso) {
        if (!iso) return '—';
        const d  = new Date(iso);
        const mo = ['Oca','Şub','Mar','Nis','May','Haz',
            'Tem','Ağu','Eyl','Eki','Kas','Ara'][d.getMonth()];
        return `${d.getDate()} ${mo} ${
            String(d.getHours()).padStart(2,'0')}:${
            String(d.getMinutes()).padStart(2,'0')}`;
    }

    /* ── Event listeners ──────────────────────────── */
    document.addEventListener('DOMContentLoaded', () => {
        load();

        document.getElementById('btn-refresh')
            ?.addEventListener('click', load);

        // [~] Toplu rapor indir
        document.getElementById('btn-export')
            ?.addEventListener('click', exportAll);

        document.getElementById('run-search')
            ?.addEventListener('input', e => {
                searchTerm = e.target.value.toLowerCase().trim();
                applyFilters();
            });

        document.querySelectorAll('#status-tabs .ftab').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#status-tabs .ftab')
                    .forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                activeStatus = btn.dataset.status;
                applyFilters();
            });
        });

        document.getElementById('date-filter')
            ?.addEventListener('change', e => {
                activeDate = e.target.value;
                applyFilters();
            });

        document.getElementById('drawer-close')
            ?.addEventListener('click', closeDrawer);
        document.getElementById('drawer-overlay')
            ?.addEventListener('click', closeDrawer);
    });

})();