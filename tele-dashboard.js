// Tele Dashboard JavaScript - v5.0
let teleCharts = {};

document.addEventListener('DOMContentLoaded', function() {
    const switchBtn = document.getElementById('switchPortal');
    if (switchBtn) switchBtn.addEventListener('click', () => { window.location.href = 'https://phil7799.github.io/little-portal-africa/dashboard.html#overview'; });

    const hasData = dataParser.loadFromLocalStorage();
    if (!hasData) { console.log('No data'); return; }

    const lastUpdate = localStorage.getItem('lastDataUpdate');
    if (lastUpdate) { const el = document.getElementById('lastUpdate'); if (el) el.textContent = new Date(lastUpdate).toLocaleString(); }

    initTeleFilters();
    updateTeleDashboard();

    document.getElementById('applyFilters')?.addEventListener('click', updateTeleDashboard);
    document.getElementById('resetFilters')?.addEventListener('click', resetTeleFilters);
    document.getElementById('monthFilter')?.addEventListener('change', onMonthChange);
    document.getElementById('weekFilter')?.addEventListener('change', updateTeleDashboard);
});

function initTeleFilters() {
    const wf = document.getElementById('weekFilter');
    if (!wf) return;
    while (wf.options.length > 1) wf.remove(1);

    const tele = dataParser.processedData.tele || {};
    const weeks = Object.keys(tele.byWeek || {}).sort((a, b) => {
        const na = parseInt(String(a).match(/\d+/)?.[0] || 0);
        const nb = parseInt(String(b).match(/\d+/)?.[0] || 0);
        return na - nb;
    });
    weeks.forEach(w => {
        const o = document.createElement('option');
        o.value = w; o.textContent = w;
        wf.appendChild(o);
    });
}

function onMonthChange() {
    // When month is selected, update week filter to only show weeks of that month
    const month = document.getElementById('monthFilter')?.value || 'All';
    const wf = document.getElementById('weekFilter');
    if (!wf) return;
    while (wf.options.length > 1) wf.remove(1);
    const allOpt = document.createElement('option');
    allOpt.value = 'All'; allOpt.textContent = 'All Weeks';
    wf.appendChild(allOpt);

    const tele = dataParser.processedData.tele || {};
    const weeks = Object.keys(tele.byWeek || {}).sort((a,b) => parseInt(String(a).match(/\d+/)?.[0]||0) - parseInt(String(b).match(/\d+/)?.[0]||0));
    weeks.forEach(w => {
        const wd = tele.byWeek[w];
        if (month === 'All' || wd.month === month) {
            const o = document.createElement('option');
            o.value = w; o.textContent = w + (month === 'All' ? ` (${wd.month})` : '');
            wf.appendChild(o);
        }
    });
    wf.value = 'All';
    updateTeleDashboard();
}

function updateTeleDashboard() {
    const month = document.getElementById('monthFilter')?.value || 'All';
    const week = document.getElementById('weekFilter')?.value || 'All';
    const tele = dataParser.processedData.tele || { byWeek: {}, byMonth: {}, totals: {} };

    // Aggregate based on filters
    let agg = { busbuddy_booked: 0, busbuddy_attended: 0, busbuddy_trials: 0, taxi_booked: 0, taxi_attended: 0, taxi_closed: 0 };
    let filteredWeeks = [];

    if (week !== 'All') {
        // Single week
        const wd = tele.byWeek[week];
        if (wd) { Object.keys(agg).forEach(k => agg[k] = wd[k] || 0); filteredWeeks = [week]; }
    } else if (month !== 'All') {
        // All weeks for a month
        const md = tele.byMonth[month];
        if (md) { Object.keys(agg).forEach(k => agg[k] = md[k] || 0); filteredWeeks = md.weeks || []; }
    } else {
        // All
        Object.keys(agg).forEach(k => agg[k] = tele.totals[k] || 0);
        filteredWeeks = Object.keys(tele.byWeek || {}).sort((a,b) => parseInt(String(a).match(/\d+/)?.[0]||0) - parseInt(String(b).match(/\d+/)?.[0]||0));
    }

    updateTeleStats(agg);
    updateTeleCharts(tele, month, week, filteredWeeks);
    updateTeleTable(tele, month, week, filteredWeeks);
}

function updateTeleStats(agg) {
    const bbAttendRate = agg.busbuddy_booked > 0 ? (agg.busbuddy_attended / agg.busbuddy_booked * 100) : 0;
    const taxiCloseRate = agg.taxi_booked > 0 ? (agg.taxi_closed / agg.taxi_booked * 100) : 0;
    const overallClose = (agg.busbuddy_booked + agg.taxi_booked) > 0
        ? ((agg.taxi_closed + agg.busbuddy_trials) / (agg.busbuddy_booked + agg.taxi_booked) * 100) : 0;
    const bbTrialRate = agg.busbuddy_attended > 0 ? (agg.busbuddy_trials / agg.busbuddy_attended * 100) : 0;

    setText('bbBooked', agg.busbuddy_booked);
    setText('bbAttended', agg.busbuddy_attended);
    setText('bbAttendRate', bbAttendRate.toFixed(1) + '%');
    setText('bbTrials', agg.busbuddy_trials);
    setText('taxiBooked', agg.taxi_booked);
    setText('taxiClosed', agg.taxi_closed);
    setText('taxiCloseRate', taxiCloseRate.toFixed(1) + '%');
    setText('overallCloseRate', overallClose.toFixed(1) + '%');

    setStatPct('bbBookedRate', bbAttendRate);
    setStatPct('bbAttendChange', bbAttendRate);
    setStatPct('bbTrialsRate', bbTrialRate);
    setStatPct('taxiBookedRate', taxiCloseRate);
    setStatPct('taxiClosedChange', taxiCloseRate);
    setStatPct('closeRateChange', overallClose);

    // Funnel
    const totalBooked = agg.busbuddy_booked + agg.taxi_booked;
    const totalAttended = agg.busbuddy_attended + agg.taxi_attended;
    const totalClosed = agg.taxi_closed + agg.busbuddy_trials;
    setText('funnelBooked', totalBooked);
    setText('funnelAttended', totalAttended);
    setText('funnelClosed', totalClosed);

    // Animate funnel bars width
    const max = totalBooked || 1;
    animateFunnel('funnel-booked', 100);
    animateFunnel('funnel-attended', (totalAttended / max) * 100);
    animateFunnel('funnel-closed', (totalClosed / max) * 100);
}

function animateFunnel(id, pct) {
    const el = document.querySelector(`#${id} .funnel-bar`);
    if (el) el.style.width = Math.max(pct, 10) + '%';
}

function updateTeleCharts(tele, month, week, filteredWeeks) {
    // BusBuddy weekly chart
    const bbCtx = document.getElementById('bbWeeklyChart');
    if (bbCtx) {
        destroyTeleChart('bbWeeklyChart');
        const labels = filteredWeeks;
        const booked = labels.map(w => tele.byWeek[w]?.busbuddy_booked || 0);
        const attended = labels.map(w => tele.byWeek[w]?.busbuddy_attended || 0);
        const trials = labels.map(w => tele.byWeek[w]?.busbuddy_trials || 0);
        teleCharts.bbWeeklyChart = new Chart(bbCtx, {
            type: 'bar',
            data: { labels, datasets: [
                { label: 'Booked', data: booked, backgroundColor: 'rgba(26,115,232,0.75)' },
                { label: 'Attended', data: attended, backgroundColor: 'rgba(52,168,83,0.75)' },
                { label: 'Trials', data: trials, backgroundColor: 'rgba(251,188,4,0.75)' }
            ]},
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
        });
    }

    // Taxi weekly chart
    const taxiCtx = document.getElementById('taxiWeeklyChart');
    if (taxiCtx) {
        destroyTeleChart('taxiWeeklyChart');
        const labels = filteredWeeks;
        const booked = labels.map(w => tele.byWeek[w]?.taxi_booked || 0);
        const attended = labels.map(w => tele.byWeek[w]?.taxi_attended || 0);
        const closed = labels.map(w => tele.byWeek[w]?.taxi_closed || 0);
        teleCharts.taxiWeeklyChart = new Chart(taxiCtx, {
            type: 'bar',
            data: { labels, datasets: [
                { label: 'Booked', data: booked, backgroundColor: 'rgba(156,33,192,0.75)' },
                { label: 'Attended', data: attended, backgroundColor: 'rgba(0,188,212,0.75)' },
                { label: 'Closed', data: closed, backgroundColor: 'rgba(234,67,53,0.75)' }
            ]},
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
        });
    }

    // Monthly trend
    const mCtx = document.getElementById('monthlyTrendChart');
    if (mCtx) {
        destroyTeleChart('monthlyTrendChart');
        const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        const mLabels = months.map(m => m.slice(0,3));
        const bbB = months.map(m => tele.byMonth[m]?.busbuddy_booked || 0);
        const bbA = months.map(m => tele.byMonth[m]?.busbuddy_attended || 0);
        const txB = months.map(m => tele.byMonth[m]?.taxi_booked || 0);
        const txC = months.map(m => tele.byMonth[m]?.taxi_closed || 0);
        teleCharts.monthlyTrendChart = new Chart(mCtx, {
            type: 'line',
            data: { labels: mLabels, datasets: [
                { label: 'BB Booked', data: bbB, borderColor: '#1a73e8', backgroundColor: 'rgba(26,115,232,0.1)', fill: true, tension: 0.3, borderWidth: 2 },
                { label: 'BB Attended', data: bbA, borderColor: '#34a853', backgroundColor: 'transparent', tension: 0.3, borderWidth: 2 },
                { label: 'Taxi Booked', data: txB, borderColor: '#9c27b0', backgroundColor: 'transparent', tension: 0.3, borderWidth: 2 },
                { label: 'Taxi Closed', data: txC, borderColor: '#ea4335', backgroundColor: 'transparent', tension: 0.3, borderWidth: 2 }
            ]},
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
        });
    }

    // Distribution pie
    const dCtx = document.getElementById('distributionChart');
    if (dCtx) {
        destroyTeleChart('distributionChart');
        const agg = { busbuddy_booked: 0, busbuddy_attended: 0, busbuddy_trials: 0, taxi_booked: 0, taxi_attended: 0, taxi_closed: 0 };
        filteredWeeks.forEach(w => { Object.keys(agg).forEach(k => agg[k] += tele.byWeek[w]?.[k] || 0); });
        teleCharts.distributionChart = new Chart(dCtx, {
            type: 'doughnut',
            data: {
                labels: ['BB Booked', 'BB Attended', 'BB Trials', 'Taxi Booked', 'Taxi Attended', 'Taxi Closed'],
                datasets: [{ data: [agg.busbuddy_booked, agg.busbuddy_attended, agg.busbuddy_trials, agg.taxi_booked, agg.taxi_attended, agg.taxi_closed], backgroundColor: ['rgba(26,115,232,0.8)','rgba(52,168,83,0.8)','rgba(251,188,4,0.8)','rgba(156,33,192,0.8)','rgba(0,188,212,0.8)','rgba(234,67,53,0.8)'], borderWidth: 2 }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
        });
    }
}

function updateTeleTable(tele, month, week, filteredWeeks) {
    const tbody = document.getElementById('teleTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    filteredWeeks.forEach(w => {
        const d = tele.byWeek[w];
        if (!d) return;
        const bbRate = d.busbuddy_booked > 0 ? (d.busbuddy_attended / d.busbuddy_booked * 100).toFixed(1) : '0.0';
        const taxiRate = d.taxi_booked > 0 ? (d.taxi_closed / d.taxi_booked * 100).toFixed(1) : '0.0';
        const row = tbody.insertRow();
        [w, d.month, d.busbuddy_booked, d.busbuddy_attended, d.busbuddy_trials,
            `<span class="${parseFloat(bbRate)>=50?'positive':'negative'}">${bbRate}%</span>`,
            d.taxi_booked, d.taxi_attended, d.taxi_closed,
            `<span class="${parseFloat(taxiRate)>=50?'positive':'negative'}">${taxiRate}%</span>`
        ].forEach(v => { const c = row.insertCell(); c.innerHTML = v; });
    });

    if (tbody.children.length === 0) {
        const row = tbody.insertRow(); const cell = row.insertCell();
        cell.colSpan = 10; cell.style.textAlign = 'center'; cell.style.padding = '30px';
        cell.innerHTML = '<h4>No data for selected filter</h4>';
    }
}

function destroyTeleChart(id) {
    if (teleCharts[id]) { teleCharts[id].destroy(); teleCharts[id] = null; }
}
function setText(id, v) { const e = document.getElementById(id); if (e) e.textContent = v; }
function setStatPct(id, v) {
    const e = document.getElementById(id);
    if (!e) return;
    const pos = v >= 50;
    e.className = 'stat-change ' + (pos ? 'positive' : 'negative');
    e.innerHTML = `<i class="fas fa-arrow-${pos?'up':'down'}"></i> ${v.toFixed(1)}%`;
}
function resetTeleFilters() {
    const mf = document.getElementById('monthFilter');
    const wf = document.getElementById('weekFilter');
    if (mf) mf.value = 'All';
    if (wf) { while (wf.options.length > 1) wf.remove(1); wf.value = 'All'; initTeleFilters(); }
    updateTeleDashboard();
}