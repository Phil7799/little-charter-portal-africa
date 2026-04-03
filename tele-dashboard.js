// Tele Dashboard JavaScript - v6.0
// BusBuddy/Taxi telesales + HR2 Weekly Meetings (moved from HR page)
let teleCharts = {};
let hr2Charts = {};

document.addEventListener('DOMContentLoaded', function() {
    const switchBtn = document.getElementById('switchPortal');
    if (switchBtn) switchBtn.addEventListener('click', () => { window.location.href = 'https://phil7799.github.io/little-portal-africa/dashboard.html#overview'; });

    const hasData = dataParser.loadFromLocalStorage();
    if (!hasData) { console.log('No data'); return; }

    const lastUpdate = localStorage.getItem('lastDataUpdate');
    if (lastUpdate) { const el = document.getElementById('lastUpdate'); if (el) el.textContent = new Date(lastUpdate).toLocaleString(); }

    // --- BusBuddy/Taxi section ---
    initTeleFilters();
    updateTeleDashboard();
    document.getElementById('applyFilters')?.addEventListener('click', updateTeleDashboard);
    document.getElementById('resetFilters')?.addEventListener('click', resetTeleFilters);
    document.getElementById('monthFilter')?.addEventListener('change', onMonthChange);
    document.getElementById('weekFilter')?.addEventListener('change', updateTeleDashboard);

    // --- HR2 section ---
    initHR2Filters();
    updateHR2Dashboard();
    document.getElementById('applyHR2Filters')?.addEventListener('click', updateHR2Dashboard);
    document.getElementById('resetHR2Filters')?.addEventListener('click', resetHR2Filters);
    document.getElementById('hr2MonthFilter')?.addEventListener('change', onHR2MonthChange);
    document.getElementById('hr2WeekFilter')?.addEventListener('change', updateHR2Dashboard);
});

// ============================================================
// SECTION 1: BusBuddy & Taxi Telesales
// ============================================================

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
    const month = document.getElementById('monthFilter')?.value || 'All';
    const wf = document.getElementById('weekFilter');
    if (!wf) return;
    while (wf.options.length > 1) wf.remove(1);
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
    let agg = { busbuddy_booked: 0, busbuddy_attended: 0, busbuddy_trials: 0, taxi_booked: 0, taxi_attended: 0, taxi_closed: 0 };
    let filteredWeeks = [];

    if (week !== 'All') {
        const wd = tele.byWeek[week];
        if (wd) { Object.keys(agg).forEach(k => agg[k] = wd[k] || 0); filteredWeeks = [week]; }
    } else if (month !== 'All') {
        const md = tele.byMonth[month];
        if (md) { Object.keys(agg).forEach(k => agg[k] = md[k] || 0); filteredWeeks = md.weeks || []; }
    } else {
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

    const totalBooked = agg.busbuddy_booked + agg.taxi_booked;
    const totalAttended = agg.busbuddy_attended + agg.taxi_attended;
    const totalClosed = agg.taxi_closed + agg.busbuddy_trials;
    setText('funnelBooked', totalBooked);
    setText('funnelAttended', totalAttended);
    setText('funnelClosed', totalClosed);
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
    const bbCtx = document.getElementById('bbWeeklyChart');
    if (bbCtx) {
        destroyTeleChart('bbWeeklyChart');
        teleCharts.bbWeeklyChart = new Chart(bbCtx, {
            type: 'bar',
            data: { labels: filteredWeeks, datasets: [
                { label: 'Booked', data: filteredWeeks.map(w => tele.byWeek[w]?.busbuddy_booked || 0), backgroundColor: 'rgba(26,115,232,0.75)' },
                { label: 'Attended', data: filteredWeeks.map(w => tele.byWeek[w]?.busbuddy_attended || 0), backgroundColor: 'rgba(52,168,83,0.75)' },
                { label: 'Trials', data: filteredWeeks.map(w => tele.byWeek[w]?.busbuddy_trials || 0), backgroundColor: 'rgba(251,188,4,0.75)' }
            ]},
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
        });
    }

    const taxiCtx = document.getElementById('taxiWeeklyChart');
    if (taxiCtx) {
        destroyTeleChart('taxiWeeklyChart');
        teleCharts.taxiWeeklyChart = new Chart(taxiCtx, {
            type: 'bar',
            data: { labels: filteredWeeks, datasets: [
                { label: 'Booked', data: filteredWeeks.map(w => tele.byWeek[w]?.taxi_booked || 0), backgroundColor: 'rgba(156,33,192,0.75)' },
                { label: 'Attended', data: filteredWeeks.map(w => tele.byWeek[w]?.taxi_attended || 0), backgroundColor: 'rgba(0,188,212,0.75)' },
                { label: 'Closed', data: filteredWeeks.map(w => tele.byWeek[w]?.taxi_closed || 0), backgroundColor: 'rgba(234,67,53,0.75)' }
            ]},
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
        });
    }

    const mCtx = document.getElementById('monthlyTrendChart');
    if (mCtx) {
        destroyTeleChart('monthlyTrendChart');
        const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        teleCharts.monthlyTrendChart = new Chart(mCtx, {
            type: 'line',
            data: { labels: months.map(m => m.slice(0,3)), datasets: [
                { label: 'BB Booked', data: months.map(m => tele.byMonth[m]?.busbuddy_booked || 0), borderColor: '#1a73e8', backgroundColor: 'rgba(26,115,232,0.1)', fill: true, tension: 0.3, borderWidth: 2 },
                { label: 'BB Attended', data: months.map(m => tele.byMonth[m]?.busbuddy_attended || 0), borderColor: '#34a853', backgroundColor: 'transparent', tension: 0.3, borderWidth: 2 },
                { label: 'Taxi Booked', data: months.map(m => tele.byMonth[m]?.taxi_booked || 0), borderColor: '#9c27b0', backgroundColor: 'transparent', tension: 0.3, borderWidth: 2 },
                { label: 'Taxi Closed', data: months.map(m => tele.byMonth[m]?.taxi_closed || 0), borderColor: '#ea4335', backgroundColor: 'transparent', tension: 0.3, borderWidth: 2 }
            ]},
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
        });
    }

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

function resetTeleFilters() {
    const mf = document.getElementById('monthFilter');
    const wf = document.getElementById('weekFilter');
    if (mf) mf.value = 'All';
    if (wf) { while (wf.options.length > 1) wf.remove(1); wf.value = 'All'; initTeleFilters(); }
    updateTeleDashboard();
}

// ============================================================
// SECTION 2: HR Weekly Meetings (HR2)
// ============================================================

function initHR2Filters() {
    const wf = document.getElementById('hr2WeekFilter');
    if (!wf) return;
    while (wf.options.length > 1) wf.remove(1);
    const hr2 = dataParser.processedData.hr2 || {};
    const weeks = Object.keys(hr2.byWeek || {}).sort((a,b) => {
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

function onHR2MonthChange() {
    const month = document.getElementById('hr2MonthFilter')?.value || 'All';
    const wf = document.getElementById('hr2WeekFilter');
    if (!wf) return;
    while (wf.options.length > 1) wf.remove(1);
    const hr2 = dataParser.processedData.hr2 || {};
    const weeks = Object.keys(hr2.byWeek || {}).sort((a,b) => parseInt(String(a).match(/\d+/)?.[0]||0) - parseInt(String(b).match(/\d+/)?.[0]||0));
    weeks.forEach(w => {
        const wd = hr2.byWeek[w];
        if (month === 'All' || wd.month === month) {
            const o = document.createElement('option');
            o.value = w; o.textContent = w + (month === 'All' ? ` (${wd.month})` : '');
            wf.appendChild(o);
        }
    });
    wf.value = 'All';
    updateHR2Dashboard();
}

function updateHR2Dashboard() {
    const month = document.getElementById('hr2MonthFilter')?.value || 'All';
    const week = document.getElementById('hr2WeekFilter')?.value || 'All';
    const hr2 = dataParser.processedData.hr2 || { byWeek: {}, byMonth: {}, totals: {} };
    let agg = { hr_meetings_booked: 0, hrms_meetings_booked: 0, meetings_attended: 0, hr_free_trials: 0, hr_free_trials_target: 0, hr_closed: 0 };
    let filteredWeeks = [];

    if (week !== 'All') {
        const wd = hr2.byWeek[week];
        if (wd) { Object.keys(agg).forEach(k => agg[k] = wd[k] || 0); filteredWeeks = [week]; }
    } else if (month !== 'All') {
        const md = hr2.byMonth[month];
        if (md) { Object.keys(agg).forEach(k => agg[k] = md[k] || 0); filteredWeeks = md.weeks || []; }
    } else {
        Object.keys(agg).forEach(k => agg[k] = hr2.totals[k] || 0);
        filteredWeeks = Object.keys(hr2.byWeek || {}).sort((a,b) => parseInt(String(a).match(/\d+/)?.[0]||0) - parseInt(String(b).match(/\d+/)?.[0]||0));
    }

    updateHR2Stats(agg);
    updateHR2Charts(hr2, filteredWeeks);
    updateHR2Table(hr2, filteredWeeks);
}

function updateHR2Stats(agg) {
    const totalBooked = (agg.hr_meetings_booked || 0) + (agg.hrms_meetings_booked || 0);
    const attended = agg.meetings_attended || 0;
    const trials = agg.hr_free_trials || 0;
    const trialsTarget = agg.hr_free_trials_target || 0;
    const closed = agg.hr_closed || 0;
    const attendRate = totalBooked > 0 ? (attended / totalBooked * 100) : 0;
    const closeRate = attended > 0 ? (closed / attended * 100) : 0;
    const trialAchievement = trialsTarget > 0 ? (trials / trialsTarget * 100) : 0;

    setText('hr2HRBooked', agg.hr_meetings_booked || 0);
    setText('hr2HRMSBooked', agg.hrms_meetings_booked || 0);
    setText('hr2Attended', attended);
    setText('hr2AttendRate', attendRate.toFixed(1) + '%');
    setText('hr2Trials', trials);
    setText('hr2TrialsTarget', trialsTarget);
    setText('hr2Closed', closed);
    setText('hr2CloseRate', closeRate.toFixed(1) + '%');
    setText('hr2TrialAchievement', trialAchievement.toFixed(1) + '%');
    setStatPct('hr2HRBookedRate', attendRate);
    setStatPct('hr2HRMSRate', attendRate);
    setStatPct('hr2AttendChange', attendRate);
    setStatPct('hr2TrialsRate', trialAchievement);
    setStatPct('hr2ClosedChange', closeRate);
    setStatPct('hr2TrialAchChange', trialAchievement);

    // Funnel
    setText('hr2FunnelBooked', totalBooked);
    setText('hr2FunnelAttended', attended);
    setText('hr2FunnelTrials', trials);
    setText('hr2FunnelClosed', closed);
    const max = totalBooked || 1;
    animateFunnelHR2(0, 100);
    animateFunnelHR2(1, (attended / max) * 100);
    animateFunnelHR2(2, (trials / max) * 100);
    animateFunnelHR2(3, (closed / max) * 100);
}

function animateFunnelHR2(idx, pct) {
    const wrapper = document.getElementById('hr2FunnelWrapper');
    if (!wrapper) return;
    const items = wrapper.querySelectorAll('.funnel-item');
    if (items[idx]) {
        const bar = items[idx].querySelector('.funnel-bar');
        if (bar) bar.style.width = Math.max(pct, 10) + '%';
    }
}

function updateHR2Charts(hr2, filteredWeeks) {
    const ctx1 = document.getElementById('hr2WeeklyChart');
    if (ctx1) {
        destroyHR2Chart('hr2WeeklyChart');
        hr2Charts.hr2WeeklyChart = new Chart(ctx1, {
            type: 'bar',
            data: { labels: filteredWeeks, datasets: [
                { label: 'HR Booked', data: filteredWeeks.map(w => hr2.byWeek[w]?.hr_meetings_booked || 0), backgroundColor: 'rgba(26,115,232,0.75)' },
                { label: 'HRMS Booked', data: filteredWeeks.map(w => hr2.byWeek[w]?.hrms_meetings_booked || 0), backgroundColor: 'rgba(156,39,176,0.75)' },
                { label: 'Attended', data: filteredWeeks.map(w => hr2.byWeek[w]?.meetings_attended || 0), backgroundColor: 'rgba(52,168,83,0.75)' },
                { label: 'Closed', data: filteredWeeks.map(w => hr2.byWeek[w]?.hr_closed || 0), backgroundColor: 'rgba(234,67,53,0.75)' }
            ]},
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
        });
    }

    const ctx2 = document.getElementById('hr2MonthlyChart');
    if (ctx2) {
        destroyHR2Chart('hr2MonthlyChart');
        const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        hr2Charts.hr2MonthlyChart = new Chart(ctx2, {
            type: 'line',
            data: { labels: months.map(m => m.slice(0,3)), datasets: [
                { label: 'HR Booked', data: months.map(m => hr2.byMonth[m]?.hr_meetings_booked || 0), borderColor: '#1a73e8', backgroundColor: 'rgba(26,115,232,0.1)', fill: true, tension: 0.3, borderWidth: 2 },
                { label: 'HRMS Booked', data: months.map(m => hr2.byMonth[m]?.hrms_meetings_booked || 0), borderColor: '#9c27b0', backgroundColor: 'transparent', tension: 0.3, borderWidth: 2 },
                { label: 'Attended', data: months.map(m => hr2.byMonth[m]?.meetings_attended || 0), borderColor: '#34a853', backgroundColor: 'transparent', tension: 0.3, borderWidth: 2 },
                { label: 'Closed', data: months.map(m => hr2.byMonth[m]?.hr_closed || 0), borderColor: '#ea4335', backgroundColor: 'transparent', tension: 0.3, borderWidth: 2 }
            ]},
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
        });
    }

    const ctx4 = document.getElementById('hr2DistributionChart');
    if (ctx4) {
        destroyHR2Chart('hr2DistributionChart');
        const agg = { hr: 0, hrms: 0, attended: 0, trials: 0, closed: 0 };
        filteredWeeks.forEach(w => {
            agg.hr += hr2.byWeek[w]?.hr_meetings_booked || 0;
            agg.hrms += hr2.byWeek[w]?.hrms_meetings_booked || 0;
            agg.attended += hr2.byWeek[w]?.meetings_attended || 0;
            agg.trials += hr2.byWeek[w]?.hr_free_trials || 0;
            agg.closed += hr2.byWeek[w]?.hr_closed || 0;
        });
        hr2Charts.hr2DistributionChart = new Chart(ctx4, {
            type: 'doughnut',
            data: {
                labels: ['HR Booked', 'HRMS Booked', 'Attended', 'Free Trials', 'Closed'],
                datasets: [{ data: [agg.hr, agg.hrms, agg.attended, agg.trials, agg.closed], backgroundColor: ['rgba(26,115,232,0.8)','rgba(156,39,176,0.8)','rgba(52,168,83,0.8)','rgba(251,188,4,0.8)','rgba(234,67,53,0.8)'], borderWidth: 2 }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
        });
    }
}

function updateHR2Table(hr2, filteredWeeks) {
    const tbody = document.getElementById('hr2TableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    filteredWeeks.forEach(w => {
        const d = hr2.byWeek[w];
        if (!d) return;
        const totalBooked = (d.hr_meetings_booked || 0) + (d.hrms_meetings_booked || 0);
        const attendRate = totalBooked > 0 ? (d.meetings_attended / totalBooked * 100).toFixed(1) : '0.0';
        const closeRate = d.meetings_attended > 0 ? (d.hr_closed / d.meetings_attended * 100).toFixed(1) : '0.0';
        const row = tbody.insertRow();
        [w, d.month, d.hr_meetings_booked, d.hrms_meetings_booked, totalBooked, d.meetings_attended,
            `<span class="${parseFloat(attendRate)>=50?'positive':'negative'}">${attendRate}%</span>`,
            d.hr_free_trials, d.hr_free_trials_target, d.hr_closed,
            `<span class="${parseFloat(closeRate)>=50?'positive':'negative'}">${closeRate}%</span>`
        ].forEach(v => { const c = row.insertCell(); c.innerHTML = v; });
    });
    if (tbody.children.length === 0) {
        const row = tbody.insertRow(); const cell = row.insertCell();
        cell.colSpan = 11; cell.style.textAlign = 'center'; cell.style.padding = '30px';
        cell.innerHTML = '<h4>No HR2 data for selected filter</h4><p>Upload an Excel file with an "hr2" sheet</p>';
    }
}

function destroyHR2Chart(id) {
    if (hr2Charts[id]) { hr2Charts[id].destroy(); hr2Charts[id] = null; }
}

function resetHR2Filters() {
    const mf = document.getElementById('hr2MonthFilter');
    const wf = document.getElementById('hr2WeekFilter');
    if (mf) mf.value = 'All';
    if (wf) { while (wf.options.length > 1) wf.remove(1); initHR2Filters(); wf.value = 'All'; }
    updateHR2Dashboard();
}

// ============================================================
// Shared Utilities
// ============================================================
function setText(id, v) { const e = document.getElementById(id); if (e) e.textContent = v; }
function setStatPct(id, v) {
    const e = document.getElementById(id);
    if (!e) return;
    const pos = v >= 50;
    e.className = 'stat-change ' + (pos ? 'positive' : 'negative');
    e.innerHTML = `<i class="fas fa-arrow-${pos?'up':'down'}"></i> ${v.toFixed(1)}%`;
}