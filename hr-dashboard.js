// HR Dashboard JavaScript
let hrCharts = {};

document.addEventListener('DOMContentLoaded', function() {
    console.log('HR Dashboard initializing...');
    
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
    initHRFilters();
    
    // Initial dashboard update
    updateHRDashboard();
    
    // Set up event listeners
    const applyBtn = document.getElementById('applyFilters');
    const resetBtn = document.getElementById('resetFilters');
    const businessFilter = document.getElementById('businessFilter');
    const monthFilter = document.getElementById('monthFilter');
    
    if (applyBtn) {
        applyBtn.addEventListener('click', () => {
            console.log('Apply filters clicked');
            updateHRDashboard();
        });
    }
    
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            console.log('Reset filters clicked');
            resetHRFilters();
        });
    }
    
    if (businessFilter) {
        businessFilter.addEventListener('change', () => updateHRDashboard());
    }
    
    if (monthFilter) {
        monthFilter.addEventListener('change', () => updateHRDashboard());
    }
});

function initHRFilters() {
    const businessFilter = document.getElementById('businessFilter');
    
    if (businessFilter && dataParser.processedData.summary) {
        while (businessFilter.options.length > 1) {
            businessFilter.remove(1);
        }
        
        const businesses = dataParser.processedData.summary.businesses || [];
        console.log('HR businesses:', businesses);
        
        businesses.forEach(business => {
            const option = document.createElement('option');
            option.value = business;
            option.textContent = business;
            businessFilter.appendChild(option);
        });
    }
}

function updateHRDashboard() {
    console.log('=== UPDATING HR DASHBOARD ===');
    
    const businessFilter = document.getElementById('businessFilter');
    const monthFilter = document.getElementById('monthFilter');
    
    const business = businessFilter ? businessFilter.value : 'All';
    const month = monthFilter ? monthFilter.value : 'All';
    
    console.log('HR Filters:', { business, month });
    
    const dashboardData = dataParser.getDashboardData({ associate: 'All', month, business });
    
    updateHRStats(dashboardData);
    updateHRCharts(dashboardData);
    updateHRTable(dashboardData);
}

function updateHRStats(dashboardData) {
    const hrTotals = dashboardData.hr.totals || { target2026: 0, actual2026: 0 };
    
    const totalRevenue = hrTotals.actual2026;
    const targetRevenue = hrTotals.target2026;
    const achievement = targetRevenue > 0 ? (totalRevenue / targetRevenue) * 100 : 0;
    
    // Get specific business stats
    const payrollData = dashboardData.hr.byBusiness['Payroll System'] || { target2026: 0, actual2026: 0 };
    const schoolData = dashboardData.hr.byBusiness['School Attendance System'] || { target2026: 0, actual2026: 0 };
    const telesalesData = dashboardData.hr.byBusiness['TELESALES - Payroll System'] || { target2026: 0, actual2026: 0 };
    
    const payrollAchievement = payrollData.target2026 > 0 ? (payrollData.actual2026 / payrollData.target2026) * 100 : 0;
    const schoolAchievement = schoolData.target2026 > 0 ? (schoolData.actual2026 / schoolData.target2026) * 100 : 0;
    const telesalesAchievement = telesalesData.target2026 > 0 ? (telesalesData.actual2026 / telesalesData.target2026) * 100 : 0;
    
    setText('totalRevenue', 'Ksh ' + dataParser.formatNumber(totalRevenue));
    setText('revenueTarget', 'Ksh ' + dataParser.formatNumber(targetRevenue));
    setStatChange('revenueAchievement', achievement);
    
    setText('payrollRevenue', 'Ksh ' + dataParser.formatNumber(payrollData.actual2026));
    setText('payrollTarget', 'Ksh ' + dataParser.formatNumber(payrollData.target2026));
    setStatChange('payrollAchievement', payrollAchievement);
    
    setText('schoolRevenue', 'Ksh ' + dataParser.formatNumber(schoolData.actual2026));
    setText('schoolTarget', 'Ksh ' + dataParser.formatNumber(schoolData.target2026));
    setStatChange('schoolAchievement', schoolAchievement);
    
    setText('telesalesRevenue', 'Ksh ' + dataParser.formatNumber(telesalesData.actual2026));
    setText('telesalesTarget', 'Ksh ' + dataParser.formatNumber(telesalesData.target2026));
    setStatChange('telesalesAchievement', telesalesAchievement);
}

function updateHRCharts(dashboardData) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const fullMonths = dataParser.processedData.summary.months;
    
    updateHRRevenueTrendChart(dashboardData, months, fullMonths);
    updateHRBusinessDistributionChart(dashboardData);
    updateHRAchievementChart(dashboardData);
    updateHRBusinessTrendChart(dashboardData, months, fullMonths);
}

function destroyHRChart(chartId) {
    if (hrCharts[chartId]) {
        hrCharts[chartId].destroy();
        hrCharts[chartId] = null;
    }
}

function updateHRRevenueTrendChart(dashboardData, months, fullMonths) {
    const ctx = document.getElementById('revenueTrendChart');
    if (!ctx) return;
    
    destroyHRChart('revenueTrendChart');
    
    const actual = [];
    const target = [];
    
    fullMonths.forEach(month => {
        const hr = dashboardData.hr.byMonth[month] || { actual2026: 0, target2026: 0 };
        actual.push(hr.actual2026 / 1000000);
        target.push(hr.target2026 / 1000000);
    });
    
    hrCharts.revenueTrendChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months,
            datasets: [
                {
                    label: 'Actual Revenue',
                    data: actual,
                    backgroundColor: 'rgba(52, 168, 83, 0.7)',
                    borderColor: 'rgba(52, 168, 83, 1)',
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

function updateHRBusinessDistributionChart(dashboardData) {
    const ctx = document.getElementById('businessDistributionChart');
    if (!ctx) return;
    
    destroyHRChart('businessDistributionChart');
    
    const businesses = Object.keys(dashboardData.hr.byBusiness);
    const revenues = businesses.map(biz => dashboardData.hr.byBusiness[biz].actual2026);
    
    hrCharts.businessDistributionChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: businesses,
            datasets: [{
                data: revenues,
                backgroundColor: [
                    'rgba(26, 115, 232, 0.8)',
                    'rgba(52, 168, 83, 0.8)',
                    'rgba(251, 188, 4, 0.8)',
                    'rgba(234, 67, 53, 0.8)'
                ],
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

function updateHRAchievementChart(dashboardData) {
    const ctx = document.getElementById('achievementChart');
    if (!ctx) return;
    
    destroyHRChart('achievementChart');
    
    const businesses = Object.keys(dashboardData.hr.byBusiness);
    const achievements = businesses.map(biz => {
        const data = dashboardData.hr.byBusiness[biz];
        return data.target2026 > 0 ? (data.actual2026 / data.target2026) * 100 : 0;
    });
    
    hrCharts.achievementChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: businesses,
            datasets: [{
                label: 'Achievement %',
                data: achievements,
                backgroundColor: achievements.map(a => a >= 100 ? 'rgba(52, 168, 83, 0.7)' : 'rgba(234, 67, 53, 0.7)'),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            scales: {
                x: {
                    beginAtZero: true,
                    title: { display: true, text: 'Achievement %' },
                    ticks: { callback: v => v + '%' }
                }
            },
            plugins: { legend: { display: false } }
        }
    });
}

function updateHRBusinessTrendChart(dashboardData, months, fullMonths) {
    const ctx = document.getElementById('businessTrendChart');
    if (!ctx) return;
    
    destroyHRChart('businessTrendChart');
    
    const businesses = Object.keys(dashboardData.hr.byBusiness);
    const colors = [
        'rgba(26, 115, 232, 0.8)',
        'rgba(52, 168, 83, 0.8)',
        'rgba(251, 188, 4, 0.8)',
        'rgba(234, 67, 53, 0.8)'
    ];
    
    const datasets = businesses.map((biz, idx) => {
        const monthlyData = fullMonths.map(month => {
            const monthData = dashboardData.hr.byMonth[month];
            if (monthData && monthData.businesses && monthData.businesses[biz]) {
                return monthData.businesses[biz].actual2026 / 1000000;
            }
            return 0;
        });
        
        return {
            label: biz,
            data: monthlyData,
            borderColor: colors[idx % colors.length],
            backgroundColor: 'transparent',
            borderWidth: 2,
            tension: 0.3
        };
    });
    
    hrCharts.businessTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months,
            datasets: datasets
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

function updateHRTable(dashboardData) {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    const allMonths = dataParser.processedData.summary?.months || [];
    const businessFilter = document.getElementById('businessFilter');
    const monthFilter = document.getElementById('monthFilter');
    const selectedBusiness = businessFilter ? businessFilter.value : 'All';
    const selectedMonth = monthFilter ? monthFilter.value : 'All';
    
    // Build rows from processedData (always available after localStorage load)
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
            const actual = d.actual2026 || 0;
            const achievement = target > 0 ? (actual / target) * 100 : 0;
            const variance = actual - target;
            
            addTableRow(tbody, [
                month,
                biz,
                'Ksh ' + dataParser.formatNumber(target),
                'Ksh ' + dataParser.formatNumber(actual),
                `<span class="${achievement >= 100 ? 'positive' : 'negative'}" style="font-weight: bold;">${achievement.toFixed(1)}%</span>`,
                `<span class="${variance >= 0 ? 'positive' : 'negative'}" style="font-weight: bold;">${variance >= 0 ? '+' : '-'}Ksh ${dataParser.formatNumber(Math.abs(variance))}</span>`
            ]);
        });
    });
    
    if (tbody.children.length === 0) {
        const row = tbody.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 6;
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

function resetHRFilters() {
    const businessFilter = document.getElementById('businessFilter');
    const monthFilter = document.getElementById('monthFilter');
    
    if (businessFilter) businessFilter.value = 'All';
    if (monthFilter) monthFilter.value = 'All';
    
    updateHRDashboard();
}