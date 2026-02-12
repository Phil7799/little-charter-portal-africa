// Charter Dashboard JavaScript
let charterCharts = {};

document.addEventListener('DOMContentLoaded', function() {
    console.log('Charter Dashboard initializing...');
    
    // Portal switching
    const switchBtn = document.getElementById('switchPortal');
    if (switchBtn) {
        switchBtn.addEventListener('click', function() {
            window.location.href = 'https://phil7799.github.io/little-portal-africa/dashboard.html#overview';
        });
    }
    
    // Load data
    const hasData = dataParser.loadFromLocalStorage();
    console.log('Data loaded:', hasData);
    
    if (!hasData) {
        console.log('No data found');
        return;
    }
    
    // Update last update time
    const lastUpdate = localStorage.getItem('lastDataUpdate');
    if (lastUpdate) {
        const updateDate = new Date(lastUpdate);
        const elem = document.getElementById('lastUpdate');
        if (elem) {
            elem.textContent = updateDate.toLocaleDateString() + ' ' + updateDate.toLocaleTimeString();
        }
    }
    
    // Initialize filters
    initCharterFilters();
    
    // Initial dashboard update
    updateCharterDashboard();
    
    // Set up event listeners
    const applyBtn = document.getElementById('applyFilters');
    const resetBtn = document.getElementById('resetFilters');
    const associateFilter = document.getElementById('associateFilter');
    const monthFilter = document.getElementById('monthFilter');
    const yearFilter = document.getElementById('yearFilter');
    
    if (applyBtn) {
        applyBtn.addEventListener('click', () => {
            console.log('Apply filters clicked');
            updateCharterDashboard();
        });
    }
    
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            console.log('Reset filters clicked');
            resetCharterFilters();
        });
    }
    
    if (associateFilter) {
        associateFilter.addEventListener('change', () => updateCharterDashboard());
    }
    
    if (monthFilter) {
        monthFilter.addEventListener('change', () => updateCharterDashboard());
    }
    
    if (yearFilter) {
        yearFilter.addEventListener('change', () => updateCharterDashboard());
    }
});

function initCharterFilters() {
    const associateFilter = document.getElementById('associateFilter');
    
    if (associateFilter && dataParser.processedData.summary) {
        while (associateFilter.options.length > 1) {
            associateFilter.remove(1);
        }
        
        const associates = dataParser.processedData.summary.associates || [];
        console.log('Charter associates:', associates);
        
        associates.forEach(associate => {
            const option = document.createElement('option');
            option.value = associate;
            option.textContent = associate.split('@')[0];
            associateFilter.appendChild(option);
        });
    }
}

function updateCharterDashboard() {
    console.log('=== UPDATING CHARTER DASHBOARD ===');
    
    const associateFilter = document.getElementById('associateFilter');
    const monthFilter = document.getElementById('monthFilter');
    const yearFilter = document.getElementById('yearFilter');
    
    const associate = associateFilter ? associateFilter.value : 'All';
    const month = monthFilter ? monthFilter.value : 'All';
    const year = yearFilter ? yearFilter.value : '2026';
    
    console.log('Charter Filters:', { associate, month, year });
    
    const dashboardData = dataParser.getDashboardData({ associate, month, business: 'All' });
    
    updateCharterStats(dashboardData, year);
    updateCharterCharts(dashboardData, year);
    updateCharterTable(dashboardData, year);
}

function updateCharterStats(dashboardData, year) {
    const charterTotals = dashboardData.charter.totals || { total2025: 0, total2026: 0, target2026: 0 };
    
    let totalRevenue, targetRevenue, yoyGrowth;
    
    if (year === '2026') {
        totalRevenue = charterTotals.total2026;
        targetRevenue = charterTotals.target2026;
        yoyGrowth = charterTotals.total2025 > 0 ? ((charterTotals.total2026 - charterTotals.total2025) / charterTotals.total2025) * 100 : 0;
    } else {
        totalRevenue = charterTotals.total2025;
        targetRevenue = 0;
        yoyGrowth = 0;
    }
    
    const achievement = targetRevenue > 0 ? (totalRevenue / targetRevenue) * 100 : 0;
    
    // Calculate new vs existing business from processedData breakdown fields
    let newBusiness = 0, existingBusiness = 0, busbuddy = 0;
    const byMonth = dashboardData.charter.byMonth || {};
    Object.keys(byMonth).forEach(month => {
        Object.keys(byMonth[month].associates || {}).forEach(assoc => {
            const d = byMonth[month].associates[assoc];
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
    // Fallback to totals if breakdown fields not present
    if (newBusiness === 0 && existingBusiness === 0) {
        const totals = dashboardData.charter.totals || {};
        newBusiness = year === '2026' ? (totals.newBusiness2026 || 0) : (totals.newBusiness2025 || 0);
        existingBusiness = year === '2026' ? (totals.existingBusiness2026 || 0) : (totals.existingBusiness2025 || 0);
        busbuddy = year === '2026' ? (totals.busbuddy2026 || 0) : (totals.busbuddy2025 || 0);
    }
    
    setText('totalRevenue', 'Ksh ' + dataParser.formatNumber(totalRevenue));
    setText('revenueTarget', 'Ksh ' + dataParser.formatNumber(targetRevenue));
    setStatChange('revenueAchievement', achievement);
    
    setText('newBusiness', 'Ksh ' + dataParser.formatNumber(newBusiness));
    setText('newBusinessYear', year);
    
    setText('existingBusiness', 'Ksh ' + dataParser.formatNumber(existingBusiness));
    setText('existingBusinessYear', year);

    setText('busbuddyRevenue', 'Ksh ' + dataParser.formatNumber(busbuddy));
    setText('busbuddyYear', year);
    
    setText('yoyGrowth', yoyGrowth.toFixed(1) + '%');
    setStatChange('yoyChange', yoyGrowth);
}

function updateCharterCharts(dashboardData, year) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const fullMonths = dataParser.processedData.summary.months;
    
    updateCharterRevenueTrendChart(dashboardData, months, fullMonths);
    updateCharterRevenueBreakdownChart(dashboardData, year);
    updateCharterMonthlyTargetChart(dashboardData, months, fullMonths, year);
    updateCharterAssociatePerformanceChart(dashboardData, year);
}

function destroyCharterChart(chartId) {
    if (charterCharts[chartId]) {
        charterCharts[chartId].destroy();
        charterCharts[chartId] = null;
    }
}

function updateCharterRevenueTrendChart(dashboardData, months, fullMonths) {
    const ctx = document.getElementById('revenueTrendChart');
    if (!ctx) return;
    
    destroyCharterChart('revenueTrendChart');
    
    const rev2025 = [];
    const rev2026 = [];
    const target = [];
    
    fullMonths.forEach(month => {
        const charter = dashboardData.charter.byMonth[month] || { total2025: 0, total2026: 0, target2026: 0 };
        rev2025.push(charter.total2025 / 1000000);
        rev2026.push(charter.total2026 / 1000000);
        target.push(charter.target2026 / 1000000);
    });
    
    charterCharts.revenueTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [
                {
                    label: '2025 Revenue',
                    data: rev2025,
                    borderColor: 'rgba(26, 115, 232, 0.8)',
                    backgroundColor: 'rgba(26, 115, 232, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.3
                },
                {
                    label: '2026 Revenue',
                    data: rev2026,
                    borderColor: 'rgba(52, 168, 83, 0.8)',
                    backgroundColor: 'rgba(52, 168, 83, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.3
                },
                {
                    label: '2026 Target',
                    data: target,
                    borderColor: 'rgba(251, 188, 4, 0.8)',
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    fill: false,
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Revenue (Ksh Millions)' },
                    ticks: { callback: v => 'Ksh ' + v.toFixed(1) + 'M' }
                }
            },
            plugins: {
                legend: { position: 'top' },
                tooltip: {
                    callbacks: {
                        label: ctx => `${ctx.dataset.label}: Ksh ${ctx.parsed.y.toFixed(2)}M`
                    }
                }
            }
        }
    });
}

function updateCharterRevenueBreakdownChart(dashboardData, year) {
    const ctx = document.getElementById('revenueBreakdownChart');
    if (!ctx) return;
    
    destroyCharterChart('revenueBreakdownChart');
    
    // Calculate new vs existing from processedData (works after localStorage load)
    let newBusiness = 0, existingBusiness = 0, busbuddy = 0;
    
    const byAssociate = dashboardData.charter.byAssociate || {};
    const byMonth = dashboardData.charter.byMonth || {};
    
    // Use byMonth breakdown data stored during parsing
    const fullMonths = dataParser.processedData.summary?.months || [];
    fullMonths.forEach(month => {
        const monthData = byMonth[month];
        if (!monthData) return;
        Object.keys(monthData.associates || {}).forEach(assoc => {
            const assocMonth = monthData.associates[assoc];
            if (year === '2026') {
                newBusiness += assocMonth.newBusiness2026 || 0;
                existingBusiness += assocMonth.existingBusiness2026 || 0;
                busbuddy += assocMonth.busbuddy2026 || 0;
            } else {
                newBusiness += assocMonth.newBusiness2025 || 0;
                existingBusiness += assocMonth.existingBusiness2025 || 0;
                busbuddy += assocMonth.busbuddy2025 || 0;
            }
        });
    });
    
    // Fallback: use total2026 split proportionally if breakdown not available
    if (newBusiness === 0 && existingBusiness === 0) {
        const totals = dashboardData.charter.totals || {};
        const total = year === '2026' ? (totals.total2026 || 0) : (totals.total2025 || 0);
        // Show total as single segment if no breakdown stored
        newBusiness = total;
    }
    
    charterCharts.revenueBreakdownChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['New Business', 'Existing Business', 'Busbuddy'],
            datasets: [{
                data: [newBusiness, existingBusiness, busbuddy],
                backgroundColor: ['rgba(26, 115, 232, 0.8)', 'rgba(52, 168, 83, 0.8)', 'rgba(251, 188, 4, 0.8)'],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right' },
                tooltip: {
                    callbacks: {
                        label: ctx => {
                            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                            const pct = total > 0 ? ((ctx.raw / total) * 100).toFixed(1) : 0;
                            return `${ctx.label}: Ksh ${dataParser.formatNumber(ctx.raw)} (${pct}%)`;
                        }
                    }
                }
            }
        }
    });
}

function updateCharterMonthlyTargetChart(dashboardData, months, fullMonths, year) {
    const ctx = document.getElementById('monthlyTargetChart');
    if (!ctx) return;
    
    destroyCharterChart('monthlyTargetChart');
    
    const actual = [];
    const target = [];
    
    fullMonths.forEach(month => {
        const charter = dashboardData.charter.byMonth[month] || { total2026: 0, target2026: 0 };
        actual.push(charter.total2026 / 1000000);
        target.push(charter.target2026 / 1000000);
    });
    
    charterCharts.monthlyTargetChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [
                {
                    label: 'Actual Revenue',
                    data: actual,
                    backgroundColor: 'rgba(26, 115, 232, 0.7)',
                    borderColor: 'rgba(26, 115, 232, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Target',
                    data: target,
                    backgroundColor: 'rgba(251, 188, 4, 0.7)',
                    borderColor: 'rgba(251, 188, 4, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Revenue (Ksh Millions)' },
                    ticks: { callback: v => 'Ksh ' + v.toFixed(1) + 'M' }
                }
            },
            plugins: { legend: { position: 'top' } }
        }
    });
}

function updateCharterAssociatePerformanceChart(dashboardData, year) {
    const ctx = document.getElementById('associatePerformanceChart');
    if (!ctx || !dashboardData.charter.byAssociate) return;
    
    destroyCharterChart('associatePerformanceChart');
    
    const associates = Object.keys(dashboardData.charter.byAssociate);
    const performance = [];
    const targets = [];
    
    associates.forEach(assoc => {
        const data = dashboardData.charter.byAssociate[assoc];
        performance.push(data.total2026 / 1000000);
        targets.push(data.target2026 / 1000000);
    });
    
    charterCharts.associatePerformanceChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: associates.map(a => a.split('@')[0]),
            datasets: [
                {
                    label: 'Revenue',
                    data: performance,
                    backgroundColor: 'rgba(26, 115, 232, 0.7)',
                    borderWidth: 1
                },
                {
                    label: 'Target',
                    data: targets,
                    backgroundColor: 'rgba(251, 188, 4, 0.7)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            scales: {
                x: {
                    beginAtZero: true,
                    title: { display: true, text: 'Revenue (Ksh Millions)' },
                    ticks: { callback: v => 'Ksh ' + v.toFixed(1) + 'M' }
                }
            },
            plugins: { legend: { position: 'top' } }
        }
    });
}

function updateCharterTable(dashboardData, year) {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    const allMonths = dataParser.processedData.summary?.months || [];
    const associateFilter = document.getElementById('associateFilter');
    const monthFilter = document.getElementById('monthFilter');
    const selectedAssociate = associateFilter ? associateFilter.value : 'All';
    const selectedMonth = monthFilter ? monthFilter.value : 'All';
    
    // Build rows from processedData (always available after localStorage load)
    const byMonth = dashboardData.charter.byMonth || {};
    
    // Determine which months to iterate
    const monthsToShow = selectedMonth !== 'All' ? [selectedMonth] : allMonths;
    
    monthsToShow.forEach(month => {
        const monthData = byMonth[month];
        if (!monthData) return;
        
        const associatesToShow = selectedAssociate !== 'All'
            ? (monthData.associates[selectedAssociate] ? [selectedAssociate] : [])
            : Object.keys(monthData.associates || {});
        
        associatesToShow.forEach(assoc => {
            const d = monthData.associates[assoc];
            if (!d) return;
            
            const newBiz2025 = d.newBusiness2025 || 0;
            const existingBiz2025 = d.existingBusiness2025 || 0;
            const busbuddy2025 = d.busbuddy2025 || 0;
            const total2025 = d.total2025 || 0;
            const newBiz2026 = d.newBusiness2026 || 0;
            const existingBiz2026 = d.existingBusiness2026 || 0;
            const busbuddy2026 = d.busbuddy2026 || 0;
            const total2026 = d.total2026 || 0;
            const target2026 = d.target2026 || 0;
            const achievement = target2026 > 0 ? (total2026 / target2026) * 100 : 0;
            
            addTableRow(tbody, [
                month,
                assoc.split('@')[0],
                'Ksh ' + dataParser.formatNumber(newBiz2025),
                'Ksh ' + dataParser.formatNumber(existingBiz2025),
                'Ksh ' + dataParser.formatNumber(busbuddy2025),
                'Ksh ' + dataParser.formatNumber(total2025),
                'Ksh ' + dataParser.formatNumber(newBiz2026),
                'Ksh ' + dataParser.formatNumber(existingBiz2026),
                'Ksh ' + dataParser.formatNumber(busbuddy2026),
                'Ksh ' + dataParser.formatNumber(total2026),
                'Ksh ' + dataParser.formatNumber(target2026),
                `<span class="${achievement >= 100 ? 'positive' : 'negative'}" style="font-weight: bold;">${achievement.toFixed(1)}%</span>`
            ]);
        });
    });
    
    if (tbody.children.length === 0) {
        const row = tbody.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 12;
        cell.style.textAlign = 'center';
        cell.style.padding = '40px';
        cell.innerHTML = '<h4>No Data Available</h4>';
    }
}

function addTableRow(tbody, values) {
    const row = tbody.insertRow();
    values.forEach(val => {
        const cell = row.insertCell();
        cell.innerHTML = val;
    });
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

function resetCharterFilters() {
    const associateFilter = document.getElementById('associateFilter');
    const monthFilter = document.getElementById('monthFilter');
    const yearFilter = document.getElementById('yearFilter');
    
    if (associateFilter) associateFilter.value = 'All';
    if (monthFilter) monthFilter.value = 'All';
    if (yearFilter) yearFilter.value = '2026';
    
    updateCharterDashboard();
}