(function () {
    'use strict';

    const token = localStorage.getItem('jwtToken');
    if (!token) { window.location.replace('/Html/login.html'); return; }

    const scenarioId = new URLSearchParams(window.location.search).get('id');
    if (!scenarioId) {
        window.location.replace('/Html/scenarios.html');
        return;
    }

    /* ── State ───────────────────────────────────── */
    let scenario    = null;
    let steps       = [];
    let selectedIdx = null;
    let viewMode    = 'canvas';
    let isDirty     = false;
    let pendingType = null;
    let zoomLevel   = 1.0;
    let isPaletteHidden = false;
    let isPropsHidden   = false;

    /* ════════════════════════════════════════════════
       STEP_TYPES — Backend supportedAction() ile TAM UYUMLU
       KEY = backend executor'ın döndüğü string
       Backend TestStep: action | locator | value
    ════════════════════════════════════════════════ */
    const STEP_TYPES = {

        // ── NAVIGATION ──────────────────────────────
        goto: {
            label: 'Sayfaya Git', category: 'NAVIGATION', color: '#3B82F6', icon: '🌐',
            needsUrl: true,
            hint: 'value alanına tam URL girin (https://...)',
        },
        refresh: {
            label: 'Sayfayı Yenile', category: 'NAVIGATION', color: '#3B82F6', icon: '↺',
            hint: 'driver.navigate().refresh() — sayfa yenilenir',
        },

        // ── MOUSE ────────────────────────────────────
        click: {
            label: 'Tıkla', category: 'MOUSE', color: '#F97316', icon: '👆',
            needsLocator: true,
            hint: 'WebDriverWait + elementToBeClickable + click()',
        },
        doubleClick: {
            label: 'Çift Tıkla', category: 'MOUSE', color: '#F97316', icon: '✌',
            needsLocator: true,
            hint: 'Actions.doubleClick(element).perform()',
        },
        rightClick: {
            label: 'Sağ Tıkla', category: 'MOUSE', color: '#F97316', icon: '🖱',
            needsLocator: true,
            hint: 'Actions.contextClick(element).perform()',
        },
        hover: {
            label: 'Üzerine Gel', category: 'MOUSE', color: '#F97316', icon: '↗',
            needsLocator: true,
            hint: 'Actions.moveToElement(element).perform() — hover menüler için',
        },
        jsClick: {
            label: 'JS ile Tıkla', category: 'MOUSE', color: '#FB923C', icon: '⚡',
            needsLocator: true,
            hint: 'arguments[0].click() — overlay arkası elemanlar için',
        },
        dragAndDrop: {
            label: 'Sürükle & Bırak', category: 'MOUSE', color: '#F97316', icon: '↔',
            needsLocator: true, needsValue: true,
            valueLabel: 'Hedef Selector',
            valuePlaceholder: '//hedef-element',
            hint: 'locator = kaynak element  |  value = hedef selector',
        },

        // ── INPUT ────────────────────────────────────
        type: {
            label: 'Metin Yaz', category: 'INPUT', color: '#10B981', icon: '⌨',
            needsLocator: true, needsValue: true,
            valueLabel: 'Yazılacak Metin',
            valuePlaceholder: 'Test metni...',
            hint: 'element.clear() + element.sendKeys(value)',
        },
        clearInput: {
            label: 'Input Temizle', category: 'INPUT', color: '#10B981', icon: '✕',
            needsLocator: true,
            hint: 'element.clear() — input alanını temizler',
        },
        select: {
            label: 'Dropdown Seç', category: 'INPUT', color: '#10B981', icon: '▼',
            needsLocator: true, needsValue: true,
            valueLabel: 'Seçenek',
            valuePlaceholder: 'value=x  |  index=0  |  Görünen Metin',
            hint: 'Select sınıfı ile dropdown seçimi',
        },
        enter: {
            label: 'Enter Bas', category: 'INPUT', color: '#10B981', icon: '↵',
            hint: 'Locator opsiyonel — boşsa body\'e ENTER gönderir',
        },
        pressKey: {
            label: 'Tuş Bas', category: 'INPUT', color: '#10B981', icon: '⌨',
            needsValue: true,
            valueLabel: 'Tuş Adı',
            valuePlaceholder: 'ESCAPE | TAB | F5 | ARROW_DOWN',
            hint: 'ESCAPE, TAB, ENTER, F1-F12, BACKSPACE, DELETE, ARROW_*, SPACE, PAGE_UP, PAGE_DOWN, HOME, END',
        },

        // ── ASSERT ───────────────────────────────────
        verifyText: {
            label: 'Metin Doğrula', category: 'ASSERT', color: '#8B5CF6', icon: '✓',
            needsLocator: true, needsValue: true,
            valueLabel: 'Beklenen Metin',
            valuePlaceholder: 'Kontrol edilecek metin',
            hint: 'element.getText().contains(value) — içermiyorsa hata fırlatır',
        },
        verifyElement: {
            label: 'Element Görünür mü?', category: 'ASSERT', color: '#8B5CF6', icon: '👁',
            needsLocator: true,
            hint: 'visibilityOfElementLocated — görünmezse hata',
        },
        assertUrl: {
            label: 'URL Doğrula', category: 'ASSERT', color: '#8B5CF6', icon: '🔗',
            needsValue: true,
            valueLabel: 'Beklenen URL',
            valuePlaceholder: 'https://... veya contains:kelime',
            hint: 'Tam URL veya "contains:fragment" formatı',
        },
        getAttribute: {
            label: 'Attribute Al / Doğrula', category: 'ASSERT', color: '#8B5CF6', icon: '🔍',
            needsLocator: true, needsValue: true,
            valueLabel: 'Attribute:Beklenen',
            valuePlaceholder: 'innerText:Stokta  |  value:1000  |  href',
            hint: '"attribute:beklenen" → doğrula  |  sadece "href" → sadece logla',
        },

        // ── WAIT ─────────────────────────────────────
        waitForElement: {
            label: 'Element Bekle', category: 'WAIT', color: '#F59E0B', icon: '⏳',
            needsLocator: true, needsValue: true,
            valueLabel: 'Timeout (saniye)',
            valuePlaceholder: '15',
            hint: 'default 15sn — element görünür olana kadar bekler',
        },
        waitForElementDisappear: {
            label: 'Kaybolmasını Bekle', category: 'WAIT', color: '#F59E0B', icon: '🌀',
            needsLocator: true, needsValue: true,
            valueLabel: 'Timeout (saniye)',
            valuePlaceholder: '30',
            hint: 'default 30sn — spinner/loading overlay için',
        },
        wait: {
            label: 'Sabit Bekle (ms)', category: 'WAIT', color: '#F59E0B', icon: '⏱',
            needsValue: true,
            valueLabel: 'Süre (milisaniye)',
            valuePlaceholder: '1000',
            hint: 'Thread.sleep(ms) — sabit bekleme',
        },

        // ── OTHER ────────────────────────────────────
        scrollTo: {
            label: 'Elemana Kaydır', category: 'OTHER', color: '#64748B', icon: '⇅',
            needsLocator: true,
            hint: 'scrollIntoView({smooth, center}) — ExtJS için güvenilir',
        },
        acceptAlert: {
            label: 'Alert İşlemi', category: 'OTHER', color: '#64748B', icon: '🔔',
            needsValue: true,
            valueLabel: 'Aksiyon',
            valuePlaceholder: 'accept  |  dismiss  |  text:Beklenen',
            hint: 'accept (default) | dismiss | text:beklenen metin',
        },
        switchToFrame: {
            label: 'Frame Geç', category: 'OTHER', color: '#64748B', icon: '🖼',
            needsLocator: true, needsValue: true,
            valueLabel: 'Özel Değer',
            valuePlaceholder: 'default | parent | (boş = locator ile)',
            hint: '"default"→ana sayfa  |  "parent"→üst frame  |  boş→locator',
        },
        takeScreenshot: {
            label: 'Ekran Görüntüsü', category: 'OTHER', color: '#64748B', icon: '📷',
            hint: 'Anlık ekran görüntüsü alır — hata raporuna eklenir',
        },
    };

    /* ── Kategori tanımları ──────────────────────── */
    const CATEGORIES = ['NAVIGATION', 'MOUSE', 'INPUT', 'ASSERT', 'WAIT', 'OTHER'];

    const CAT_LABELS = {
        NAVIGATION: 'Navigasyon',
        MOUSE:      'Mouse İşlemleri',
        INPUT:      'Veri Girişi',
        ASSERT:     'Doğrulama',
        WAIT:       'Bekleme',
        OTHER:      'Diğer',
    };

    const CAT_COLORS = {
        NAVIGATION: '#3B82F6',
        MOUSE:      '#F97316',
        INPUT:      '#10B981',
        ASSERT:     '#8B5CF6',
        WAIT:       '#F59E0B',
        OTHER:      '#64748B',
    };

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
            return r.json().catch(() => ({}));
        });
    }

    /* ── Veri yükle ──────────────────────────────── */
    async function load() {
        try {
            const data = await api(`/api/scenarios/${scenarioId}`);
            scenario = data;

            steps = (data.steps || [])
                .sort((a, b) => (a.stepOrder || 0) - (b.stepOrder || 0))
                .map(s => ({
                    type:    s.action  || 'click',
                    locator: s.locator || '',
                    value:   s.value   || '',
                    desc:    '',
                    id:      s.id,
                }));

            document.getElementById('tb-name').textContent =
                data.scenarioName || 'Senaryo';
            setDirty(false);
            renderAll();
        } catch (e) {
            showToast('Senaryo yüklenemedi.', 'error');
        }
    }

    /* ── Palet render ────────────────────────────── */
    function renderPalette(filter = '') {
        const list = document.getElementById('palette-list');
        list.innerHTML = '';

        CATEGORIES.forEach(cat => {
            const items = Object.entries(STEP_TYPES).filter(([, def]) =>
                def.category === cat &&
                (!filter || def.label.toLowerCase().includes(filter.toLowerCase()))
            );
            if (items.length === 0) return;

            const labelEl = document.createElement('div');
            labelEl.className   = 'palette-section-label';
            labelEl.textContent = CAT_LABELS[cat];
            list.appendChild(labelEl);

            items.forEach(([typeKey, def]) => {
                const item = document.createElement('div');
                item.className = 'palette-item';

                const iconWrap = document.createElement('div');
                iconWrap.className        = 'palette-item-icon';
                iconWrap.style.background = CAT_COLORS[cat] + '18';
                iconWrap.style.color      = CAT_COLORS[cat];
                iconWrap.textContent      = def.icon;

                const name = document.createElement('span');
                name.textContent = def.label;

                item.appendChild(iconWrap);
                item.appendChild(name);
                item.addEventListener('click', () => openAddModal(typeKey));
                list.appendChild(item);
            });
        });
    }

    /* ── Canvas render ───────────────────────────── */
    function renderCanvas() {
        const wrap    = document.getElementById('canvas-steps');
        const empty   = document.getElementById('canvas-empty');
        const addWrap = document.getElementById('canvas-add-wrap');
        const tpl     = document.getElementById('tpl-step-card');

        wrap.innerHTML = '';
        wrap.style.transform = `scale(${zoomLevel})`;

        if (steps.length === 0) {
            empty.style.display   = '';
            addWrap.style.display = 'none';
            return;
        }
        empty.style.display   = 'none';
        addWrap.style.display = '';

        steps.forEach((s, i) => {
            const def   = STEP_TYPES[s.type] || STEP_TYPES.click;
            const clone = tpl.content.cloneNode(true);

            const connector = clone.querySelector('[data-slot="connector"]');
            if (i > 0) connector.style.display = '';

            const card = clone.querySelector('[data-slot="card"]');
            if (selectedIdx === i) card.classList.add('selected');
            card.style.borderLeft = `3px solid ${def.color}`;

            const num = clone.querySelector('[data-slot="num"]');
            num.textContent      = i + 1;
            num.style.background = def.color;

            clone.querySelector('[data-slot="type"]').textContent = def.label;

            const descEl = clone.querySelector('[data-slot="desc"]');
            descEl.textContent = s.type === 'goto'
                ? (s.value || def.label)
                : (s.locator || def.label);

            const selEl = clone.querySelector('[data-slot="selector"]');
            if (s.value && s.type !== 'goto') selEl.textContent = s.value;

            card.addEventListener('click', (e) => {
                e.stopPropagation();
                selectStep(i);
            });

            const menu = clone.querySelector('[data-slot="menu"]');
            menu.addEventListener('click', e => {
                e.stopPropagation();
                showStepMenu(i, e);
            });

            wrap.appendChild(clone);
        });
    }

    /* ── Tablo render ────────────────────────────── */
    function renderTable() {
        const wrap    = document.getElementById('table-steps');
        const empty   = document.getElementById('table-empty');
        const countEl = document.getElementById('table-count');
        const tpl     = document.getElementById('tpl-table-row');

        wrap.innerHTML = '';
        countEl.textContent = steps.length + ' adım';

        if (steps.length === 0) {
            empty.style.display = '';
            return;
        }
        empty.style.display = 'none';

        steps.forEach((s, i) => {
            const def   = STEP_TYPES[s.type] || STEP_TYPES.click;
            const clone = tpl.content.cloneNode(true);
            const row   = clone.querySelector('[data-slot="row"]');

            if (selectedIdx === i) row.classList.add('selected');

            const num = clone.querySelector('[data-slot="num"]');
            num.textContent      = i + 1;
            num.style.background = def.color;

            clone.querySelector('[data-slot="type"]').textContent = def.label;

            clone.querySelector('[data-slot="desc"]').textContent =
                s.type === 'goto' ? (s.value || '—') : (s.locator || '—');

            clone.querySelector('[data-slot="selector"]').textContent =
                s.type === 'wait' ? (s.value + 'ms') : (s.value || '—');

            row.addEventListener('click', e => {
                if (e.target.closest('button')) return;
                selectStep(i);
            });

            clone.querySelector('[data-slot="btn-edit"]')
                .addEventListener('click', () => { selectStep(i); openEditModal(i); });

            clone.querySelector('[data-slot="btn-del"]')
                .addEventListener('click', () => deleteStep(i));

            wrap.appendChild(clone);
        });
    }

    /* ── Sağ panel ───────────────────────────────── */
    function renderProps() {
        const body   = document.getElementById('props-body');
        const title  = document.getElementById('props-title');
        const numEl  = document.getElementById('props-step-num');
        const footer = document.getElementById('props-footer');

        if (selectedIdx === null || !steps[selectedIdx]) {
            body.innerHTML = `
        <div class="props-empty">
          <div class="props-empty-icon">👆</div>
          <div class="props-empty-text">Düzenlemek için bir adıma tıklayın</div>
        </div>`;
            footer.style.display = 'none';
            title.textContent    = 'Adım Özellikleri';
            numEl.textContent    = '';
            return;
        }

        const s   = steps[selectedIdx];
        const def = STEP_TYPES[s.type] || STEP_TYPES.click;

        title.textContent    = def.label;
        numEl.textContent    = `#${selectedIdx + 1}`;
        footer.style.display = '';
        body.innerHTML       = '';

        // Tip bilgisi (readonly)
        addPropsSection(body, 'GENEL');
        const typeWrap = document.createElement('div');
        typeWrap.className = 'props-field';
        const typeLbl = document.createElement('label');
        typeLbl.className   = 'props-label';
        typeLbl.textContent = 'Adım Tipi';
        const typeInp = document.createElement('input');
        typeInp.className  = 'props-input';
        typeInp.value      = def.label;
        typeInp.readOnly   = true;
        typeInp.style.cssText = 'background:var(--surface-2);color:var(--text-3);cursor:not-allowed;';
        typeWrap.appendChild(typeLbl);
        typeWrap.appendChild(typeInp);
        body.appendChild(typeWrap);

        // Hint
        if (def.hint) {
            const hint = document.createElement('div');
            hint.style.cssText =
                'font-size:11px;color:var(--text-3);margin:4px 0 12px;' +
                'background:var(--surface-2);padding:6px 8px;border-radius:6px;line-height:1.5;';
            hint.textContent = '💡 ' + def.hint;
            body.appendChild(hint);
        }

        // Locator alanı
        if (def.needsLocator) {
            addPropsSection(body, 'SELECTOR');
            addPropsField(body, 'Locator', 'props-locator', 'text',
                s.locator, '//xpath  |  #id  |  .css  |  name');

            const autoRow = document.createElement('div');
            autoRow.className       = 'selector-type-auto';
            autoRow.id              = 'props-locator-auto';
            autoRow.style.display   = 'none';
            autoRow.innerHTML       =
                '<svg width="12" height="12" fill="none" stroke="currentColor" ' +
                'stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>' +
                '<span id="props-locator-auto-txt"></span>';
            body.appendChild(autoRow);

            setTimeout(() => {
                document.getElementById('props-locator')
                    ?.addEventListener('input', e => {
                        const t = detectLocatorType(e.target.value);
                        const autoEl  = document.getElementById('props-locator-auto');
                        const autoTxt = document.getElementById('props-locator-auto-txt');
                        if (t && autoEl && autoTxt) {
                            autoTxt.textContent  = t + ' olarak algılandı';
                            autoEl.style.display = '';
                        }
                    });
            }, 0);
        }

        // URL alanı
        if (def.needsUrl) {
            addPropsSection(body, 'HEDEF URL');
            addPropsField(body, 'URL', 'props-url', 'url', s.value, 'https://...');
        }

        // Value alanı
        if (def.needsValue) {
            addPropsSection(body, 'DEĞER');
            addPropsField(body,
                def.valueLabel || 'Değer',
                'props-value', 'text',
                s.value,
                def.valuePlaceholder || 'Değer girin...'
            );
        }
    }

    /* Props helpers */
    function addPropsSection(parent, label) {
        const d = document.createElement('div');
        d.className   = 'props-section';
        d.textContent = label;
        parent.appendChild(d);
    }

    function addPropsField(parent, label, id, type, value, placeholder) {
        const wrap = document.createElement('div');
        wrap.className = 'props-field';
        const lbl = document.createElement('label');
        lbl.className   = 'props-label';
        lbl.textContent = label;
        lbl.htmlFor     = id;
        const inp = document.createElement('input');
        inp.className   = 'props-input';
        inp.type        = type || 'text';
        inp.id          = id;
        inp.value       = value || '';
        inp.placeholder = placeholder || '';
        wrap.appendChild(lbl);
        wrap.appendChild(inp);
        parent.appendChild(wrap);
    }

    /* ── Render all ──────────────────────────────── */
    function renderAll() {
        renderCanvas();
        renderTable();
        renderProps();
        updateZoomDisplay();
    }

    function selectStep(idx) {
        selectedIdx = idx;
        renderAll();
    }

    /* ── Modal ───────────────────────────────────── */
    function openAddModal(typeKey, editIdx = null) {
        pendingType  = typeKey;
        const def    = STEP_TYPES[typeKey] || STEP_TYPES.click;
        const isEdit = editIdx !== null;
        const s      = isEdit ? steps[editIdx] : null;

        document.getElementById('modal-step-title').textContent =
            (isEdit ? 'Düzenle — ' : 'Adım Ekle — ') + def.label;

        document.getElementById('modal-type-display').value = def.label;
        document.getElementById('modal-desc').value = '';

        const selWrap  = document.getElementById('modal-selector-wrap');
        const valWrap  = document.getElementById('modal-value-wrap');
        const urlWrap  = document.getElementById('modal-url-wrap');

        selWrap.style.display = def.needsLocator ? '' : 'none';
        valWrap.style.display = def.needsValue   ? '' : 'none';
        urlWrap.style.display = def.needsUrl     ? '' : 'none';

        // Dinamik label ve placeholder
        const valLabelEl = document.getElementById('modal-value-label');
        if (valLabelEl) valLabelEl.textContent = def.valueLabel || 'Değer';
        const valInput = document.getElementById('modal-value');
        if (valInput) valInput.placeholder = def.valuePlaceholder || 'Değer girin...';

        // Hint kutusu
        let hintEl = document.getElementById('modal-hint-box');
        if (!hintEl) {
            hintEl = document.createElement('div');
            hintEl.id = 'modal-hint-box';
            hintEl.style.cssText =
                'font-size:11px;color:var(--text-3);margin-bottom:10px;' +
                'background:var(--surface-2);padding:6px 8px;border-radius:6px;line-height:1.5;';
            document.getElementById('modal-desc')?.parentNode?.insertAdjacentElement('afterend', hintEl);
        }
        if (def.hint) {
            hintEl.textContent  = '💡 ' + def.hint;
            hintEl.style.display = '';
        } else {
            hintEl.style.display = 'none';
        }

        // Doldur
        if (isEdit) {
            document.getElementById('modal-sel-value').value = s.locator || '';
            document.getElementById('modal-value').value     = s.value   || '';
            document.getElementById('modal-url').value       = s.value   || '';
        } else {
            document.getElementById('modal-sel-value').value = '';
            document.getElementById('modal-value').value     = '';
            document.getElementById('modal-url').value       = '';
        }

        const autoEl = document.getElementById('modal-sel-auto');
        if (autoEl) autoEl.style.display = 'none';

        document.getElementById('modal-msg').style.display = 'none';
        document.getElementById('add-step-modal').classList.add('open');

        const addBtn = document.getElementById('modal-add');
        addBtn.textContent     = isEdit ? 'Güncelle' : 'Ekle';
        addBtn.dataset.editIdx = isEdit ? editIdx    : '';

        setTimeout(() => {
            if (def.needsUrl)          document.getElementById('modal-url').focus();
            else if (def.needsLocator) document.getElementById('modal-sel-value').focus();
            else if (def.needsValue)   document.getElementById('modal-value').focus();
        }, 80);
    }

    function openEditModal(idx) { openAddModal(steps[idx].type, idx); }

    function closeAddModal() {
        document.getElementById('add-step-modal').classList.remove('open');
        pendingType = null;
    }

    /* ── Locator tip algılama ────────────────────── */
    function detectLocatorType(val) {
        if (!val) return null;
        const t = val.trim();
        if (t.startsWith('//') || t.startsWith('(')) return 'XPATH';
        if (t.startsWith('#'))  return 'ID';
        if (t.startsWith('.'))  return 'CSS';
        return 'NAME';
    }

    function autoDetectInModal(val) {
        const detected = detectLocatorType(val);
        const autoEl  = document.getElementById('modal-sel-auto');
        const autoTxt = document.getElementById('modal-sel-auto-text');
        if (detected && autoEl && autoTxt) {
            autoTxt.textContent  = detected + ' olarak algılandı';
            autoEl.style.display = '';
        }
    }

    /* ── Modal adım ekle / güncelle ──────────────── */
    function confirmAddStep() {
        if (!pendingType) return;
        const def = STEP_TYPES[pendingType];

        const locator = document.getElementById('modal-sel-value').value.trim();
        const value   = document.getElementById('modal-value').value.trim();
        const url     = document.getElementById('modal-url').value.trim();

        document.getElementById('modal-msg').style.display = 'none';

        if (def.needsLocator && !locator) {
            showModalMsg('Selector değeri zorunludur.'); return;
        }
        if (def.needsUrl && !url) {
            showModalMsg('URL zorunludur.'); return;
        }

        const newStep = {
            type:    pendingType,
            locator: def.needsLocator ? locator : '',
            value:   def.needsUrl     ? url     : value,
            desc:    '',
        };

        const addBtn  = document.getElementById('modal-add');
        const editIdx = addBtn.dataset.editIdx !== ''
            ? parseInt(addBtn.dataset.editIdx) : null;

        if (editIdx !== null && !isNaN(editIdx)) {
            steps[editIdx] = { ...steps[editIdx], ...newStep };
            selectedIdx    = editIdx;
        } else {
            steps.push(newStep);
            selectedIdx = steps.length - 1;
        }

        closeAddModal();
        setDirty(true);
        renderAll();
        showToast(editIdx !== null ? 'Adım güncellendi.' : 'Adım eklendi.', 'success');
    }

    function showModalMsg(msg) {
        const el = document.getElementById('modal-msg');
        el.textContent = msg;
        el.style.cssText =
            'display:block;padding:8px 12px;border-radius:6px;font-size:12.5px;font-weight:500;' +
            'background:var(--danger-bg);color:var(--danger);' +
            'border:1px solid rgba(239,68,68,0.2);margin-top:8px;';
    }

    /* ── Adım sil ────────────────────────────────── */
    function deleteStep(idx) {
        if (!confirm('Bu adımı silmek istediğinize emin misiniz?')) return;
        steps.splice(idx, 1);
        if (selectedIdx === idx)    selectedIdx = null;
        else if (selectedIdx > idx) selectedIdx--;
        setDirty(true);
        renderAll();
        showToast('Adım silindi.', 'success');
    }

    /* ── Sağ panelden uygula ─────────────────────── */
    function applyProps() {
        if (selectedIdx === null) return;
        const s   = steps[selectedIdx];
        const def = STEP_TYPES[s.type] || STEP_TYPES.click;
        const get = id => document.getElementById(id)?.value?.trim() || '';

        if (def.needsLocator) s.locator = get('props-locator');
        if (def.needsUrl)     s.value   = get('props-url');
        if (def.needsValue)   s.value   = get('props-value');

        setDirty(true);
        renderAll();
        showToast('Değişiklikler uygulandı.', 'success');
    }

    /* ── Context menü ────────────────────────────── */
    function showStepMenu(idx, e) {
        document.getElementById('step-ctx-menu')?.remove();

        const menu = document.createElement('div');
        menu.id = 'step-ctx-menu';
        menu.style.cssText =
            `position:fixed;top:${e.clientY}px;left:${e.clientX}px;` +
            'background:var(--surface);border:1px solid var(--border);' +
            'border-radius:var(--radius);box-shadow:var(--shadow-lg);' +
            'z-index:300;min-width:160px;padding:4px;animation:modalIn 0.12s ease;';

        [
            { label: 'Düzenle',     icon: '✏️', action: () => openEditModal(idx) },
            { label: 'Yukarı Taşı', icon: '↑',  action: () => moveStep(idx, -1), disabled: idx === 0 },
            { label: 'Aşağı Taşı',  icon: '↓',  action: () => moveStep(idx,  1), disabled: idx === steps.length - 1 },
            { label: 'Kopyala',     icon: '⧉',  action: () => duplicateStep(idx) },
            { label: 'Sil',         icon: '🗑', action: () => deleteStep(idx), danger: true },
        ].forEach(item => {
            if (item.disabled) return;
            const btn = document.createElement('button');
            btn.style.cssText =
                'display:flex;align-items:center;gap:8px;width:100%;' +
                'padding:8px 10px;border:none;background:none;cursor:pointer;' +
                `font-family:inherit;font-size:13px;text-align:left;` +
                `color:${item.danger ? 'var(--danger)' : 'var(--text-2)'};` +
                'border-radius:calc(var(--radius) - 2px);transition:background var(--transition);';
            btn.onmouseover = () => btn.style.background =
                item.danger ? 'var(--danger-bg)' : 'var(--surface-2)';
            btn.onmouseout = () => btn.style.background = '';

            const ic = document.createElement('span'); ic.textContent = item.icon;
            const tx = document.createElement('span'); tx.textContent = item.label;
            btn.appendChild(ic); btn.appendChild(tx);
            btn.addEventListener('click', () => { menu.remove(); item.action(); });
            menu.appendChild(btn);
        });

        document.body.appendChild(menu);

        const close = e2 => {
            if (!menu.contains(e2.target)) {
                menu.remove();
                document.removeEventListener('click', close);
            }
        };
        setTimeout(() => document.addEventListener('click', close), 10);
    }

    /* ── Taşı / Kopyala ──────────────────────────── */
    function moveStep(idx, dir) {
        const n = idx + dir;
        if (n < 0 || n >= steps.length) return;
        [steps[idx], steps[n]] = [steps[n], steps[idx]];
        selectedIdx = n;
        setDirty(true);
        renderAll();
    }

    function duplicateStep(idx) {
        const copy = { ...steps[idx] };
        delete copy.id;
        steps.splice(idx + 1, 0, copy);
        selectedIdx = idx + 1;
        setDirty(true);
        renderAll();
        showToast('Adım kopyalandı.', 'success');
    }

    /* ── Zoom ────────────────────────────────────── */
    function setZoom(level) {
        zoomLevel = Math.max(0.5, Math.min(2.0, level));
        renderCanvas();
    }

    function zoomIn() { setZoom(zoomLevel + 0.1); }
    function zoomOut() { setZoom(zoomLevel - 0.1); }
    function zoomReset() { setZoom(1.0); }

    function updateZoomDisplay() {
        const el = document.getElementById('zoom-level');
        if (el) el.textContent = Math.round(zoomLevel * 100) + '%';
    }

    /* ── Fullscreen ──────────────────────────────── */
    function toggleFullscreen() {
        const wrap = document.getElementById('builder-wrap');
        wrap.classList.toggle('fullscreen');
        showToast(
            wrap.classList.contains('fullscreen') ? 'Tam ekran açıldı (F ile kapat)' : 'Tam ekran kapatıldı',
            'info',
            2000
        );
    }

    /* ── Palet toggle ────────────────────────────── */
    function togglePalette() {
        isPaletteHidden = !isPaletteHidden;
        const el = document.getElementById('builder-palette');
        el.classList.toggle('hidden', isPaletteHidden);
    }

    /* ════════════════════════════════════════════════
       KAYDET — Backend ile TAM UYUMLU
       PUT /api/scenarios/{id}/steps
       Payload: [{ stepOrder, action, locator, value }]
    ════════════════════════════════════════════════ */
    async function save() {
        const btn       = document.getElementById('btn-save');
        btn.disabled    = true;
        btn.textContent = 'Kaydediliyor...';

        try {
            const payload = steps.map((s, i) => ({
                stepOrder: i + 1,
                action:    s.type,            // KEY = supportedAction() — mapping YOK
                locator:   s.locator || null,
                value:     s.value   || null,
            }));

            await api(`/api/scenarios/${scenarioId}/steps`, {
                method: 'PUT',
                body:   JSON.stringify(payload),
            });

            setDirty(false);
            showToast('Senaryo kaydedildi.', 'success');
        } catch (e) {
            showToast('Kaydedilemedi.', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML =
                '<svg width="13" height="13" fill="none" stroke="currentColor" ' +
                'stroke-width="2" viewBox="0 0 24 24">' +
                '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>' +
                '<polyline points="17 21 17 13 7 13 7 21"/>' +
                '<polyline points="7 3 7 8 15 8"/></svg> Kaydet';
        }
    }

    /* ── Çalıştır ────────────────────────────────── */
    async function run() {
        if (isDirty) { showToast('Önce kaydedin.', 'warning'); return; }
        showToast('Test başlatılıyor...', 'info');
        try {
            await fetch(`/api/scenarios/run/${scenarioId}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });
            showToast('Test başlatıldı! Koşum Geçmişi\'nden takip edebilirsiniz.', 'success', 5000);
        } catch (e) {
            showToast('Test başlatılamadı.', 'error');
        }
    }

    /* ── Kayıt durumu ────────────────────────────── */
    function setDirty(val) {
        isDirty = val;
        const dot   = document.getElementById('save-dot');
        const label = document.getElementById('save-label');
        if (val) {
            dot.classList.add('unsaved');
            label.textContent = 'Kaydedilmemiş değişiklikler';
        } else {
            dot.classList.remove('unsaved');
            label.textContent = 'Kaydedildi';
        }
    }

    /* ── Görünüm toggle ──────────────────────────── */
    function setView(mode) {
        viewMode = mode;
        document.getElementById('view-canvas').style.display =
            mode === 'canvas' ? 'flex' : 'none';
        document.getElementById('view-table').style.display  =
            mode === 'table'  ? 'block' : 'none';
        document.getElementById('vtab-canvas').classList.toggle('active', mode === 'canvas');
        document.getElementById('vtab-table').classList.toggle('active', mode === 'table');
    }

    /* ── Klavye kısayolları ──────────────────────── */
    document.addEventListener('keydown', e => {
        // Ctrl+S → Kaydet
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            save();
        }

        // Delete → Seçili adımı sil
        if (e.key === 'Delete' && selectedIdx !== null &&
            !e.target.matches('input,textarea,select')) {
            deleteStep(selectedIdx);
        }

        // Esc → Modal kapat / Seçimi temizle
        if (e.key === 'Escape') {
            const modal = document.getElementById('add-step-modal');
            if (modal.classList.contains('open')) closeAddModal();
            else { selectedIdx = null; renderAll(); }
        }

        // F → Fullscreen
        if (e.key === 'f' && !e.target.matches('input,textarea,select')) {
            e.preventDefault();
            toggleFullscreen();
        }

        // T → Palet toggle
        if (e.key === 't' && !e.target.matches('input,textarea,select')) {
            e.preventDefault();
            togglePalette();
        }

        // A → Adım ekle
        if (e.key === 'a' && !e.target.matches('input,textarea,select')) {
            e.preventDefault();
            openAddModal('click');
        }

        // + / - → Zoom
        if (e.key === '+' && !e.target.matches('input,textarea,select')) {
            e.preventDefault();
            zoomIn();
        }
        if (e.key === '-' && !e.target.matches('input,textarea,select')) {
            e.preventDefault();
            zoomOut();
        }
        if (e.key === '0' && !e.target.matches('input,textarea,select')) {
            e.preventDefault();
            zoomReset();
        }

        // ? → Klavye kısayollarını göster
        if (e.key === '?' && !e.target.matches('input,textarea,select')) {
            e.preventDefault();
            const hints = document.getElementById('keyboard-hints');
            hints.classList.toggle('show');
            setTimeout(() => hints.classList.remove('show'), 3000);
        }
    });

    /* ── Canvas scroll zoom ──────────────────────── */
    document.getElementById('view-canvas')?.addEventListener('wheel', e => {
        if (e.ctrlKey) return; // Tarayıcı varsayılan zoom
        e.preventDefault();
        if (e.deltaY < 0) zoomIn();
        else zoomOut();
    }, { passive: false });

    /* ── Event listeners ─────────────────────────── */
    document.addEventListener('DOMContentLoaded', () => {
        load();
        renderPalette();

        document.getElementById('palette-search')
            ?.addEventListener('input', e => renderPalette(e.target.value));

        document.querySelectorAll('.vtab').forEach(btn =>
            btn.addEventListener('click', () => setView(btn.dataset.view))
        );

        ['btn-add-step', 'canvas-add-btn', 'table-add-btn'].forEach(id =>
            document.getElementById(id)?.addEventListener('click', () => openAddModal('click'))
        );

        document.getElementById('modal-close')?.addEventListener('click', closeAddModal);
        document.getElementById('modal-cancel')?.addEventListener('click', closeAddModal);
        document.getElementById('modal-add')?.addEventListener('click', confirmAddStep);
        document.getElementById('add-step-modal')?.addEventListener('click', e => {
            if (e.target === e.currentTarget) closeAddModal();
        });

        document.getElementById('modal-sel-value')
            ?.addEventListener('input', e => autoDetectInModal(e.target.value));

        document.getElementById('props-apply')?.addEventListener('click', applyProps);
        document.getElementById('props-delete')?.addEventListener('click', () => {
            if (selectedIdx !== null) deleteStep(selectedIdx);
        });

        document.getElementById('btn-save')?.addEventListener('click', save);
        document.getElementById('btn-run')?.addEventListener('click', run);
        document.getElementById('btn-toggle-palette')?.addEventListener('click', togglePalette);

        // Zoom kontrolleri
        document.getElementById('zoom-in')?.addEventListener('click', zoomIn);
        document.getElementById('zoom-out')?.addEventListener('click', zoomOut);
        document.getElementById('zoom-reset')?.addEventListener('click', zoomReset);
    });

})();