// Data Parser for Excel Files - Version 3.0
// Complete rewrite with new HR structure and proper filtering

class DataParser {
    constructor() {
        this.charterData = [];
        this.hrData = [];
        this.processedData = {
            charter: {
                byMonth: {},
                byAssociate: {},
                totals: {
                    total2025: 0,
                    total2026: 0,
                    target2026: 0
                }
            },
            hr: {
                byMonth: {},
                byBusiness: {},
                totals: {
                    target2026: 0,
                    actual2026: 0
                }
            },
            summary: {
                associates: [],
                businesses: [],
                months: ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December']
            }
        };
        this.associates = [];
        this.businesses = [];
    }

    // Parse Excel file
    parseExcelFile(file, callback) {
        console.log('Starting to parse Excel file:', file.name);
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                
                console.log('Available sheets:', workbook.SheetNames);
                
                // Find charter sheet
                const charterSheetName = workbook.SheetNames.find(name => 
                    name.toLowerCase().includes('charter') || name === 'Sheet1'
                ) || workbook.SheetNames[0];
                
                console.log('Using charter sheet:', charterSheetName);
                
                if (charterSheetName && workbook.Sheets[charterSheetName]) {
                    this.charterData = XLSX.utils.sheet_to_json(workbook.Sheets[charterSheetName]);
                    console.log('Charter data loaded:', this.charterData.length, 'rows');
                    if (this.charterData.length > 0) {
                        console.log('Charter sample:', this.charterData[0]);
                    }
                    this.processCharterData();
                }
                
                // Find HR sheet
                const hrSheetName = workbook.SheetNames.find(name => 
                    name.toLowerCase().includes('hr') || name === 'Sheet2'
                ) || workbook.SheetNames[1];
                
                console.log('Using HR sheet:', hrSheetName);
                
                if (hrSheetName && workbook.Sheets[hrSheetName]) {
                    this.hrData = XLSX.utils.sheet_to_json(workbook.Sheets[hrSheetName]);
                    console.log('HR data loaded:', this.hrData.length, 'rows');
                    if (this.hrData.length > 0) {
                        console.log('HR sample:', this.hrData[0]);
                    }
                    this.processHRData();
                }
                
                // Process summary
                this.processSummaryData();
                
                // Save to localStorage
                this.saveToLocalStorage();
                
                console.log('Final processed data:', this.processedData);
                
                if (callback) {
                    callback({
                        success: true,
                        charterRows: this.charterData.length,
                        hrRows: this.hrData.length,
                        processedData: this.processedData
                    });
                }
                
            } catch (error) {
                console.error('Error parsing Excel:', error);
                if (callback) {
                    callback({
                        success: false,
                        error: error.message
                    });
                }
            }
        };
        
        reader.onerror = (error) => {
            console.error('FileReader error:', error);
            if (callback) {
                callback({
                    success: false,
                    error: 'Failed to read file'
                });
            }
        };
        
        reader.readAsArrayBuffer(file);
    }

    // Clean numeric value
    cleanNumber(value) {
        if (value === undefined || value === null || value === '') return 0;
        if (typeof value === 'number') return value;
        
        // Remove commas and convert to number
        const cleaned = String(value).replace(/,/g, '');
        const num = parseFloat(cleaned);
        
        return isNaN(num) ? 0 : num;
    }

    // Process charter data
    processCharterData() {
        console.log('Processing charter data...');
        
        // Reset
        this.processedData.charter = {
            byMonth: {},
            byAssociate: {},
            totals: {
                total2025: 0,
                total2026: 0,
                target2026: 0
            }
        };
        
        this.associates = [];
        const monthsFound = new Set();
        
        this.charterData.forEach((row, index) => {
            const month = row.Month || row.month;
            const associate = row.Associate || row.associate;
            
            if (!month || !associate) {
                console.warn('Skipping row', index, '- missing month or associate:', row);
                return;
            }
            
            monthsFound.add(month);
            
            // Add to associates list
            if (!this.associates.includes(associate)) {
                this.associates.push(associate);
            }
            
            // Get ALL revenue values including breakdowns
            const newBiz2025 = this.cleanNumber(row['new business revenue_2025']);
            const existingBiz2025 = this.cleanNumber(row['existing business revenue_2025']);
            const busbuddy2025 = this.cleanNumber(row['busbuddy revenue_2025']);
            const total2025 = this.cleanNumber(row['Total Revenue_2025'] || row['Total Revenue 2025']) || (newBiz2025 + existingBiz2025 + busbuddy2025);
            
            const newBiz2026 = this.cleanNumber(row['new business revenue_2026']);
            const existingBiz2026 = this.cleanNumber(row['existing business revenue_2026']);
            const busbuddy2026 = this.cleanNumber(row['busbuddy revenue_2026']);
            const total2026 = this.cleanNumber(row['Total Revenue_2026'] || row['Total Revenue 2026']) || (newBiz2026 + existingBiz2026 + busbuddy2026);
            const target2026 = this.cleanNumber(row['Target 2026'] || row['target 2026']);
            
            console.log(`${month} - ${associate}: 2025=${total2025}, 2026=${total2026}, target=${target2026}`);
            
            // Initialize month if needed
            if (!this.processedData.charter.byMonth[month]) {
                this.processedData.charter.byMonth[month] = {
                    associates: {},
                    total2025: 0,
                    total2026: 0,
                    target2026: 0
                };
            }
            
            // Initialize associate if needed
            if (!this.processedData.charter.byAssociate[associate]) {
                this.processedData.charter.byAssociate[associate] = {
                    months: {},
                    total2025: 0,
                    total2026: 0,
                    target2026: 0
                };
            }
            
            // Store in month data — include full breakdown
            this.processedData.charter.byMonth[month].associates[associate] = {
                newBusiness2025: newBiz2025,
                existingBusiness2025: existingBiz2025,
                busbuddy2025: busbuddy2025,
                total2025,
                newBusiness2026: newBiz2026,
                existingBusiness2026: existingBiz2026,
                busbuddy2026: busbuddy2026,
                total2026,
                target2026
            };
            
            this.processedData.charter.byMonth[month].total2025 += total2025;
            this.processedData.charter.byMonth[month].total2026 += total2026;
            this.processedData.charter.byMonth[month].target2026 += target2026;
            
            // Store in associate data — include full breakdown
            this.processedData.charter.byAssociate[associate].months[month] = {
                newBusiness2025: newBiz2025,
                existingBusiness2025: existingBiz2025,
                busbuddy2025: busbuddy2025,
                total2025,
                newBusiness2026: newBiz2026,
                existingBusiness2026: existingBiz2026,
                busbuddy2026: busbuddy2026,
                total2026,
                target2026
            };
            
            this.processedData.charter.byAssociate[associate].total2025 += total2025;
            this.processedData.charter.byAssociate[associate].total2026 += total2026;
            this.processedData.charter.byAssociate[associate].target2026 += target2026;
            this.processedData.charter.byAssociate[associate].newBusiness2025 = (this.processedData.charter.byAssociate[associate].newBusiness2025 || 0) + newBiz2025;
            this.processedData.charter.byAssociate[associate].existingBusiness2025 = (this.processedData.charter.byAssociate[associate].existingBusiness2025 || 0) + existingBiz2025;
            this.processedData.charter.byAssociate[associate].newBusiness2026 = (this.processedData.charter.byAssociate[associate].newBusiness2026 || 0) + newBiz2026;
            this.processedData.charter.byAssociate[associate].existingBusiness2026 = (this.processedData.charter.byAssociate[associate].existingBusiness2026 || 0) + existingBiz2026;
            
            // Add to totals
            this.processedData.charter.totals.total2025 += total2025;
            this.processedData.charter.totals.total2026 += total2026;
            this.processedData.charter.totals.target2026 += target2026;
            this.processedData.charter.totals.newBusiness2025 = (this.processedData.charter.totals.newBusiness2025 || 0) + newBiz2025;
            this.processedData.charter.totals.existingBusiness2025 = (this.processedData.charter.totals.existingBusiness2025 || 0) + existingBiz2025;
            this.processedData.charter.totals.newBusiness2026 = (this.processedData.charter.totals.newBusiness2026 || 0) + newBiz2026;
            this.processedData.charter.totals.existingBusiness2026 = (this.processedData.charter.totals.existingBusiness2026 || 0) + existingBiz2026;
            this.processedData.charter.totals.busbuddy2025 = (this.processedData.charter.totals.busbuddy2025 || 0) + busbuddy2025;
            this.processedData.charter.totals.busbuddy2026 = (this.processedData.charter.totals.busbuddy2026 || 0) + busbuddy2026;
        });
        
        console.log('Charter processing complete:');
        console.log('- Associates found:', this.associates);
        console.log('- Months found:', Array.from(monthsFound));
        console.log('- Totals:', this.processedData.charter.totals);
    }

    // Process HR data - NEW STRUCTURE
    processHRData() {
        console.log('Processing HR data with new structure...');
        
        // Reset
        this.processedData.hr = {
            byMonth: {},
            byBusiness: {},
            totals: {
                target2026: 0,
                actual2026: 0
            }
        };
        
        this.businesses = [];
        
        this.hrData.forEach((row, index) => {
            const month = row.Month || row.month;
            const business = row.Business || row.business;
            const target2026 = this.cleanNumber(row['2026 Target'] || row['target 2026']);
            const actual2026 = this.cleanNumber(row['2026 Actual'] || row['actual 2026']);
            
            if (!month || !business) {
                console.warn('Skipping HR row', index, '- missing month or business:', row);
                return;
            }
            
            // Add to businesses list
            if (!this.businesses.includes(business)) {
                this.businesses.push(business);
            }
            
            console.log(`HR ${month} - ${business}: target=${target2026}, actual=${actual2026}`);
            
            // Initialize month if needed
            if (!this.processedData.hr.byMonth[month]) {
                this.processedData.hr.byMonth[month] = {
                    businesses: {},
                    target2026: 0,
                    actual2026: 0
                };
            }
            
            // Initialize business if needed
            if (!this.processedData.hr.byBusiness[business]) {
                this.processedData.hr.byBusiness[business] = {
                    months: {},
                    target2026: 0,
                    actual2026: 0
                };
            }
            
            // Store in month data
            this.processedData.hr.byMonth[month].businesses[business] = {
                target2026,
                actual2026
            };
            
            this.processedData.hr.byMonth[month].target2026 += target2026;
            this.processedData.hr.byMonth[month].actual2026 += actual2026;
            
            // Store in business data
            this.processedData.hr.byBusiness[business].months[month] = {
                target2026,
                actual2026
            };
            
            this.processedData.hr.byBusiness[business].target2026 += target2026;
            this.processedData.hr.byBusiness[business].actual2026 += actual2026;
            
            // Add to totals
            this.processedData.hr.totals.target2026 += target2026;
            this.processedData.hr.totals.actual2026 += actual2026;
        });
        
        console.log('HR processing complete:');
        console.log('- Businesses found:', this.businesses);
        console.log('- Totals:', this.processedData.hr.totals);
    }

    // Process summary data
    processSummaryData() {
        const charterTotals = this.processedData.charter.totals;
        const hrTotals = this.processedData.hr.totals;
        
        const overallTotal2025 = charterTotals.total2025;
        const overallTotal2026 = charterTotals.total2026 + hrTotals.actual2026;
        const overallTarget2026 = charterTotals.target2026 + hrTotals.target2026;
        
        const charterAchievement = charterTotals.target2026 > 0 
            ? (charterTotals.total2026 / charterTotals.target2026) * 100 
            : 0;
        
        const hrAchievement = hrTotals.target2026 > 0 
            ? (hrTotals.actual2026 / hrTotals.target2026) * 100 
            : 0;
        
        const overallAchievement = overallTarget2026 > 0 
            ? (overallTotal2026 / overallTarget2026) * 100 
            : 0;
        
        const charterYoy = charterTotals.total2025 > 0 
            ? ((charterTotals.total2026 - charterTotals.total2025) / charterTotals.total2025) * 100 
            : 0;
        
        const overallYoy = overallTotal2025 > 0 
            ? ((overallTotal2026 - overallTotal2025) / overallTotal2025) * 100 
            : 0;
        
        this.processedData.summary = {
            charter: {
                total2025: charterTotals.total2025,
                total2026: charterTotals.total2026,
                target2026: charterTotals.target2026,
                achievement: charterAchievement,
                yoy: charterYoy
            },
            hr: {
                actual2026: hrTotals.actual2026,
                target2026: hrTotals.target2026,
                achievement: hrAchievement
            },
            overall: {
                total2025: overallTotal2025,
                total2026: overallTotal2026,
                target2026: overallTarget2026,
                achievement: overallAchievement,
                yoy: overallYoy
            },
            associates: this.associates,
            businesses: this.businesses,
            months: ['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December']
        };
        
        console.log('Summary complete:', this.processedData.summary);
    }

    // Format number
    formatNumber(num) {
        if (num === undefined || num === null) return '0.00';
        return num.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    // Save to localStorage
    saveToLocalStorage() {
        try {
            localStorage.setItem('charterHRData', JSON.stringify(this.processedData));
            localStorage.setItem('lastDataUpdate', new Date().toISOString());
            console.log('Data saved to localStorage');
        } catch (error) {
            console.error('Error saving to localStorage:', error);
        }
    }

    // Load from localStorage
    loadFromLocalStorage() {
        try {
            const savedData = localStorage.getItem('charterHRData');
            if (savedData) {
                this.processedData = JSON.parse(savedData);
                this.associates = this.processedData.summary?.associates || [];
                this.businesses = this.processedData.summary?.businesses || [];
                console.log('Data loaded from localStorage');
                console.log('Loaded data:', this.processedData);
                return true;
            }
        } catch (error) {
            console.error('Error loading from localStorage:', error);
        }
        return false;
    }

    // Get dashboard data with filters - COMPLETELY REWRITTEN
    getDashboardData(filters = {}) {
        const { associate = 'All', month = 'All', business = 'All' } = filters;
        
        console.log(`Getting dashboard data with filters:`, filters);
        
        let charterData = { byMonth: {}, byAssociate: {}, totals: { total2025: 0, total2026: 0, target2026: 0 } };
        let hrData = { byMonth: {}, byBusiness: {}, totals: { target2026: 0, actual2026: 0 } };
        
        // Filter charter data
        if (associate === 'All' && month === 'All') {
            // Return all charter data
            charterData = JSON.parse(JSON.stringify(this.processedData.charter));
        } else if (associate !== 'All' && month === 'All') {
            // Specific associate, all months
            const assocData = this.processedData.charter.byAssociate[associate];
            if (assocData) {
                charterData.byAssociate[associate] = JSON.parse(JSON.stringify(assocData));
                charterData.totals = {
                    total2025: assocData.total2025,
                    total2026: assocData.total2026,
                    target2026: assocData.target2026
                };
                
                // Build byMonth from associate's months
                Object.keys(assocData.months).forEach(m => {
                    charterData.byMonth[m] = {
                        associates: { [associate]: assocData.months[m] },
                        total2025: assocData.months[m].total2025,
                        total2026: assocData.months[m].total2026,
                        target2026: assocData.months[m].target2026
                    };
                });
            }
        } else if (associate === 'All' && month !== 'All') {
            // All associates, specific month
            const monthData = this.processedData.charter.byMonth[month];
            if (monthData) {
                charterData.byMonth[month] = JSON.parse(JSON.stringify(monthData));
                charterData.totals = {
                    total2025: monthData.total2025,
                    total2026: monthData.total2026,
                    target2026: monthData.target2026
                };
                
                // Build byAssociate from month's associates
                Object.keys(monthData.associates).forEach(assoc => {
                    charterData.byAssociate[assoc] = {
                        months: { [month]: monthData.associates[assoc] },
                        total2025: monthData.associates[assoc].total2025,
                        total2026: monthData.associates[assoc].total2026,
                        target2026: monthData.associates[assoc].target2026
                    };
                });
            }
        } else {
            // Specific associate and month
            const assocData = this.processedData.charter.byAssociate[associate];
            if (assocData && assocData.months[month]) {
                const monthData = assocData.months[month];
                charterData.byMonth[month] = {
                    associates: { [associate]: monthData },
                    total2025: monthData.total2025,
                    total2026: monthData.total2026,
                    target2026: monthData.target2026
                };
                charterData.byAssociate[associate] = {
                    months: { [month]: monthData },
                    total2025: monthData.total2025,
                    total2026: monthData.total2026,
                    target2026: monthData.target2026
                };
                charterData.totals = {
                    total2025: monthData.total2025,
                    total2026: monthData.total2026,
                    target2026: monthData.target2026
                };
            }
        }
        
        // Filter HR data
        if (business === 'All' && month === 'All') {
            // Return all HR data
            hrData = JSON.parse(JSON.stringify(this.processedData.hr));
        } else if (business !== 'All' && month === 'All') {
            // Specific business, all months
            const bizData = this.processedData.hr.byBusiness[business];
            if (bizData) {
                hrData.byBusiness[business] = JSON.parse(JSON.stringify(bizData));
                hrData.totals = {
                    target2026: bizData.target2026,
                    actual2026: bizData.actual2026
                };
                
                // Build byMonth from business's months
                Object.keys(bizData.months).forEach(m => {
                    if (!hrData.byMonth[m]) {
                        hrData.byMonth[m] = {
                            businesses: {},
                            target2026: 0,
                            actual2026: 0
                        };
                    }
                    hrData.byMonth[m].businesses[business] = bizData.months[m];
                    hrData.byMonth[m].target2026 += bizData.months[m].target2026;
                    hrData.byMonth[m].actual2026 += bizData.months[m].actual2026;
                });
            }
        } else if (business === 'All' && month !== 'All') {
            // All businesses, specific month
            const monthData = this.processedData.hr.byMonth[month];
            if (monthData) {
                hrData.byMonth[month] = JSON.parse(JSON.stringify(monthData));
                hrData.totals = {
                    target2026: monthData.target2026,
                    actual2026: monthData.actual2026
                };
                
                // Build byBusiness from month's businesses
                Object.keys(monthData.businesses).forEach(biz => {
                    hrData.byBusiness[biz] = {
                        months: { [month]: monthData.businesses[biz] },
                        target2026: monthData.businesses[biz].target2026,
                        actual2026: monthData.businesses[biz].actual2026
                    };
                });
            }
        } else {
            // Specific business and month
            const bizData = this.processedData.hr.byBusiness[business];
            if (bizData && bizData.months[month]) {
                const monthData = bizData.months[month];
                hrData.byMonth[month] = {
                    businesses: { [business]: monthData },
                    target2026: monthData.target2026,
                    actual2026: monthData.actual2026
                };
                hrData.byBusiness[business] = {
                    months: { [month]: monthData },
                    target2026: monthData.target2026,
                    actual2026: monthData.actual2026
                };
                hrData.totals = {
                    target2026: monthData.target2026,
                    actual2026: monthData.actual2026
                };
            }
        }
        
        const result = {
            charter: charterData,
            hr: hrData,
            summary: this.processedData.summary,
            filters: { associate, month, business }
        };
        
        console.log('Filtered dashboard data:', result);
        return result;
    }
}

// Initialize global data parser
const dataParser = new DataParser();