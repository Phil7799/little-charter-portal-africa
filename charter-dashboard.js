// Charter Dashboard JavaScript - v5.0
let charterCharts = {};

document.addEventListener('DOMContentLoaded', function() {
    const switchBtn = document.getElementById('switchPortal');
    if (switchBtn) switchBtn.addEventListener('click', () => { window.location.href = 'https://phil7799.github.io/little-portal-africa/dashboard.html#overview'; });

    const hasData = dataParser.loadFromLocalStorage();
    if (!hasData) return;

    const lastUpdate = localStorage.getItem('lastDataUpdate');
    if (lastUpdate) {
        const el = document.getElementById('lastUpdate');
        if (el) el.textContent = new Date(lastUpdate).toLocaleString();
    }

    initCharterFilters();
    updateCharterDashboard();

    ['applyFilters','resetFilters'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.addEventListener('click', id === 'resetFilters' ? resetCharterFilters : updateCharterDashboard);
    });
    ['associateFilter','monthFilter','yearFilter'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', updateCharterDashboard);
    });
});

function initCharterFilters() {
    const af = document.getElementById('associateFilter');
    if (!af || !dataParser.processedData.summary) return;
    while (af.options.length > 1) af.remove(1);
    (dataParser.processedData.summary.associates || []).forEach(a => {
        const o = document.createElement('option');
        o.value = a; o.textContent = a.split('@')[0];
        af.appendChild(o);
    });
}

function updateCharterDashboard() {
    const associate = val('associateFilter') || 'All';
    const month = val('monthFilter') || 'All';
    const year = val('yearFilter') || '2026';
    const dashboardData = dataParser.getDashboardData({ associate, month, business: 'All' });
    updateCharterStats(dashboardData, year);
    updateCharterCharts(dashboardData, year);
    updateCharterTable(dashboardData, year);
}

function updateCharterStats(dashboardData, year) {
    const ct = dashboardData.charter.totals || {};
    const totalRevenue = year === '2026' ? (ct.total2026 || 0) : (ct.total2025 || 0);
    const targetRevenue = year === '2026' ? (ct.target2026 || 0) : 0;
    const achievement = targetRevenue > 0 ? (totalRevenue / targetRevenue) * 100 : 0;
    const yoy = ct.total2025 > 0 ? ((ct.total2026 - ct.total2025) / ct.total2025) * 100 : 0;

    // Net revenue = 18% of total revenue
    const netRevenue = totalRevenue * 0.18;

    // Busbuddy: sum from byMonth breakdown
    let newBusiness = 0, existingBusiness = 0, busbuddy = 0;
    const byMonth = dashboardData.charter.byMonth || {};
    Object.keys(byMonth).forEach(m => {
        Object.keys(byMonth[m].associates || {}).forEach(assoc => {
            const d = byMonth[m].associates[assoc];
            if (year === '2026') {
                newBusiness += d.newBusiness2026 || 0;
                existingBusiness += d.existingBusiness2026 || 0;
                busbuddy += d.busbuddy2026 || 0;
            } else {
                newBusiness += d.newBusiness2025 || 0;
                existingBusiness += d.existingBusiness2025 || 0;
                busbuddy += d.busbuddy2025 || 0;
            }
        });
    });
    // Fallback to totals
    if (newBusiness === 0 && existingBusiness === 0 && busbuddy === 0) {
        newBusiness = year === '2026' ? (ct.newBusiness2026||0) : (ct.newBusiness2025||0);
        existingBusiness = year === '2026' ? (ct.existingBusiness2026||0) : (ct.existingBusiness2025||0);
        busbuddy = year === '2026' ? (ct.busbuddy2026||0) : (ct.busbuddy2025||0);
    }

    setText('totalRevenue', 'Ksh ' + dataParser.formatNumber(totalRevenue));
    setText('revenueTarget', 'Ksh ' + dataParser.formatNumber(targetRevenue));
    setStatChange('revenueAchievement', achievement);
    setText('netRevenue', 'Ksh ' + dataParser.formatNumber(netRevenue));
    setText('newBusiness', 'Ksh ' + dataParser.formatNumber(newBusiness));
    setText('newBusinessYear', year);
    setText('existingBusiness', 'Ksh ' + dataParser.formatNumber(existingBusiness));
    setText('existingBusinessYear', year);
    setText('busbuddyRevenue', 'Ksh ' + dataParser.formatNumber(busbuddy));
    setText('busbuddyYear', year);
    setText('yoyGrowth', yoy.toFixed(1) + '%');
    setStatChange('yoyChange', yoy);
}

function updateCharterCharts(dashboardData, year) {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const fullMonths = dataParser.processedData.summary.months;
    updateCharterRevenueTrendChart(dashboardData, months, fullMonths);
    updateCharterRevenueBreakdownChart(dashboardData, year);
    updateCharterMonthlyTargetChart(dashboardData, months, fullMonths, year);
    updateCharterAssociatePerformanceChart(dashboardData, year);
}

function destroyCharterChart(id) {
    if (charterCharts[id]) { charterCharts[id].destroy(); charterCharts[id] = null; }
}

function updateCharterRevenueTrendChart(dashboardData, months, fullMonths) {
    const ctx = document.getElementById('revenueTrendChart');
    if (!ctx) return;
    destroyCharterChart('revenueTrendChart');
    const rev2025 = [], rev2026 = [], target = [];
    fullMonths.forEach(m => {
        const d = dashboardData.charter.byMonth[m] || { total2025: 0, total2026: 0, target2026: 0 };
        rev2025.push(d.total2025 / 1e6); rev2026.push(d.total2026 / 1e6); target.push(d.target2026 / 1e6);
    });
    charterCharts.revenueTrendChart = new Chart(ctx, {
        type: 'line',
        data: { labels: months, datasets: [
            { label: '2025 Revenue', data: rev2025, borderColor: '#1a73e8', backgroundColor: 'rgba(26,115,232,0.1)', borderWidth: 2.5, fill: true, tension: 0.3 },
            { label: '2026 Revenue', data: rev2026, borderColor: '#34a853', backgroundColor: 'rgba(52,168,83,0.1)', borderWidth: 2.5, fill: true, tension: 0.3 },
            { label: '2026 Target', data: target, borderColor: '#fbbc04', backgroundColor: 'transparent', borderWidth: 2, borderDash: [5,5], fill: false, tension: 0.3 }
        ]},
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { callback: v => 'Ksh ' + v.toFixed(1) + 'M' } } }, plugins: { legend: { position: 'top' }, tooltip: { callbacks: { label: c => `${c.dataset.label}: Ksh ${c.parsed.y.toFixed(2)}M` } } } }
    });
}

function updateCharterRevenueBreakdownChart(dashboardData, year) {
    const ctx = document.getElementById('revenueBreakdownChart');
    if (!ctx) return;
    destroyCharterChart('revenueBreakdownChart');

    let newBiz = 0, existingBiz = 0, busbuddy = 0;
    const fullMonths = dataParser.processedData.summary?.months || [];
    const byMonth = dashboardData.charter.byMonth || {};
    fullMonths.forEach(m => {
        Object.keys((byMonth[m]?.associates) || {}).forEach(a => {
            const d = byMonth[m].associates[a];
            if (year === '2026') { newBiz += d.newBusiness2026||0; existingBiz += d.existingBusiness2026||0; busbuddy += d.busbuddy2026||0; }
            else { newBiz += d.newBusiness2025||0; existingBiz += d.existingBusiness2025||0; busbuddy += d.busbuddy2025||0; }
        });
    });
    // Fallback
    if (newBiz === 0 && existingBiz === 0 && busbuddy === 0) {
        const t = dashboardData.charter.totals || {};
        newBiz = year === '2026' ? (t.newBusiness2026||0) : (t.newBusiness2025||0);
        existingBiz = year === '2026' ? (t.existingBusiness2026||0) : (t.existingBusiness2025||0);
        busbuddy = year === '2026' ? (t.busbuddy2026||0) : (t.busbuddy2025||0);
    }

    charterCharts.revenueBreakdownChart = new Chart(ctx, {
        type: 'doughnut',
        data: { labels: ['New Business', 'Existing Business', 'Busbuddy'], datasets: [{ data: [newBiz, existingBiz, busbuddy], backgroundColor: ['rgba(26,115,232,0.85)','rgba(52,168,83,0.85)','rgba(251,188,4,0.85)'], borderWidth: 2 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' }, tooltip: { callbacks: { label: c => { const tot = c.dataset.data.reduce((a,b)=>a+b,0); const pct = tot > 0 ? ((c.raw/tot)*100).toFixed(1) : 0; return `${c.label}: Ksh ${dataParser.formatNumber(c.raw)} (${pct}%)`; } } } } }
    });
}

function updateCharterMonthlyTargetChart(dashboardData, months, fullMonths, year) {
    const ctx = document.getElementById('monthlyTargetChart');
    if (!ctx) return;
    destroyCharterChart('monthlyTargetChart');
    const actual = [], target = [];
    fullMonths.forEach(m => {
        const d = dashboardData.charter.byMonth[m] || { total2026: 0, target2026: 0 };
        actual.push(d.total2026 / 1e6); target.push(d.target2026 / 1e6);
    });
    charterCharts.monthlyTargetChart = new Chart(ctx, {
        type: 'bar',
        data: { labels: months, datasets: [
            { label: 'Actual', data: actual, backgroundColor: 'rgba(26,115,232,0.75)', borderWidth: 1 },
            { label: 'Target', data: target, backgroundColor: 'rgba(251,188,4,0.75)', borderWidth: 1 }
        ]},
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { callback: v => 'Ksh ' + v.toFixed(1) + 'M' } } }, plugins: { legend: { position: 'top' } } }
    });
}

function updateCharterAssociatePerformanceChart(dashboardData, year) {
    const ctx = document.getElementById('associatePerformanceChart');
    if (!ctx || !dashboardData.charter.byAssociate) return;
    destroyCharterChart('associatePerformanceChart');
    const associates = Object.keys(dashboardData.charter.byAssociate);
    const perf = associates.map(a => dashboardData.charter.byAssociate[a].total2026 / 1e6);
    const targets = associates.map(a => dashboardData.charter.byAssociate[a].target2026 / 1e6);
    charterCharts.associatePerformanceChart = new Chart(ctx, {
        type: 'bar',
        data: { labels: associates.map(a => a.split('@')[0]), datasets: [
            { label: 'Revenue', data: perf, backgroundColor: 'rgba(26,115,232,0.75)', borderWidth: 1 },
            { label: 'Target', data: targets, backgroundColor: 'rgba(251,188,4,0.75)', borderWidth: 1 }
        ]},
        options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', scales: { x: { beginAtZero: true, ticks: { callback: v => 'Ksh ' + v.toFixed(1) + 'M' } } }, plugins: { legend: { position: 'top' } } }
    });
}

function updateCharterTable(dashboardData, year) {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    const allMonths = dataParser.processedData.summary?.months || [];
    const selectedAssociate = val('associateFilter') || 'All';
    const selectedMonth = val('monthFilter') || 'All';
    const byMonth = dashboardData.charter.byMonth || {};
    const monthsToShow = selectedMonth !== 'All' ? [selectedMonth] : allMonths;

    monthsToShow.forEach(month => {
        const md = byMonth[month];
        if (!md) return;
        const associates = selectedAssociate !== 'All' ? (md.associates[selectedAssociate] ? [selectedAssociate] : []) : Object.keys(md.associates || {});
        associates.forEach(assoc => {
            const d = md.associates[assoc];
            if (!d) return;
            const achievement = d.target2026 > 0 ? (d.total2026 / d.target2026) * 100 : 0;
            const net = d.total2026 * 0.18;
            addTableRow(tbody, [
                month, assoc.split('@')[0],
                'Ksh ' + dataParser.formatNumber(d.newBusiness2025 || 0),
                'Ksh ' + dataParser.formatNumber(d.existingBusiness2025 || 0),
                'Ksh ' + dataParser.formatNumber(d.busbuddy2025 || 0),
                'Ksh ' + dataParser.formatNumber(d.total2025 || 0),
                'Ksh ' + dataParser.formatNumber(d.newBusiness2026 || 0),
                'Ksh ' + dataParser.formatNumber(d.existingBusiness2026 || 0),
                'Ksh ' + dataParser.formatNumber(d.busbuddy2026 || 0),
                'Ksh ' + dataParser.formatNumber(d.total2026 || 0),
                'Ksh ' + dataParser.formatNumber(d.target2026 || 0),
                'Ksh ' + dataParser.formatNumber(net),
                `<span class="${achievement >= 100 ? 'positive' : 'negative'}" style="font-weight:700">${achievement.toFixed(1)}%</span>`
            ]);
        });
    });

    if (tbody.children.length === 0) {
        const row = tbody.insertRow(); const cell = row.insertCell();
        cell.colSpan = 13; cell.style.textAlign = 'center'; cell.style.padding = '40px';
        cell.innerHTML = '<h4>No Data Available</h4>';
    }
}

function addTableRow(tbody, values) {
    const row = tbody.insertRow();
    values.forEach(v => { const c = row.insertCell(); c.innerHTML = v; });
}
function val(id) { const e = document.getElementById(id); return e ? e.value : null; }
function setText(id, v) { const e = document.getElementById(id); if (e) e.textContent = v; }
function setStatChange(id, v) {
    const e = document.getElementById(id);
    if (!e) return;
    const pos = v >= 0;
    e.className = 'stat-change ' + (pos ? 'positive' : 'negative');
    e.innerHTML = `<i class="fas fa-arrow-${pos ? 'up' : 'down'}"></i> ${Math.abs(v).toFixed(1)}%`;
}
function resetCharterFilters() {
    ['associateFilter','monthFilter','yearFilter'].forEach(id => { const e = document.getElementById(id); if (e) e.value = id === 'yearFilter' ? '2026' : 'All'; });
    updateCharterDashboard();
}