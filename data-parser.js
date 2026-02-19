// Data Parser for Excel Files - Version 5.0
// Tele sheet support, busbuddy fix, net revenue
class DataParser {
    constructor() {
        this.charterData = [];
        this.hrData = [];
        this.teleData = [];
        this.processedData = {
            charter: { byMonth: {}, byAssociate: {}, totals: { total2025: 0, total2026: 0, target2026: 0 } },
            hr: { byMonth: {}, byBusiness: {}, totals: { target2026: 0, actual2026: 0 } },
            tele: { byWeek: {}, byMonth: {}, totals: {} },
            summary: {
                associates: [],
                businesses: [],
                months: ['January','February','March','April','May','June','July','August','September','October','November','December']
            }
        };
        this.associates = [];
        this.businesses = [];
    }

    // Week → Month mapping (ISO weeks, approximate)
    weekToMonth(weekLabel) {
        // Parse week number from "Week N" format
        const match = String(weekLabel).match(/(\d+)/);
        if (!match) return 'January';
        const w = parseInt(match[1]);
        // Approximate mapping for a 52-week year starting Jan 1
        if (w <= 4)  return 'January';
        if (w <= 8)  return 'February';
        if (w <= 13) return 'March';
        if (w <= 17) return 'April';
        if (w <= 21) return 'May';
        if (w <= 26) return 'June';
        if (w <= 30) return 'July';
        if (w <= 35) return 'August';
        if (w <= 39) return 'September';
        if (w <= 43) return 'October';
        if (w <= 48) return 'November';
        return 'December';
    }

    parseExcelFile(file, callback) {
        console.log('Parsing Excel file:', file.name);
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                console.log('Sheets:', workbook.SheetNames);

                // Charter sheet
                const charterSheetName = workbook.SheetNames.find(n =>
                    n.toLowerCase().includes('charter') || n === 'Sheet1'
                ) || workbook.SheetNames[0];
                if (charterSheetName && workbook.Sheets[charterSheetName]) {
                    this.charterData = XLSX.utils.sheet_to_json(workbook.Sheets[charterSheetName]);
                    console.log('Charter rows:', this.charterData.length, 'Sample:', this.charterData[0]);
                    this.processCharterData();
                }

                // HR sheet
                const hrSheetName = workbook.SheetNames.find(n =>
                    n.toLowerCase() === 'hr' || n === 'Sheet2'
                ) || workbook.SheetNames[1];
                if (hrSheetName && workbook.Sheets[hrSheetName]) {
                    this.hrData = XLSX.utils.sheet_to_json(workbook.Sheets[hrSheetName]);
                    console.log('HR rows:', this.hrData.length);
                    this.processHRData();
                }

                // Tele sheet
                const teleSheetName = workbook.SheetNames.find(n =>
                    n.toLowerCase().includes('tele')
                );
                if (teleSheetName && workbook.Sheets[teleSheetName]) {
                    this.teleData = XLSX.utils.sheet_to_json(workbook.Sheets[teleSheetName]);
                    console.log('Tele rows:', this.teleData.length, 'Sample:', this.teleData[0]);
                    this.processTeleData();
                }

                this.processSummaryData();
                this.saveToLocalStorage();
                console.log('Final processedData:', this.processedData);

                if (callback) callback({ success: true, charterRows: this.charterData.length, hrRows: this.hrData.length, teleRows: this.teleData.length, processedData: this.processedData });
            } catch (err) {
                console.error('Parse error:', err);
                if (callback) callback({ success: false, error: err.message });
            }
        };
        reader.onerror = () => { if (callback) callback({ success: false, error: 'Failed to read file' }); };
        reader.readAsArrayBuffer(file);
    }

    cleanNumber(value) {
        if (value === undefined || value === null || value === '') return 0;
        if (typeof value === 'number') return value;
        const cleaned = String(value).replace(/,/g, '').trim();
        const num = parseFloat(cleaned);
        return isNaN(num) ? 0 : num;
    }

    processCharterData() {
        this.processedData.charter = {
            byMonth: {}, byAssociate: {},
            totals: { total2025: 0, total2026: 0, target2026: 0, newBusiness2025: 0, existingBusiness2025: 0, busbuddy2025: 0, newBusiness2026: 0, existingBusiness2026: 0, busbuddy2026: 0 }
        };
        this.associates = [];

        this.charterData.forEach((row, i) => {
            const month = row.Month || row.month;
            const associate = row.Associate || row.associate;
            if (!month || !associate) { console.warn('Skip charter row', i); return; }

            if (!this.associates.includes(associate)) this.associates.push(associate);

            // Flexible column name matching for busbuddy
            const findCol = (keys, row) => {
                for (const k of keys) {
                    const found = Object.keys(row).find(rk => rk.toLowerCase().replace(/\s+/g, '').replace(/_/g,'') === k.toLowerCase().replace(/\s+/g,'').replace(/_/g,''));
                    if (found !== undefined) return this.cleanNumber(row[found]);
                }
                return 0;
            };

            const newBiz2025 = findCol(['new business revenue_2025','newbusinessrevenue2025','newbiz2025'], row);
            const existingBiz2025 = findCol(['existing business revenue_2025','existingbusinessrevenue2025'], row);
            const busbuddy2025 = findCol(['busbuddy revenue_2025','busbuddyrevenue2025','busbuddy2025'], row);
            const total2025 = findCol(['Total Revenue_2025','Total Revenue 2025','totalrevenue2025'], row) || (newBiz2025 + existingBiz2025 + busbuddy2025);

            const newBiz2026 = findCol(['new business revenue_2026','newbusinessrevenue2026','newbiz2026'], row);
            const existingBiz2026 = findCol(['existing business revenue_2026','existingbusinessrevenue2026'], row);
            const busbuddy2026 = findCol(['busbuddy revenue_2026','busbuddyrevenue2026','busbuddy2026'], row);
            const total2026 = findCol(['Total Revenue_2026','Total Revenue 2026','totalrevenue2026'], row) || (newBiz2026 + existingBiz2026 + busbuddy2026);
            const target2026 = findCol(['Target 2026','target2026'], row);

            // Init month
            if (!this.processedData.charter.byMonth[month]) {
                this.processedData.charter.byMonth[month] = { associates: {}, total2025: 0, total2026: 0, target2026: 0 };
            }
            // Init associate
            if (!this.processedData.charter.byAssociate[associate]) {
                this.processedData.charter.byAssociate[associate] = { months: {}, total2025: 0, total2026: 0, target2026: 0, newBusiness2025: 0, existingBusiness2025: 0, busbuddy2025: 0, newBusiness2026: 0, existingBusiness2026: 0, busbuddy2026: 0 };
            }

            const rowData = { newBusiness2025: newBiz2025, existingBusiness2025: existingBiz2025, busbuddy2025, total2025, newBusiness2026: newBiz2026, existingBusiness2026: existingBiz2026, busbuddy2026, total2026, target2026 };

            this.processedData.charter.byMonth[month].associates[associate] = rowData;
            this.processedData.charter.byMonth[month].total2025 += total2025;
            this.processedData.charter.byMonth[month].total2026 += total2026;
            this.processedData.charter.byMonth[month].target2026 += target2026;

            this.processedData.charter.byAssociate[associate].months[month] = rowData;
            this.processedData.charter.byAssociate[associate].total2025 += total2025;
            this.processedData.charter.byAssociate[associate].total2026 += total2026;
            this.processedData.charter.byAssociate[associate].target2026 += target2026;
            this.processedData.charter.byAssociate[associate].newBusiness2025 += newBiz2025;
            this.processedData.charter.byAssociate[associate].existingBusiness2025 += existingBiz2025;
            this.processedData.charter.byAssociate[associate].busbuddy2025 += busbuddy2025;
            this.processedData.charter.byAssociate[associate].newBusiness2026 += newBiz2026;
            this.processedData.charter.byAssociate[associate].existingBusiness2026 += existingBiz2026;
            this.processedData.charter.byAssociate[associate].busbuddy2026 += busbuddy2026;

            const t = this.processedData.charter.totals;
            t.total2025 += total2025; t.total2026 += total2026; t.target2026 += target2026;
            t.newBusiness2025 += newBiz2025; t.existingBusiness2025 += existingBiz2025; t.busbuddy2025 += busbuddy2025;
            t.newBusiness2026 += newBiz2026; t.existingBusiness2026 += existingBiz2026; t.busbuddy2026 += busbuddy2026;
        });
        console.log('Charter totals:', this.processedData.charter.totals);
    }

    processHRData() {
        this.processedData.hr = { byMonth: {}, byBusiness: {}, totals: { target2026: 0, actual2026: 0 } };
        this.businesses = [];

        this.hrData.forEach((row, i) => {
            const month = row.Month || row.month;
            const business = row.Business || row.business;
            const target2026 = this.cleanNumber(row['2026 Target'] || row['target 2026'] || row['Target 2026']);
            const actual2026 = this.cleanNumber(row['2026 Actual'] || row['actual 2026'] || row['Actual 2026']);
            if (!month || !business) { console.warn('Skip HR row', i); return; }

            if (!this.businesses.includes(business)) this.businesses.push(business);

            if (!this.processedData.hr.byMonth[month]) this.processedData.hr.byMonth[month] = { businesses: {}, target2026: 0, actual2026: 0 };
            if (!this.processedData.hr.byBusiness[business]) this.processedData.hr.byBusiness[business] = { months: {}, target2026: 0, actual2026: 0 };

            this.processedData.hr.byMonth[month].businesses[business] = { target2026, actual2026 };
            this.processedData.hr.byMonth[month].target2026 += target2026;
            this.processedData.hr.byMonth[month].actual2026 += actual2026;

            this.processedData.hr.byBusiness[business].months[month] = { target2026, actual2026 };
            this.processedData.hr.byBusiness[business].target2026 += target2026;
            this.processedData.hr.byBusiness[business].actual2026 += actual2026;

            this.processedData.hr.totals.target2026 += target2026;
            this.processedData.hr.totals.actual2026 += actual2026;
        });
    }

    processTeleData() {
        this.processedData.tele = {
            byWeek: {},
            byMonth: {},
            totals: {
                busbuddy_booked: 0, busbuddy_attended: 0, busbuddy_trials: 0,
                taxi_booked: 0, taxi_attended: 0, taxi_closed: 0
            }
        };

        const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        months.forEach(m => {
            this.processedData.tele.byMonth[m] = {
                weeks: [],
                busbuddy_booked: 0, busbuddy_attended: 0, busbuddy_trials: 0,
                taxi_booked: 0, taxi_attended: 0, taxi_closed: 0
            };
        });

        this.teleData.forEach((row, i) => {
            const weekLabel = row.WeekNumber || row.weeknumber || row.Week || row.week || `Week ${i+1}`;
            const busbuddy_booked = this.cleanNumber(row['BusBuddy_meetings_booked'] || row['busbuddy_meetings_booked'] || row['BusBuddy meetings booked'] || 0);
            const busbuddy_attended = this.cleanNumber(row['BusBuddy_meetings_attended'] || row['busbuddy_meetings_attended'] || 0);
            const busbuddy_trials = this.cleanNumber(row['BusBuddy_trials'] || row['busbuddy_trials'] || 0);
            const taxi_booked = this.cleanNumber(row['Taxi_meetings_booked'] || row['taxi_meetings_booked'] || 0);
            const taxi_attended = this.cleanNumber(row['Taxi_meetings_attended'] || row['taxi_meetings_attended'] || 0);
            const taxi_closed = this.cleanNumber(row['Taxi_meetings_closed'] || row['taxi_meetings_closed'] || 0);

            const month = this.weekToMonth(weekLabel);

            const weekData = { week: weekLabel, month, busbuddy_booked, busbuddy_attended, busbuddy_trials, taxi_booked, taxi_attended, taxi_closed };
            this.processedData.tele.byWeek[String(weekLabel)] = weekData;

            if (this.processedData.tele.byMonth[month]) {
                const md = this.processedData.tele.byMonth[month];
                md.weeks.push(String(weekLabel));
                md.busbuddy_booked += busbuddy_booked;
                md.busbuddy_attended += busbuddy_attended;
                md.busbuddy_trials += busbuddy_trials;
                md.taxi_booked += taxi_booked;
                md.taxi_attended += taxi_attended;
                md.taxi_closed += taxi_closed;
            }

            const t = this.processedData.tele.totals;
            t.busbuddy_booked += busbuddy_booked;
            t.busbuddy_attended += busbuddy_attended;
            t.busbuddy_trials += busbuddy_trials;
            t.taxi_booked += taxi_booked;
            t.taxi_attended += taxi_attended;
            t.taxi_closed += taxi_closed;
        });

        console.log('Tele totals:', this.processedData.tele.totals);
    }

    processSummaryData() {
        const ct = this.processedData.charter.totals;
        const ht = this.processedData.hr.totals;

        const charterAchievement = ct.target2026 > 0 ? (ct.total2026 / ct.target2026) * 100 : 0;
        const hrAchievement = ht.target2026 > 0 ? (ht.actual2026 / ht.target2026) * 100 : 0;
        const overallTotal2026 = ct.total2026 + ht.actual2026;
        const overallTarget2026 = ct.target2026 + ht.target2026;

        this.processedData.summary = {
            charter: { total2025: ct.total2025, total2026: ct.total2026, target2026: ct.target2026, achievement: charterAchievement, yoy: ct.total2025 > 0 ? ((ct.total2026 - ct.total2025) / ct.total2025) * 100 : 0 },
            hr: { actual2026: ht.actual2026, target2026: ht.target2026, achievement: hrAchievement },
            overall: { total2026: overallTotal2026, target2026: overallTarget2026, achievement: overallTarget2026 > 0 ? (overallTotal2026 / overallTarget2026) * 100 : 0 },
            associates: this.associates,
            businesses: this.businesses,
            months: ['January','February','March','April','May','June','July','August','September','October','November','December']
        };
    }

    formatNumber(num) {
        if (num === undefined || num === null) return '0.00';
        return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    saveToLocalStorage() {
        try {
            localStorage.setItem('charterHRData', JSON.stringify(this.processedData));
            localStorage.setItem('lastDataUpdate', new Date().toISOString());
            console.log('Saved to localStorage');
        } catch (e) { console.error('localStorage save error:', e); }
    }

    loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem('charterHRData');
            if (saved) {
                this.processedData = JSON.parse(saved);
                this.associates = this.processedData.summary?.associates || [];
                this.businesses = this.processedData.summary?.businesses || [];
                // Ensure tele exists for old data
                if (!this.processedData.tele) this.processedData.tele = { byWeek: {}, byMonth: {}, totals: {} };
                return true;
            }
        } catch (e) { console.error('localStorage load error:', e); }
        return false;
    }

    getDashboardData(filters = {}) {
        const { associate = 'All', month = 'All', business = 'All' } = filters;
        let charterData = { byMonth: {}, byAssociate: {}, totals: { total2025: 0, total2026: 0, target2026: 0 } };
        let hrData = { byMonth: {}, byBusiness: {}, totals: { target2026: 0, actual2026: 0 } };

        // Charter filtering
        if (associate === 'All' && month === 'All') {
            charterData = JSON.parse(JSON.stringify(this.processedData.charter));
        } else if (associate !== 'All' && month === 'All') {
            const ad = this.processedData.charter.byAssociate[associate];
            if (ad) {
                charterData.byAssociate[associate] = JSON.parse(JSON.stringify(ad));
                charterData.totals = { total2025: ad.total2025, total2026: ad.total2026, target2026: ad.target2026, newBusiness2025: ad.newBusiness2025||0, existingBusiness2025: ad.existingBusiness2025||0, busbuddy2025: ad.busbuddy2025||0, newBusiness2026: ad.newBusiness2026||0, existingBusiness2026: ad.existingBusiness2026||0, busbuddy2026: ad.busbuddy2026||0 };
                Object.keys(ad.months).forEach(m => { charterData.byMonth[m] = { associates: { [associate]: ad.months[m] }, total2025: ad.months[m].total2025, total2026: ad.months[m].total2026, target2026: ad.months[m].target2026 }; });
            }
        } else if (associate === 'All' && month !== 'All') {
            const md = this.processedData.charter.byMonth[month];
            if (md) {
                charterData.byMonth[month] = JSON.parse(JSON.stringify(md));
                charterData.totals = { total2025: md.total2025, total2026: md.total2026, target2026: md.target2026 };
                Object.keys(md.associates).forEach(a => { charterData.byAssociate[a] = { months: { [month]: md.associates[a] }, total2025: md.associates[a].total2025, total2026: md.associates[a].total2026, target2026: md.associates[a].target2026, busbuddy2026: md.associates[a].busbuddy2026||0, busbuddy2025: md.associates[a].busbuddy2025||0 }; });
            }
        } else {
            const ad = this.processedData.charter.byAssociate[associate];
            if (ad && ad.months[month]) {
                const md = ad.months[month];
                charterData.byMonth[month] = { associates: { [associate]: md }, total2025: md.total2025, total2026: md.total2026, target2026: md.target2026 };
                charterData.byAssociate[associate] = { months: { [month]: md }, total2025: md.total2025, total2026: md.total2026, target2026: md.target2026, busbuddy2026: md.busbuddy2026||0 };
                charterData.totals = { total2025: md.total2025, total2026: md.total2026, target2026: md.target2026, busbuddy2026: md.busbuddy2026||0 };
            }
        }

        // HR filtering
        if (business === 'All' && month === 'All') {
            hrData = JSON.parse(JSON.stringify(this.processedData.hr));
        } else if (business !== 'All' && month === 'All') {
            const bd = this.processedData.hr.byBusiness[business];
            if (bd) {
                hrData.byBusiness[business] = JSON.parse(JSON.stringify(bd));
                hrData.totals = { target2026: bd.target2026, actual2026: bd.actual2026 };
                Object.keys(bd.months).forEach(m => { if (!hrData.byMonth[m]) hrData.byMonth[m] = { businesses: {}, target2026: 0, actual2026: 0 }; hrData.byMonth[m].businesses[business] = bd.months[m]; hrData.byMonth[m].target2026 += bd.months[m].target2026; hrData.byMonth[m].actual2026 += bd.months[m].actual2026; });
            }
        } else if (business === 'All' && month !== 'All') {
            const md = this.processedData.hr.byMonth[month];
            if (md) {
                hrData.byMonth[month] = JSON.parse(JSON.stringify(md));
                hrData.totals = { target2026: md.target2026, actual2026: md.actual2026 };
                Object.keys(md.businesses).forEach(b => { hrData.byBusiness[b] = { months: { [month]: md.businesses[b] }, target2026: md.businesses[b].target2026, actual2026: md.businesses[b].actual2026 }; });
            }
        } else {
            const bd = this.processedData.hr.byBusiness[business];
            if (bd && bd.months[month]) {
                const md = bd.months[month];
                hrData.byMonth[month] = { businesses: { [business]: md }, target2026: md.target2026, actual2026: md.actual2026 };
                hrData.byBusiness[business] = { months: { [month]: md }, target2026: md.target2026, actual2026: md.actual2026 };
                hrData.totals = { target2026: md.target2026, actual2026: md.actual2026 };
            }
        }

        return { charter: charterData, hr: hrData, tele: this.processedData.tele, summary: this.processedData.summary, filters: { associate, month, business } };
    }
}

const dataParser = new DataParser();