// HR Dashboard JavaScript - v6.1
// Removed: corporate closures KPI, HR2 section (moved to tele-dashboard)
let hrCharts = {};

document.addEventListener('DOMContentLoaded', function() {
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
    updateHRDashboard();

    document.getElementById('applyFilters')?.addEventListener('click', updateHRDashboard);
    document.getElementById('resetFilters')?.addEventListener('click', resetHRFilters);
    document.getElementById('businessFilter')?.addEventListener('change', updateHRDashboard);
    document.getElementById('monthFilter')?.addEventListener('change', updateHRDashboard);
});

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
    const newRevenue2025 = hrTotals.newRevenue2025 || 0;
    const newRevenue2026 = hrTotals.newRevenue || 0;
    const achievement = targetRevenue > 0 ? (totalRevenue / targetRevenue) * 100 : 0;
    const yoy = actual2025 > 0 ? ((totalRevenue - actual2025) / actual2025) * 100 : 0;
    // New revenue YoY comparison
    const newRevenueYoy = newRevenue2025 > 0 ? ((newRevenue2026 - newRevenue2025) / newRevenue2025) * 100 : 0;

    setText('actual2025Revenue', 'Ksh ' + dataParser.formatNumber(actual2025));
    setStatChange('yoyHRChange', yoy);
    setText('totalRevenue', 'Ksh ' + dataParser.formatNumber(totalRevenue));
    setText('revenueTarget', 'Ksh ' + dataParser.formatNumber(targetRevenue));
    setStatChange('revenueAchievement', achievement);
    setText('newRevenue2025', 'Ksh ' + dataParser.formatNumber(newRevenue2025));
    // Show new revenue 2026 vs 2025 change on 2025 KPI card
    const nr25elem = document.getElementById('newRevenue2025Change');
    if (nr25elem) {
        nr25elem.innerHTML = newRevenue2026 > 0
            ? `<i class="fas fa-arrow-right"></i> 2026: Ksh ${dataParser.formatNumber(newRevenue2026)}`
            : '<i class="fas fa-chart-line"></i> --';
    }
    setText('newRevenue', 'Ksh ' + dataParser.formatNumber(newRevenue2026));
    setStatChange('newRevenueChange', newRevenueYoy);
    setText('oldRevenue', 'Ksh ' + dataParser.formatNumber(hrTotals.oldRevenue || 0));
    // Old revenue doesn't have a direct YoY — show share of total
    const oldShare = totalRevenue > 0 ? ((hrTotals.oldRevenue || 0) / totalRevenue * 100) : 0;
    const oldElem = document.getElementById('oldRevenueChange');
    if (oldElem) {
        oldElem.className = 'stat-change';
        oldElem.innerHTML = `<i class="fas fa-percentage"></i> ${oldShare.toFixed(1)}% of total`;
    }
}

function updateHRCharts(dashboardData) {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const fullMonths = dataParser.processedData.summary.months;
    updateHRRevenueTrendChart(dashboardData, months, fullMonths);
    updateHRBusinessDistributionChart(dashboardData);
    updateNewRevenueCompareChart(dashboardData);
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
        actual2026.push((hr.actual2026 || 0) / 1e6);
        actual2025.push((hr.actual2025 || 0) / 1e6);
        target.push((hr.target2026 || 0) / 1e6);
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
            scales: { y: { beginAtZero: true, ticks: { callback: v => 'Ksh ' + v.toFixed(1) + 'M' } } },
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
            plugins: { legend: { position: 'right' }, tooltip: { callbacks: { label: ctx => { const total = ctx.dataset.data.reduce((a,b)=>a+b,0); const pct = total > 0 ? ((ctx.raw/total)*100).toFixed(1) : 0; return `${ctx.label}: Ksh ${dataParser.formatNumber(ctx.raw)} (${pct}%)`; } } } }
        }
    });
}

function updateNewRevenueCompareChart(dashboardData) {
    const ctx = document.getElementById('newRevenueCompareChart');
    if (!ctx) return;
    destroyHRChart('newRevenueCompareChart');
    const businesses = Object.keys(dashboardData.hr.byBusiness || {});
    const nr2025 = businesses.map(biz => (dashboardData.hr.byBusiness[biz].newRevenue2025 || 0) / 1e6);
    const nr2026 = businesses.map(biz => (dashboardData.hr.byBusiness[biz].newRevenue || 0) / 1e6);
    hrCharts.newRevenueCompareChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: businesses,
            datasets: [
                { label: '2025 New Revenue', data: nr2025, backgroundColor: 'rgba(26,115,232,0.75)', borderWidth: 1 },
                { label: '2026 New Revenue', data: nr2026, backgroundColor: 'rgba(52,168,83,0.75)', borderWidth: 1 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, ticks: { callback: v => 'Ksh ' + v.toFixed(1) + 'M' } } },
            plugins: { legend: { position: 'top' } }
        }
    });
}

function updateHRRevenueCompositionChart(dashboardData, months, fullMonths) {
    const ctx = document.getElementById('revenueCompositionChart');
    if (!ctx) return;
    destroyHRChart('revenueCompositionChart');
    const newRevData = [], oldRevData = [];
    fullMonths.forEach(month => {
        const hr = dashboardData.hr.byMonth[month] || { newRevenue: 0, oldRevenue: 0 };
        newRevData.push((hr.newRevenue || 0) / 1e6);
        oldRevData.push((hr.oldRevenue || 0) / 1e6);
    });
    hrCharts.revenueCompositionChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [
                { label: 'New Revenue', data: newRevData, backgroundColor: 'rgba(52,168,83,0.8)' },
                { label: 'Old Revenue', data: oldRevData, backgroundColor: 'rgba(26,115,232,0.8)' }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, ticks: { callback: v => 'Ksh ' + v.toFixed(1) + 'M' } } },
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
                'Ksh ' + dataParser.formatNumber(d.newRevenue2025 || 0),
                'Ksh ' + dataParser.formatNumber(d.actual2025 || 0),
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
function resetHRFilters() {
    document.getElementById('businessFilter').value = 'All';
    document.getElementById('monthFilter').value = 'All';
    updateHRDashboard();
}