/**
 * Schedule App — vanilla JS (extracted from inline <script>)
 * Mounts inside #app-schedule using HTML <template> elements.
 */
import * as XLSX from 'xlsx';

if (window.DERS_PROGRAMI_APP_LOADED) {
    // Idempotent: skip re-init in case of HMR or duplicate import
} else {
    window.DERS_PROGRAMI_APP_LOADED = true;
    initScheduleApp();
}

function initScheduleApp() {
    // Parse hash and navigate to appropriate Quran view
    const parseQuranHash = () => {
        const hash = window.location.hash;
        if (!hash.startsWith('#quran')) return null;

        const path = hash.replace('#quran/', '');
        if (path === 'notes') return { view: 'my_notes' };
        if (path === 'playlists') return { view: 'playlists_list' };

        const parts = path.split('/');
        const surahNum = parseInt(parts[0]);
        const ayahNum = parts[1] ? parseInt(parts[1]) : null;
        if (surahNum >= 1 && surahNum <= 114) {
            return { view: 'reader', surahNumber: surahNum, ayahNumber: ayahNum };
        }
        return { view: 'reader' };
    };

    // Global toggle function for React to call
    window.toggleQuranView = (show, fromHistory = false) => {
        const scheduleApp = document.getElementById('app-schedule');
        const quranApp = document.getElementById('quran-root');

        if (show) {
            scheduleApp.classList.add('hidden');
            quranApp.classList.remove('hidden');
            const isDark = document.documentElement.classList.contains('dark');
            if (window.syncReactTheme) window.syncReactTheme(isDark);

            if (!fromHistory && !window.location.hash.startsWith('#quran')) {
                history.pushState({ quran: true, view: 'reader' }, '', '#quran');
            }

            // On refresh: store pending surah from hash (e.g. #quran/2)
            // React will pick it up once surahs are loaded
            if (fromHistory && window.location.hash.startsWith('#quran')) {
                const route = parseQuranHash();
                if (route) {
                    if (route.view === 'my_notes' || route.view === 'playlists_list') {
                        window.__pendingQuranRoute = route;
                    } else if (route.surahNumber) {
                        window.__pendingQuranSurah = route.surahNumber;
                        if (route.ayahNumber) window.__pendingQuranAyah = route.ayahNumber;
                    }
                }
            }
        } else {
            quranApp.classList.add('hidden');
            scheduleApp.classList.remove('hidden');

            if (!fromHistory && window.location.hash.startsWith('#quran')) {
                history.replaceState(null, '', window.location.pathname);
            }
        }
    };

    // Combined popstate listener to handle back/forward navigation and hash routing
    let _popstateJustFired = false;
    window.addEventListener('popstate', (event) => {
        _popstateJustFired = true;
        setTimeout(() => { _popstateJustFired = false; }, 50);

        const state = event.state;
        const route = parseQuranHash();

        if ((state && state.quran) || route) {
            window.toggleQuranView(true, true);
            if (window.dispatchQuranNavigation) {
                window.dispatchQuranNavigation(state || { quran: true, ...route });
            }
        } else {
            window.toggleQuranView(false, true);
        }
    });

    document.getElementById('btn-open-quran').addEventListener('click', (e) => {
        e.preventDefault();
        window.toggleQuranView(true);
    });

    // Initial routing check with hash parsing
    const initialRoute = parseQuranHash();
    if (initialRoute) {
        // Set pending route immediately so React picks it up if it mounts before the timeout
        window.__pendingQuranRoute = initialRoute;
        setTimeout(() => {
            window.toggleQuranView(true, true);
            // If React already attached dispatchQuranNavigation, use it and clear the pending flag
            // to prevent double-dispatch via the useEffect initial-data path
            setTimeout(() => {
                if (window.dispatchQuranNavigation) {
                    window.__pendingQuranRoute = null;
                    window.dispatchQuranNavigation({ quran: true, ...initialRoute });
                }
                // else: __pendingQuranRoute remains set and React picks it up on surah load
            }, 200);
        }, 100);
    }

    window.addEventListener('hashchange', () => {
        if (_popstateJustFired) return;
        if (window.location.hash.startsWith('#quran')) {
            window.toggleQuranView(true, true);
            const route = parseQuranHash();
            if (route && window.dispatchQuranNavigation) {
                window.dispatchQuranNavigation({ quran: true, ...route });
            }
        } else {
            window.toggleQuranView(false, true);
        }
    });

    const CONFIG = Object.freeze({
        CACHE_KEY: 'ders_programi_v9_xlsx',
        CSV_URL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQR-t6FwWuwU-JOYcDVEbLdkXT7R8cuvcuz9IPuOY78MPWM44MesHJKBHyI8ZVOehuh5yvv99yI2jLd/pub?output=xlsx',
        CLASSES: {
            hidden: 'hidden',
            rotate: 'rotate-icon',
            menuIn: ['scale-100', 'opacity-100'],
            menuOut: ['scale-95', 'opacity-0'],
            btnPrimary: ['bg-emerald-50', 'dark:bg-emerald-900/40', 'text-emerald-700', 'dark:text-emerald-400', 'hover:bg-emerald-100', 'dark:hover:bg-emerald-900/60'],
            btnSecondary: ['bg-amber-50', 'dark:bg-amber-900/30', 'text-amber-700', 'dark:text-amber-400', 'hover:bg-amber-100', 'dark:hover:bg-amber-900/50']
        },
        MONTHS: { 'ocak': 0, 'subat': 1, 'mart': 2, 'nisan': 3, 'mayis': 4, 'haziran': 5, 'temmuz': 6, 'agustos': 7, 'eylul': 8, 'ekim': 9, 'kasim': 10, 'aralik': 11 },
        SEARCH_DEBOUNCE_MS: 150,
        JOIN_TOLERANCE_MIN: 90
    });

    const EXTRA_RESOURCES = [
        { name: "Harf telaffuzu", url: "https://drive.google.com/file/d/1DLRV_JpC575qT6psdeiL9eI8VHE8usWw/view?usp=drive_link" },
        { name: "Kur'an Dersi 1", url: "https://drive.google.com/file/d/1-B8LH40llBzn27A3sBQQSBP-dI7P_sWO/view?usp=drive_link" },
        { name: "Kur'an Dersi 2", url: "https://drive.google.com/file/d/1djd_lLS8PyqmP-_5hjfkGR2jDm7dbRCp/view?usp=drive_link" },
        { name: "Kur'an Dersi 3", url: "https://drive.google.com/file/d/10YQXMUTkcMyWww5qFm6uKjtoreGaPGwI/view?usp=drive_link" },
        { name: "Kur'an Dersi 4", url: "https://drive.google.com/file/d/1shMgMEn30NPCrEHbgq0UWqZz21KDsmWI/view?usp=drive_link" },
        { name: "Kur'an Dersi 5", url: "https://drive.google.com/file/d/1DToY7jOE2OnyLQKhCs0s2WYLrN6AkTE8/view?usp=drive_link" },
        { name: "Kur'an Dersi 6", url: "https://drive.google.com/file/d/1RgscC_0-riGl4Ocjt46xKljns1MVeAVI/view?usp=drive_link" },
        { name: "Kur'an Dersi 7", url: "https://drive.google.com/file/d/1tT7208haWxluGZClorbA_KEL9q7CJKWC/view?usp=drive_link" },
        { name: "Kur'an Dersi 17", url: "https://drive.google.com/file/d/1IF52k3Yj-2mCdvomJ_Yml7Pe6d8au5Ps/view?usp=drive_link" },
        { name: "Kur'an dersi notlar 1", url: "https://drive.google.com/file/d/1qiy60bnYz22o18KpV7UPotZhPqvNbZ2H/view?usp=drive_link" },
        { name: "Kur'an dersi notlar 2", url: "https://drive.google.com/file/d/19BR6RSEGndxEAoyqiIKeEBRtmv5StuG3/view?usp=drive_link" },
        { name: "Kur'an dersi notlar 3", url: "https://drive.google.com/file/d/1FAwK7eYkDEwJmdDL7aBHCvKxH-cLAMQw/view?usp=drive_link" },
        { name: "Kur'an dersi notlar 4", url: "https://drive.google.com/file/d/1RSqFv2Wy16pmM4p4kxPFw3FYuLvNaJTg/view?usp=drive_link" },
        { name: "Kur'an dersi notlar 5", url: "https://drive.google.com/file/d/18Z8L6uLyV5do0GZaiODcdVSbuBVRiFYw/view?usp=drive_link" }
    ];

    const Utils = {
        normalizeText(val) {
            if (!val) return '';
            const trMap = { 'İ': 'i', 'I': 'ı', 'ı': 'i', 'ş': 's', 'Ş': 's', 'ğ': 'g', 'Ğ': 'g', 'ü': 'u', 'Ü': 'u', 'ö': 'o', 'Ö': 'o', 'ç': 'c', 'Ç': 'c', 'â': 'a', 'Â': 'a', 'î': 'i', 'Î': 'i', 'û': 'u', 'Û': 'u' };
            return String(val)
                .replace(/[İIışŞğĞüÜöÖçÇâÂîÎûÛ]/g, c => trMap[c] || c)
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '');
        },
        parseTimestamp(dateStr, timeStr) {
            try {
                const normDate = this.normalizeText(dateStr);
                const normTime = timeStr ? timeStr.trim() : '00:00';
                const dayMatch = normDate.match(/(\d+)/);
                if (!dayMatch) return 0;
                const day = parseInt(dayMatch[1], 10);
                let monthIndex = -1;
                for (const [key, val] of Object.entries(CONFIG.MONTHS)) {
                    if (normDate.includes(key) || normDate.includes(key.substring(0, 3))) {
                        monthIndex = val;
                        break;
                    }
                }
                if (monthIndex === -1) return 0;
                const [hour, minute] = normTime.split(':').map(n => parseInt(n, 10) || 0);
                const now = new Date();
                let year = now.getFullYear();
                const currentMonth = now.getMonth();
                if (currentMonth > 8 && monthIndex < 3) year += 1;
                else if (currentMonth < 3 && monthIndex > 8) year -= 1;
                const candidate = Date.UTC(year, monthIndex, day, hour - 3, minute);
                if (candidate - now.getTime() > 60 * 24 * 60 * 60 * 1000) year -= 1;
                return Date.UTC(year, monthIndex, day, hour - 3, minute);
            } catch (e) { console.warn(e); return 0; }
        }
    };

    class DataManager {
        constructor() { this.groupedData = {}; }
        get resources() { return EXTRA_RESOURCES; }
        loadFromCache() {
            try {
                const raw = localStorage.getItem(CONFIG.CACHE_KEY);
                if (!raw) return null;
                const parsed = JSON.parse(raw);
                Object.values(parsed).flat().forEach(item => {
                    if (!item.searchIndex) item.searchIndex = Utils.normalizeText(`${item.subject} ${item.speaker} ${item.date} ${item.day}`);
                });
                this.groupedData = parsed;
                return this.groupedData;
            } catch (e) { localStorage.removeItem(CONFIG.CACHE_KEY); return null; }
        }
        saveToCache(data) {
            this.groupedData = data;
            try { localStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify(data)); } catch (e) { /* quota — non-fatal */ }
        }
        async fetchFreshData() {
            try {
                const cacheBuster = `&_t=${Date.now()}&_r=${Math.floor(Math.random() * 1e7)}`;
                const response = await fetch(CONFIG.CSV_URL + cacheBuster, { cache: 'no-store' });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const buffer = await response.arrayBuffer();
                const workbook = XLSX.read(buffer, { type: 'array' });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });
                return this._processRows(rows);
            } catch (error) { console.error('[DataManager] fetchFreshData failed:', error); return null; }
        }
        _processRows(rows) {
            const processed = rows.slice(1).map(cols => {
                const clean = (val) => (val != null) ? String(val).trim() : '';
                const item = {
                    week: clean(cols[0]), date: clean(cols[1]), day: clean(cols[2]),
                    time: clean(cols[3]), subject: clean(cols[4]), speaker: clean(cols[5]),
                    link1: clean(cols[6]), link2: clean(cols[7])
                };
                return {
                    ...item,
                    timestamp: Utils.parseTimestamp(item.date, item.time),
                    searchIndex: Utils.normalizeText(`${item.subject} ${item.speaker} ${item.date} ${item.day}`)
                };
            }).filter(item => item.subject);
            return processed.reduce((acc, item) => {
                (acc[item.week] = acc[item.week] || []).push(item);
                return acc;
            }, {});
        }
        search(query) {
            if (!query) return [];
            const normQ = Utils.normalizeText(query);
            return Object.values(this.groupedData).flat().filter(item => {
                const idx = item.searchIndex || Utils.normalizeText(`${item.subject} ${item.speaker} ${item.date} ${item.day}`);
                return idx.includes(normQ);
            });
        }
    }

    class Renderer {
        constructor() {
            this._container = document.getElementById('main-content');
            this._templates = {
                week: document.getElementById('tpl-week-section'),
                card: document.getElementById('tpl-card'),
                btn: document.getElementById('tpl-button'),
                empty: document.getElementById('tpl-empty'),
                menuItem: document.getElementById('tpl-menu-item'),
                yearHeader: document.getElementById('tpl-year-header')
            };
        }
        _clone(id) { return this._templates[id].content.cloneNode(true); }
        _setText(node, selector, text) { const el = node.querySelector(selector); if (el) el.textContent = text || ''; }
        _createCard(item, showWeekBadge = false) {
            const node = this._clone('card');
            const { subject, speaker, time, date, day, week, link1, link2, timestamp } = item;
            this._setText(node, '[data-slot="date-day"]', `${date}, ${day}`);
            this._setText(node, '[data-slot="subject"]', subject);
            this._setText(node, '[data-slot="speaker"]', speaker || 'Belirtilmedi');
            this._setText(node, '[data-slot="time"]', time);
            const toleranceMs = CONFIG.JOIN_TOLERANCE_MIN * 60 * 1000;
            const joinBtn = node.querySelector('[data-slot="join-btn"]');
            if (joinBtn && timestamp > 0 && Date.now() > (timestamp + toleranceMs)) joinBtn.remove();
            if (showWeekBadge) {
                const badge = node.querySelector('[data-slot="week-badge"]');
                badge.textContent = week;
                badge.classList.remove('hidden');
            }
            const actionsContainer = node.querySelector('[data-slot="actions"]');
            if (!link1 && !link2) {
                const span = document.createElement('span');
                span.className = 'text-xs text-gray-400 italic';
                span.textContent = 'Kayıt bulunmuyor';
                actionsContainer.appendChild(span);
            } else {
                if (link1) actionsContainer.appendChild(this._createButton(link1, 'Ders Notu', 'fa-file-lines', 'primary'));
                if (link2) actionsContainer.appendChild(this._createButton(link2, 'Tilavet/Ses', 'fa-book-quran', 'secondary'));
            }
            return node;
        }
        _createButton(url, text, iconClass, type) {
            const node = this._clone('btn');
            const a = node.querySelector('a');
            a.href = url;
            const classes = type === 'primary' ? CONFIG.CLASSES.btnPrimary : CONFIG.CLASSES.btnSecondary;
            a.classList.add(...classes);
            node.querySelector('i').classList.add('fa-solid', iconClass);
            node.querySelector('span').textContent = text;
            return node;
        }
        showLoading() { this._container.innerHTML = `<div class="text-center mt-10 text-emerald-600 dark:text-emerald-400 fade-in"><i class="fa-solid fa-circle-notch fa-spin text-3xl mb-3"></i><p>Ders programı yükleniyor...</p></div>`; }
        showError() { this._container.innerHTML = `<div class="text-center mt-10 text-red-500 fade-in"><i class="fa-solid fa-triangle-exclamation text-3xl mb-3"></i><p>Veri yüklenemedi. Bağlantınızı kontrol edin.</p><button onclick="location.reload()" class="mt-4 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded text-sm font-bold">Tekrar Dene</button></div>`; }
        renderSchedule(groupedData) {
            requestAnimationFrame(() => {
                this._container.innerHTML = '';
                const weeks = Object.keys(groupedData).reverse();
                if (weeks.length === 0) { this._container.appendChild(this._clone('empty')); return; }
                const fragment = document.createDocumentFragment();

                let lastYear = null;

                weeks.forEach((week, index) => {
                    const items = groupedData[week];

                    const yearCounts = {};
                    items.forEach(item => {
                        const y = new Date(item.timestamp).getUTCFullYear();
                        yearCounts[y] = (yearCounts[y] || 0) + 1;
                    });

                    let weekYear = parseInt(Object.keys(yearCounts)[0]);
                    let maxCount = 0;

                    for (const [year, count] of Object.entries(yearCounts)) {
                        if (count > maxCount) {
                            maxCount = count;
                            weekYear = parseInt(year);
                        } else if (count === maxCount) {
                            weekYear = Math.max(weekYear, parseInt(year));
                        }
                    }

                    if (weekYear !== lastYear) {
                        const yearHeader = this._clone('yearHeader');
                        this._setText(yearHeader, '[data-slot="year"]', weekYear);
                        fragment.appendChild(yearHeader);
                        lastYear = weekYear;
                    }

                    const section = this._clone('week');
                    const sectionEl = section.querySelector('section');
                    const header = sectionEl.querySelector('.week-header');
                    const content = sectionEl.querySelector('.week-content');
                    const icon = header.querySelector('[data-slot="toggle-icon"]');
                    this._setText(section, '[data-slot="week-title"]', week);
                    items.forEach(item => content.appendChild(this._createCard(item)));
                    if (index === 0) { content.classList.remove(CONFIG.CLASSES.hidden); icon.classList.add(CONFIG.CLASSES.rotate); header.setAttribute('aria-expanded', 'true'); }
                    fragment.appendChild(section);
                });
                this._container.appendChild(fragment);
                this._container.onclick = (e) => {
                    const header = e.target.closest('.week-header');
                    if (!header) return;
                    const section = header.parentElement;
                    const content = section.querySelector('.week-content');
                    const icon = header.querySelector('[data-slot="toggle-icon"]');
                    content.classList.toggle(CONFIG.CLASSES.hidden);
                    icon.classList.toggle(CONFIG.CLASSES.rotate);
                };
            });
        }
        renderFiltered(list) {
            requestAnimationFrame(() => {
                this._container.innerHTML = '';
                this._container.onclick = null;
                if (!list?.length) { this._container.appendChild(this._clone('empty')); return; }
                const sortedList = [...list].sort((a, b) => b.timestamp - a.timestamp);
                const fragment = document.createDocumentFragment();
                const wrapper = document.createElement('div');
                wrapper.className = 'p-2 fade-in';
                sortedList.forEach(item => wrapper.appendChild(this._createCard(item, true)));
                fragment.appendChild(wrapper);
                this._container.appendChild(fragment);
            });
        }
        renderMenu(items) {
            const menu = document.getElementById('menu-quran');
            if (!menu) return;
            const fragment = document.createDocumentFragment();
            items.forEach(note => {
                const node = this._clone('menuItem');
                const a = node.querySelector('a');
                a.href = note.url;
                this._setText(node, '[data-slot="text"]', note.name);
                const isAudio = note.name.toLowerCase().includes('dersi') && !note.name.toLowerCase().includes('not');
                node.querySelector('[data-slot="icon"]').classList.add(isAudio ? 'fa-file-audio' : 'fa-file-lines');
                fragment.appendChild(node);
            });
            menu.innerHTML = '';
            menu.appendChild(fragment);
        }
    }

    class ThemeManager {
        constructor() {
            this.html = document.documentElement;
            this.btn = document.getElementById('btn-theme-toggle');
            this.icon = this.btn?.querySelector('i');
            if (this.btn) this.init();
        }
        init() {
            const local = localStorage.getItem('theme');
            const sys = window.matchMedia('(prefers-color-scheme: dark)').matches;
            const isDark = local === 'dark' || (!local && sys);
            this.apply(isDark);
            this.btn.addEventListener('click', () => {
                const isCurrentDark = this.html.classList.contains('dark');
                this.apply(!isCurrentDark);
            });
        }
        apply(isDark) {
            this.html.classList.toggle('dark', isDark);
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            if (this.icon) this.icon.className = isDark ? 'fa-solid fa-sun text-white text-xs' : 'fa-solid fa-moon text-white text-xs';

            const metaThemeColor = document.querySelector('meta[name="theme-color"]');
            if (metaThemeColor) {
                metaThemeColor.setAttribute('content', isDark ? '#064e3b' : '#047857');
            }

            if (window.syncReactTheme) window.syncReactTheme(isDark);
        }
    }

    class App {
        constructor() {
            this._dataManager = new DataManager();
            this._renderer = new Renderer();
            this._themeManager = new ThemeManager();
            this._searchTimer = null;
        }
        async init() {
            this._renderer.renderMenu(this._dataManager.resources);
            this._setupDropdown();
            this._bindSearch();
            const cachedData = this._dataManager.loadFromCache();
            let isCachedDisplayed = false;
            if (cachedData && Object.keys(cachedData).length > 0) { this._renderer.renderSchedule(cachedData); isCachedDisplayed = true; }
            else { this._renderer.showLoading(); }
            const freshData = await this._dataManager.fetchFreshData();
            if (freshData) {
                const hasChanges = JSON.stringify(cachedData || {}) !== JSON.stringify(freshData);
                if (hasChanges || !isCachedDisplayed) { this._dataManager.saveToCache(freshData); this._renderer.renderSchedule(freshData); }
            } else if (!isCachedDisplayed) { this._renderer.showError(); }
        }
        _bindSearch() {
            const input = document.getElementById('input-search');
            if (!input) return;
            const newInfo = input.cloneNode(true);
            input.parentNode.replaceChild(newInfo, input);
            const dismissKeyboard = () => { if (document.activeElement === newInfo) newInfo.blur(); };
            window.addEventListener('touchmove', dismissKeyboard, { passive: true });
            window.addEventListener('scroll', dismissKeyboard, { passive: true });
            newInfo.addEventListener('input', (e) => {
                clearTimeout(this._searchTimer);
                const query = e.target.value.trim();
                this._searchTimer = setTimeout(() => {
                    if (query) { const results = this._dataManager.search(query); this._renderer.renderFiltered(results); }
                    else { this._renderer.renderSchedule(this._dataManager.groupedData); }
                }, CONFIG.SEARCH_DEBOUNCE_MS);
            });
        }
        _setupDropdown() {
            const btn = document.getElementById('btn-quran-menu');
            const menu = document.getElementById('menu-quran');
            if (!btn || !menu) return;
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            const icon = newBtn.querySelector('.fa-chevron-down');
            let isOpen = false;
            const toggle = (forceState) => {
                isOpen = forceState !== undefined ? forceState : !isOpen;
                if (isOpen) {
                    menu.classList.remove(CONFIG.CLASSES.hidden);
                    requestAnimationFrame(() => {
                        menu.classList.remove(...CONFIG.CLASSES.menuOut);
                        menu.classList.add(...CONFIG.CLASSES.menuIn);
                        icon.classList.add(CONFIG.CLASSES.rotate);
                    });
                    newBtn.setAttribute('aria-expanded', 'true');
                } else {
                    menu.classList.remove(...CONFIG.CLASSES.menuIn);
                    menu.classList.add(...CONFIG.CLASSES.menuOut);
                    icon.classList.remove(CONFIG.CLASSES.rotate);
                    newBtn.setAttribute('aria-expanded', 'false');
                    setTimeout(() => { if (!isOpen) menu.classList.add(CONFIG.CLASSES.hidden); }, 200);
                }
            };
            newBtn.addEventListener('click', (e) => { e.stopPropagation(); toggle(); });
            document.addEventListener('click', (e) => { if (isOpen && !newBtn.contains(e.target) && !menu.contains(e.target)) toggle(false); });
        }
    }

    // DOM is parsed by the time this module runs (Vite ESM modules execute after DOMContentLoaded for module scripts in <body>)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => new App().init());
    } else {
        new App().init();
    }
}
