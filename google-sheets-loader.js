// google-sheets-loader.js  v2
// Keeps dashboard data fresh from Google Sheets automatically.
// Drop this file in your portal folder and include it on every dashboard page.

(function () {
    const SHEETS_URL    = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR6Mt_7HSm1uNjf5UCymYcxXyqHF6YLOIn_EsCq9K05vtGFMA9SSBYqRqDE7ybYjdVLxXO6ZosOmh2F';
    const REFRESH_EVERY = 5  * 60 * 1000;   // background refresh every 5 min
    const STALE_AFTER   = 10 * 60 * 1000;   // treat cached data as stale after 10 min

    // ── Inject status banner ────────────────────────────────────────────────────
    function injectBanner() {
        const main = document.querySelector('.main-content');
        if (!main || document.getElementById('gs-banner')) return;

        const b = document.createElement('div');
        b.id = 'gs-banner';
        b.style.cssText = 'display:flex;align-items:center;justify-content:space-between;' +
            'padding:9px 16px;border-radius:8px;margin-bottom:16px;font-size:0.83rem;' +
            'background:var(--light-blue,#e8f0fe);border-left:4px solid #1a73e8;' +
            'transition:border-color .3s;gap:12px;flex-wrap:wrap';

        b.innerHTML =
            '<span style="display:flex;align-items:center;gap:8px;min-width:0">' +
                '<span id="gs-dot" style="width:9px;height:9px;border-radius:50%;background:#34a853;flex-shrink:0"></span>' +
                '<span id="gs-msg">Connected to Google Sheets</span>' +
            '</span>' +
            '<span style="display:flex;align-items:center;gap:10px;flex-shrink:0">' +
                '<span id="gs-age" style="color:var(--text-secondary,#5f6368);font-size:0.8rem"></span>' +
                '<button id="gs-btn" style="padding:4px 12px;border:none;border-radius:5px;cursor:pointer;' +
                    'background:#1a73e8;color:#fff;font-size:0.81rem;display:flex;align-items:center;gap:5px">' +
                    '<i class="fas fa-sync-alt" id="gs-icon"></i> Refresh' +
                '</button>' +
            '</span>';

        main.insertBefore(b, main.firstChild);
        document.getElementById('gs-btn').addEventListener('click', () => refreshNow(true));
    }

    // ── Banner helpers ─────────────────────────────────────────────────────────
    const $ = (id) => document.getElementById(id);
    const setMsg    = (t)  => { const e = $('gs-msg');  if (e) e.textContent = t; };
    const setDot    = (c)  => { const e = $('gs-dot');  if (e) e.style.background = c; };
    const setBorder = (c)  => { const e = $('gs-banner'); if (e) e.style.borderLeftColor = c; };
    const setSpin   = (on) => {
        const icon = $('gs-icon'); const btn = $('gs-btn');
        if (icon) icon.className = 'fas fa-sync-alt' + (on ? ' fa-spin' : '');
        if (btn)  btn.disabled = on;
    };

    function updateAge() {
        const el = $('gs-age');
        if (!el) return;
        const ts = localStorage.getItem('lastDataUpdate');
        if (!ts) { el.textContent = ''; return; }
        const mins = Math.round((Date.now() - new Date(ts)) / 60000);
        el.textContent = mins < 1 ? 'just now' : mins + 'm ago';
    }

    // ── Re-initialise whichever dashboard is currently active ─────────────────
    function reinitDashboard() {
        try {
            if (typeof updateHRDashboard     === 'function') { updateHRDashboard(); return; }
            if (typeof updateCharterDashboard === 'function') { updateCharterDashboard(); return; }
            if (typeof updateTeleDashboard    === 'function') {
                updateTeleDashboard();
                if (typeof updateHR2Dashboard === 'function') updateHR2Dashboard();
                return;
            }
            if (typeof initDashboard          === 'function') { initDashboard(); }
        } catch (e) { console.warn('Dashboard re-init after refresh failed:', e); }
    }

    // ── Core refresh ──────────────────────────────────────────────────────────
    async function refreshNow(userInitiated) {
        setSpin(true);
        setMsg('Syncing with Google Sheets…');
        setDot('#fbbc04');
        setBorder('#fbbc04');

        try {
            await dataParser.fetchFromGoogleSheets(SHEETS_URL);
            setMsg('Google Sheets — live ✓');
            setDot('#34a853');
            setBorder('#34a853');
            updateAge();
            if (userInitiated) reinitDashboard();
            setTimeout(() => { setMsg('Connected to Google Sheets'); setBorder('#1a73e8'); }, 3000);
        } catch (err) {
            console.error('Sheets refresh error:', err);
            setMsg('Refresh failed — showing cached data');
            setDot('#ea4335');
            setBorder('#ea4335');
            setTimeout(() => { setMsg('Connected to Google Sheets'); setDot('#34a853'); setBorder('#1a73e8'); }, 6000);
        }
        setSpin(false);
    }

    // ── Bootstrap on DOMContentLoaded ────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', async () => {
        injectBanner();
        updateAge();
        setInterval(updateAge, 60_000);

        const lastUpdate = localStorage.getItem('lastDataUpdate');
        const isStale    = !lastUpdate || (Date.now() - new Date(lastUpdate)) > STALE_AFTER;

        if (isStale) {
            // Data is missing or too old — fetch first, then render
            await refreshNow(false);
            reinitDashboard();
        } else {
            setMsg('Connected to Google Sheets');
            setDot('#34a853');
        }

        // Schedule background silent refresh
        setInterval(() => refreshNow(false), REFRESH_EVERY);
    });
})();