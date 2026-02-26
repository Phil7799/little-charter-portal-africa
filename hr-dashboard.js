// HR Dashboard JavaScript - v6.0
// New: hr2 weekly meetings, corporate closures/new/old revenue KPIs, 2025 vs 2026 vs target charts
let hrCharts = {};
let hr2Charts = {};

document.addEventListener('DOMContentLoaded', function() {
    console.log('HR Dashboard v6.0 initializing...');

    const switchBtn = document.getElementById('switchPortal');
    if (switchBtn) switchBtn.addEventListener('click', () => { window.location.href = 'https://phil7799.github.io/little-portal-africa/dashboard.html#overview'; });

    const hasData = dataParser.loadFromLocalStorage();
    if (!hasData) { console.log('No data found'); return; }

    const lastUpdate = localStorage.getItem('lastDataUpdate');
    if (lastUpdate) {
        const elem = document.getElementById('lastUpdate');
        if (elem) elem.textContent = new Date(lastUpdate).toLocaleString();
    }

    initHRFilters();
    initHR2Filters();
    updateHRDashboard();
    updateHR2Dashboard();

    document.getElementById('applyFilters')?.addEventListener('click', updateHRDashboard);
    document.getElementById('resetFilters')?.addEventListener('click', resetHRFilters);
    document.getElementById('businessFilter')?.addEventListener('change', updateHRDashboard);
    document.getElementById('monthFilter')?.addEventListener('change', updateHRDashboard);

    document.getElementById('applyHR2Filters')?.addEventListener('click', updateHR2Dashboard);
    document.getElementById('resetHR2Filters')?.addEventListener('click', resetHR2Filters);
    document.getElementById('hr2MonthFilter')?.addEventListener('change', onHR2MonthChange);
    document.getElementById('hr2WeekFilter')?.addEventListener('change', updateHR2Dashboard);
});

// ─── HR Revenue Section ───
function initHRFilters() {
    const businessFilter = document.getElementById('businessFilter');
    if (businessFilter && dataParser.processedData.summary) {
        while (businessFilter.options.length > 1) businessFilter.remove(1);
        (dataParser.processedData.summary.businesses || []).forEach(business => {
            const option = document.createElement('option');
            option.value = business; option.textContent = business;
            businessFilter.appendChild(option);
        });
    }
}

function updateHRDashboard() {
    const business = document.getElementById('businessFilter')?.value || 'All';
    const month = document.getElementById('monthFilter')?.value || 'All';
    const dashboardData = dataParser.getDashboardData({ associate: 'All', month, business });
    updateHRStats(dashboardData);
    updateHRCharts(dashboardData);
    updateHRTable(dashboardData);
}

function updateHRStats(dashboardData) {
    const hrTotals = dashboardData.hr.totals || {};
    const totalRevenue = hrTotals.actual2026 || 0;
    const targetRevenue = hrTotals.target2026 || 0;
    const actual2025 = hrTotals.actual2025 || 0;
    const achievement = targetRevenue > 0 ? (totalRevenue / targetRevenue) * 100 : 0;
    const yoy = actual2025 > 0 ? ((totalRevenue - actual2025) / actual2025) * 100 : 0;

    const telesalesData = dashboardData.hr.byBusiness?.['TELESALES - Payroll System'] || { target2026: 0, actual2026: 0 };
    const telesalesAchievement = telesalesData.target2026 > 0 ? (telesalesData.actual2026 / telesalesData.target2026) * 100 : 0;

    setText('totalRevenue', 'Ksh ' + dataParser.formatNumber(totalRevenue));
    setText('revenueTarget', 'Ksh ' + dataParser.formatNumber(targetRevenue));
    setStatChange('revenueAchievement', achievement);
    setText('actual2025Revenue', 'Ksh ' + dataParser.formatNumber(actual2025));
    setStatChange('yoyHRChange', yoy);
    setText('corporateClosures', 'Ksh ' + dataParser.formatNumber(hrTotals.corporateClosures || 0));
    setText('newRevenue', 'Ksh ' + dataParser.formatNumber(hrTotals.newRevenue || 0));
    setText('oldRevenue', 'Ksh ' + dataParser.formatNumber(hrTotals.oldRevenue || 0));
    setText('telesalesRevenue', 'Ksh ' + dataParser.formatNumber(telesalesData.actual2026));
    setText('telesalesTarget', 'Ksh ' + dataParser.formatNumber(telesalesData.target2026));
    setStatChange('telesalesAchievement', telesalesAchievement);
}

function updateHRCharts(dashboardData) {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const fullMonths = dataParser.processedData.summary.months;
    updateHRRevenueTrendChart(dashboardData, months, fullMonths);
    updateHRBusinessDistributionChart(dashboardData);
    updateHRAchievementChart(dashboardData);
    updateHRRevenueCompositionChart(dashboardData, months, fullMonths);
}

function destroyHRChart(chartId) {
    if (hrCharts[chartId]) { hrCharts[chartId].destroy(); hrCharts[chartId] = null; }
}

function updateHRRevenueTrendChart(dashboardData, months, fullMonths) {
    const ctx = document.getElementById('revenueTrendChart');
    if (!ctx) return;
    destroyHRChart('revenueTrendChart');
    const actual2026 = [], actual2025 = [], target = [];
    fullMonths.forEach(month => {
        const hr = dashboardData.hr.byMonth[month] || { actual2026: 0, actual2025: 0, target2026: 0 };
        actual2026.push((hr.actual2026 || 0) / 1000000);
        actual2025.push((hr.actual2025 || 0) / 1000000);
        target.push((hr.target2026 || 0) / 1000000);
    });
    hrCharts.revenueTrendChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [
                { label: '2026 Actual', data: actual2026, backgroundColor: 'rgba(52,168,83,0.75)', borderWidth: 1 },
                { label: '2025 Actual', data: actual2025, backgroundColor: 'rgba(26,115,232,0.6)', borderWidth: 1 },
                { label: '2026 Target', data: target, type: 'line', borderColor: '#fbbc04', backgroundColor: 'transparent', borderWidth: 2.5, borderDash: [5,5], fill: false, tension: 0.3, pointRadius: 4 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, title: { display: true, text: 'Revenue (Ksh Millions)' }, ticks: { callback: v => 'Ksh ' + v.toFixed(1) + 'M' } } },
            plugins: { legend: { position: 'top' } }
        }
    });
}

function updateHRBusinessDistributionChart(dashboardData) {
    const ctx = document.getElementById('businessDistributionChart');
    if (!ctx) return;
    destroyHRChart('businessDistributionChart');
    const businesses = Object.keys(dashboardData.hr.byBusiness || {});
    const revenues = businesses.map(biz => dashboardData.hr.byBusiness[biz].actual2026 || 0);
    hrCharts.businessDistributionChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: businesses,
            datasets: [{ data: revenues, backgroundColor: ['rgba(26,115,232,0.8)','rgba(52,168,83,0.8)','rgba(251,188,4,0.8)','rgba(234,67,53,0.8)','rgba(156,39,176,0.8)'], borderWidth: 2 }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right' },
                tooltip: { callbacks: { label: ctx => { const total = ctx.dataset.data.reduce((a,b)=>a+b,0); const pct = total > 0 ? ((ctx.raw/total)*100).toFixed(1) : 0; return `${ctx.label}: Ksh ${dataParser.formatNumber(ctx.raw)} (${pct}%)`; } } }
            }
        }
    });
}

function updateHRAchievementChart(dashboardData) {
    const ctx = document.getElementById('achievementChart');
    if (!ctx) return;
    destroyHRChart('achievementChart');
    const businesses = Object.keys(dashboardData.hr.byBusiness || {});
    const achievements = businesses.map(biz => {
        const data = dashboardData.hr.byBusiness[biz];
        return data.target2026 > 0 ? (data.actual2026 / data.target2026) * 100 : 0;
    });
    hrCharts.achievementChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: businesses,
            datasets: [{ label: 'Achievement %', data: achievements, backgroundColor: achievements.map(a => a >= 100 ? 'rgba(52,168,83,0.75)' : 'rgba(234,67,53,0.75)'), borderWidth: 1 }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, indexAxis: 'y',
            scales: { x: { beginAtZero: true, title: { display: true, text: 'Achievement %' }, ticks: { callback: v => v + '%' } } },
            plugins: { legend: { display: false } }
        }
    });
}

function updateHRRevenueCompositionChart(dashboardData, months, fullMonths) {
    const ctx = document.getElementById('revenueCompositionChart');
    if (!ctx) return;
    destroyHRChart('revenueCompositionChart');
    const newRevData = [], oldRevData = [], closuresData = [];
    fullMonths.forEach(month => {
        const hr = dashboardData.hr.byMonth[month] || { newRevenue: 0, oldRevenue: 0, corporateClosures: 0 };
        newRevData.push((hr.newRevenue || 0) / 1e6);
        oldRevData.push((hr.oldRevenue || 0) / 1e6);
        closuresData.push((hr.corporateClosures || 0) / 1e6);
    });
    hrCharts.revenueCompositionChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [
                { label: 'New Revenue', data: newRevData, backgroundColor: 'rgba(52,168,83,0.8)' },
                { label: 'Old Revenue', data: oldRevData, backgroundColor: 'rgba(26,115,232,0.8)' },
                { label: 'Corp. Closures', data: closuresData, backgroundColor: 'rgba(234,67,53,0.75)' }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, stacked: false, ticks: { callback: v => 'Ksh ' + v.toFixed(1) + 'M' } } },
            plugins: { legend: { position: 'top' } }
        }
    });
}

function updateHRTable(dashboardData) {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    const allMonths = dataParser.processedData.summary?.months || [];
    const selectedBusiness = document.getElementById('businessFilter')?.value || 'All';
    const selectedMonth = document.getElementById('monthFilter')?.value || 'All';
    const byMonth = dashboardData.hr.byMonth || {};
    const monthsToShow = selectedMonth !== 'All' ? [selectedMonth] : allMonths;

    monthsToShow.forEach(month => {
        const monthData = byMonth[month];
        if (!monthData) return;
        const businessesToShow = selectedBusiness !== 'All'
            ? (monthData.businesses[selectedBusiness] ? [selectedBusiness] : [])
            : Object.keys(monthData.businesses || {});
        businessesToShow.forEach(biz => {
            const d = monthData.businesses[biz];
            if (!d) return;
            const target = d.target2026 || 0;
            const actual = d.totalRevenue2026 || d.actual2026 || 0;
            const achievement = target > 0 ? (actual / target) * 100 : 0;
            const variance = actual - target;
            addTableRow(tbody, [
                month, biz,
                'Ksh ' + dataParser.formatNumber(d.actual2025 || 0),
                'Ksh ' + dataParser.formatNumber(d.corporateClosures || 0),
                'Ksh ' + dataParser.formatNumber(d.newRevenue || 0),
                'Ksh ' + dataParser.formatNumber(d.oldRevenue || 0),
                'Ksh ' + dataParser.formatNumber(actual),
                'Ksh ' + dataParser.formatNumber(target),
                `<span class="${achievement >= 100 ? 'positive' : 'negative'}" style="font-weight:bold">${achievement.toFixed(1)}%</span>`,
                `<span class="${variance >= 0 ? 'positive' : 'negative'}" style="font-weight:bold">${variance >= 0 ? '+' : '-'}Ksh ${dataParser.formatNumber(Math.abs(variance))}</span>`
            ]);
        });
    });

    if (tbody.children.length === 0) {
        const row = tbody.insertRow(); const cell = row.insertCell();
        cell.colSpan = 10; cell.style.textAlign = 'center'; cell.style.padding = '40px';
        cell.innerHTML = '<h4>No Data Available</h4>';
    }
}

function resetHRFilters() {
    document.getElementById('businessFilter').value = 'All';
    document.getElementById('monthFilter').value = 'All';
    updateHRDashboard();
}

// ─── HR2 Weekly Meetings Section ───
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
    animateFunnel2('hr2FunnelWrapper', 0, 100);
    animateFunnel2('hr2FunnelWrapper', 1, (attended / max) * 100);
    animateFunnel2('hr2FunnelWrapper', 2, (trials / max) * 100);
    animateFunnel2('hr2FunnelWrapper', 3, (closed / max) * 100);
}

function animateFunnel2(wrapperId, idx, pct) {
    const wrapper = document.getElementById(wrapperId);
    if (!wrapper) return;
    const items = wrapper.querySelectorAll('.funnel-item');
    if (items[idx]) {
        const bar = items[idx].querySelector('.funnel-bar');
        if (bar) bar.style.width = Math.max(pct, 10) + '%';
    }
}

function updateHR2Charts(hr2, filteredWeeks) {
    // Weekly Activity Chart
    const ctx1 = document.getElementById('hr2WeeklyChart');
    if (ctx1) {
        destroyHR2Chart('hr2WeeklyChart');
        const hrBooked = filteredWeeks.map(w => hr2.byWeek[w]?.hr_meetings_booked || 0);
        const hrmsBooked = filteredWeeks.map(w => hr2.byWeek[w]?.hrms_meetings_booked || 0);
        const attended = filteredWeeks.map(w => hr2.byWeek[w]?.meetings_attended || 0);
        const closed = filteredWeeks.map(w => hr2.byWeek[w]?.hr_closed || 0);
        hr2Charts.hr2WeeklyChart = new Chart(ctx1, {
            type: 'bar',
            data: {
                labels: filteredWeeks,
                datasets: [
                    { label: 'HR Booked', data: hrBooked, backgroundColor: 'rgba(26,115,232,0.75)' },
                    { label: 'HRMS Booked', data: hrmsBooked, backgroundColor: 'rgba(156,39,176,0.75)' },
                    { label: 'Attended', data: attended, backgroundColor: 'rgba(52,168,83,0.75)' },
                    { label: 'Closed', data: closed, backgroundColor: 'rgba(234,67,53,0.75)' }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
        });
    }

    // Monthly Trend
    const ctx2 = document.getElementById('hr2MonthlyChart');
    if (ctx2) {
        destroyHR2Chart('hr2MonthlyChart');
        const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        const mLabels = months.map(m => m.slice(0,3));
        const hrB = months.map(m => hr2.byMonth[m]?.hr_meetings_booked || 0);
        const hrmsB = months.map(m => hr2.byMonth[m]?.hrms_meetings_booked || 0);
        const att = months.map(m => hr2.byMonth[m]?.meetings_attended || 0);
        const clos = months.map(m => hr2.byMonth[m]?.hr_closed || 0);
        hr2Charts.hr2MonthlyChart = new Chart(ctx2, {
            type: 'line',
            data: {
                labels: mLabels,
                datasets: [
                    { label: 'HR Booked', data: hrB, borderColor: '#1a73e8', backgroundColor: 'rgba(26,115,232,0.1)', fill: true, tension: 0.3, borderWidth: 2 },
                    { label: 'HRMS Booked', data: hrmsB, borderColor: '#9c27b0', backgroundColor: 'transparent', tension: 0.3, borderWidth: 2 },
                    { label: 'Attended', data: att, borderColor: '#34a853', backgroundColor: 'transparent', tension: 0.3, borderWidth: 2 },
                    { label: 'Closed', data: clos, borderColor: '#ea4335', backgroundColor: 'transparent', tension: 0.3, borderWidth: 2 }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
        });
    }

    // Distribution
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
    document.getElementById('hr2MonthFilter').value = 'All';
    const wf = document.getElementById('hr2WeekFilter');
    if (wf) { while (wf.options.length > 1) wf.remove(1); initHR2Filters(); wf.value = 'All'; }
    updateHR2Dashboard();
}

// ─── Utilities ───
function addTableRow(tbody, values) {
    const row = tbody.insertRow();
    values.forEach(val => { const cell = row.insertCell(); cell.innerHTML = val; });
}
function setText(id, value) {
    const elem = document.getElementById(id);
    if (elem) elem.textContent = value;
}
function setStatChange(id, value) {
    const elem = document.getElementById(id);
    if (elem) {
        const positive = value >= 0;
        elem.className = 'stat-change ' + (positive ? 'positive' : 'negative');
        elem.innerHTML = `<i class="fas fa-arrow-${positive ? 'up' : 'down'}"></i> ${Math.abs(value).toFixed(1)}%`;
    }
}
function setStatPct(id, v) {
    const e = document.getElementById(id);
    if (!e) return;
    const pos = v >= 50;
    e.className = 'stat-change ' + (pos ? 'positive' : 'negative');
    e.innerHTML = `<i class="fas fa-arrow-${pos?'up':'down'}"></i> ${v.toFixed(1)}%`;
}