// Data Parser for Excel Files - Version 6.0
// hr2 sheet support, updated busbuddy net revenue to 20%, new HR KPIs
class DataParser {
    constructor() {
        this.charterData = [];
        this.hrData = [];
        this.hr2Data = [];
        this.teleData = [];
        this.processedData = {
            charter: { byMonth: {}, byAssociate: {}, totals: { total2025: 0, total2026: 0, target2026: 0 } },
            hr: { byMonth: {}, byBusiness: {}, totals: { target2026: 0, actual2026: 0 } },
            hr2: { byWeek: {}, byMonth: {}, totals: {} },
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

    weekToMonth(weekLabel) {
        const match = String(weekLabel).match(/(\d+)/);
        if (!match) return 'January';
        const w = parseInt(match[1]);
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

                // HR2 sheet (weekly HR meetings)
                const hr2SheetName = workbook.SheetNames.find(n =>
                    n.toLowerCase() === 'hr2' || n.toLowerCase() === 'hr 2' || n.toLowerCase().includes('hr2')
                );
                if (hr2SheetName && workbook.Sheets[hr2SheetName]) {
                    this.hr2Data = XLSX.utils.sheet_to_json(workbook.Sheets[hr2SheetName]);
                    console.log('HR2 rows:', this.hr2Data.length, 'Sample:', this.hr2Data[0]);
                    this.processHR2Data();
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
                if (callback) callback({
                    success: true,
                    charterRows: this.charterData.length,
                    hrRows: this.hrData.length,
                    hr2Rows: this.hr2Data.length,
                    teleRows: this.teleData.length,
                    processedData: this.processedData
                });
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
            totals: {
                total2025: 0, total2026: 0, target2026: 0,
                newBusiness2025: 0, existingBusiness2025: 0, busbuddy2025: 0,
                newBusiness2026: 0, existingBusiness2026: 0, busbuddy2026: 0
            }
        };
        this.associates = [];

        this.charterData.forEach((row, i) => {
            const month = row.Month || row.month;
            const associate = row.Associate || row.associate;
            if (!month || !associate) { console.warn('Skip charter row', i); return; }
            if (!this.associates.includes(associate)) this.associates.push(associate);

            const findCol = (keys, row) => {
                for (const k of keys) {
                    const found = Object.keys(row).find(rk =>
                        rk.toLowerCase().replace(/\s+/g, '').replace(/_/g,'') ===
                        k.toLowerCase().replace(/\s+/g,'').replace(/_/g,'')
                    );
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

            if (!this.processedData.charter.byMonth[month]) {
                this.processedData.charter.byMonth[month] = { associates: {}, total2025: 0, total2026: 0, target2026: 0 };
            }
            if (!this.processedData.charter.byAssociate[associate]) {
                this.processedData.charter.byAssociate[associate] = {
                    months: {}, total2025: 0, total2026: 0, target2026: 0,
                    newBusiness2025: 0, existingBusiness2025: 0, busbuddy2025: 0,
                    newBusiness2026: 0, existingBusiness2026: 0, busbuddy2026: 0
                };
            }

            const rowData = {
                newBusiness2025: newBiz2025, existingBusiness2025: existingBiz2025, busbuddy2025,
                total2025, newBusiness2026: newBiz2026, existingBusiness2026: existingBiz2026,
                busbuddy2026, total2026, target2026
            };

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
        this.processedData.hr = {
            byMonth: {}, byBusiness: {},
            totals: {
                target2026: 0, actual2026: 0,
                actual2025: 0, newRevenue2025: 0,
                corporateClosures: 0, newRevenue: 0, oldRevenue: 0, totalRevenue2026: 0
            }
        };
        this.businesses = [];

        this.hrData.forEach((row, i) => {
            const month = row.Month || row.month;
            const business = row.Business || row.business;
            if (!month || !business) { console.warn('Skip HR row', i); return; }
            if (!this.businesses.includes(business)) this.businesses.push(business);

            const target2026 = this.cleanNumber(row['2026 Target'] || row['target 2026'] || row['Target 2026']);
            const actual2025 = this.cleanNumber(row['2025 Actual'] || row['actual 2025'] || row['Actual 2025'] || row['2025 actual']);
            const newRevenue2025 = this.cleanNumber(row['2025 New Revenue'] || row['new revenue 2025'] || row['New Revenue 2025'] || row['2025 new revenue'] || 0);
            const corporateClosures = this.cleanNumber(row['2026 Corporate Closures'] || row['corporate closures'] || row['Corporate Closures'] || 0);
            const newRevenue = this.cleanNumber(row['2026 New Revenue'] || row['new revenue'] || row['New Revenue'] || 0);
            const oldRevenue = this.cleanNumber(row['2026 Old Revenue'] || row['old revenue'] || row['Old Revenue'] || 0);
            // 2026 Total Revenue can be explicit or derived
            const totalRevenue2026 = this.cleanNumber(
                row['2026 Total Revenue'] || row['2026 Actual'] || row['actual 2026'] || row['Actual 2026'] || 0
            ) || (newRevenue + oldRevenue);
            const actual2026 = totalRevenue2026;

            if (!this.processedData.hr.byMonth[month]) {
                this.processedData.hr.byMonth[month] = {
                    businesses: {}, target2026: 0, actual2026: 0,
                    actual2025: 0, newRevenue2025: 0, corporateClosures: 0, newRevenue: 0, oldRevenue: 0, totalRevenue2026: 0
                };
            }
            if (!this.processedData.hr.byBusiness[business]) {
                this.processedData.hr.byBusiness[business] = {
                    months: {}, target2026: 0, actual2026: 0,
                    actual2025: 0, newRevenue2025: 0, corporateClosures: 0, newRevenue: 0, oldRevenue: 0, totalRevenue2026: 0
                };
            }

            const rowData = { target2026, actual2026, actual2025, newRevenue2025, corporateClosures, newRevenue, oldRevenue, totalRevenue2026 };

            this.processedData.hr.byMonth[month].businesses[business] = rowData;
            this.processedData.hr.byMonth[month].target2026 += target2026;
            this.processedData.hr.byMonth[month].actual2026 += actual2026;
            this.processedData.hr.byMonth[month].actual2025 += actual2025;
            this.processedData.hr.byMonth[month].newRevenue2025 += newRevenue2025;
            this.processedData.hr.byMonth[month].corporateClosures += corporateClosures;
            this.processedData.hr.byMonth[month].newRevenue += newRevenue;
            this.processedData.hr.byMonth[month].oldRevenue += oldRevenue;
            this.processedData.hr.byMonth[month].totalRevenue2026 += totalRevenue2026;

            this.processedData.hr.byBusiness[business].months[month] = rowData;
            this.processedData.hr.byBusiness[business].target2026 += target2026;
            this.processedData.hr.byBusiness[business].actual2026 += actual2026;
            this.processedData.hr.byBusiness[business].actual2025 += actual2025;
            this.processedData.hr.byBusiness[business].newRevenue2025 += newRevenue2025;
            this.processedData.hr.byBusiness[business].corporateClosures += corporateClosures;
            this.processedData.hr.byBusiness[business].newRevenue += newRevenue;
            this.processedData.hr.byBusiness[business].oldRevenue += oldRevenue;
            this.processedData.hr.byBusiness[business].totalRevenue2026 += totalRevenue2026;

            const t = this.processedData.hr.totals;
            t.target2026 += target2026;
            t.actual2026 += actual2026;
            t.actual2025 += actual2025;
            t.newRevenue2025 += newRevenue2025;
            t.corporateClosures += corporateClosures;
            t.newRevenue += newRevenue;
            t.oldRevenue += oldRevenue;
            t.totalRevenue2026 += totalRevenue2026;
        });
        console.log('HR totals:', this.processedData.hr.totals);
    }

    processHR2Data() {
        this.processedData.hr2 = {
            byWeek: {},
            byMonth: {},
            totals: {
                hr_meetings_booked: 0, hrms_meetings_booked: 0, meetings_attended: 0,
                hr_free_trials: 0, hr_free_trials_target: 0, hr_closed: 0
            }
        };
        const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        months.forEach(m => {
            this.processedData.hr2.byMonth[m] = {
                weeks: [],
                hr_meetings_booked: 0, hrms_meetings_booked: 0, meetings_attended: 0,
                hr_free_trials: 0, hr_free_trials_target: 0, hr_closed: 0
            };
        });

        this.hr2Data.forEach((row, i) => {
            const weekLabel = row.WeekNumber || row.weeknumber || row.Week || row.week || `Week ${i+1}`;
            const hr_meetings_booked = this.cleanNumber(row['hr_meetings_booked'] || row['HR Meetings Booked'] || 0);
            const hrms_meetings_booked = this.cleanNumber(row['hrms_meetings_booked'] || row['HRMS Meetings Booked'] || 0);
            const meetings_attended = this.cleanNumber(row['meetings_attended'] || row['Meetings Attended'] || 0);
            const hr_free_trials = this.cleanNumber(row['hr_free_trials'] || row['HR Free Trials'] || 0);
            const hr_free_trials_target = this.cleanNumber(row['hr_free_trials_target'] || row['HR Free Trials Target'] || 0);
            const hr_closed = this.cleanNumber(row['hr_closed'] || row['HR Closed'] || 0);

            const month = this.weekToMonth(weekLabel);
            const weekData = { week: weekLabel, month, hr_meetings_booked, hrms_meetings_booked, meetings_attended, hr_free_trials, hr_free_trials_target, hr_closed };

            this.processedData.hr2.byWeek[String(weekLabel)] = weekData;

            if (this.processedData.hr2.byMonth[month]) {
                const md = this.processedData.hr2.byMonth[month];
                md.weeks.push(String(weekLabel));
                md.hr_meetings_booked += hr_meetings_booked;
                md.hrms_meetings_booked += hrms_meetings_booked;
                md.meetings_attended += meetings_attended;
                md.hr_free_trials += hr_free_trials;
                md.hr_free_trials_target += hr_free_trials_target;
                md.hr_closed += hr_closed;
            }

            const t = this.processedData.hr2.totals;
            t.hr_meetings_booked += hr_meetings_booked;
            t.hrms_meetings_booked += hrms_meetings_booked;
            t.meetings_attended += meetings_attended;
            t.hr_free_trials += hr_free_trials;
            t.hr_free_trials_target += hr_free_trials_target;
            t.hr_closed += hr_closed;
        });
        console.log('HR2 totals:', this.processedData.hr2.totals);
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
            const busbuddy_booked = this.cleanNumber(row['BusBuddy_meetings_booked'] || row['busbuddy_meetings_booked'] || row['hr_meetings_booked'] || 0);
            const busbuddy_attended = this.cleanNumber(row['BusBuddy_meetings_attended'] || row['busbuddy_meetings_attended'] || row['hrms_meetings_booked'] || 0);
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
            charter: {
                total2025: ct.total2025, total2026: ct.total2026, target2026: ct.target2026,
                achievement: charterAchievement,
                yoy: ct.total2025 > 0 ? ((ct.total2026 - ct.total2025) / ct.total2025) * 100 : 0
            },
            hr: { actual2026: ht.actual2026, target2026: ht.target2026, achievement: hrAchievement },
            overall: {
                total2026: overallTotal2026, target2026: overallTarget2026,
                achievement: overallTarget2026 > 0 ? (overallTotal2026 / overallTarget2026) * 100 : 0
            },
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
                if (!this.processedData.tele) this.processedData.tele = { byWeek: {}, byMonth: {}, totals: {} };
                if (!this.processedData.hr2) this.processedData.hr2 = { byWeek: {}, byMonth: {}, totals: {} };
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
                charterData.totals = {
                    total2025: ad.total2025, total2026: ad.total2026, target2026: ad.target2026,
                    newBusiness2025: ad.newBusiness2025||0, existingBusiness2025: ad.existingBusiness2025||0, busbuddy2025: ad.busbuddy2025||0,
                    newBusiness2026: ad.newBusiness2026||0, existingBusiness2026: ad.existingBusiness2026||0, busbuddy2026: ad.busbuddy2026||0
                };
                Object.keys(ad.months).forEach(m => {
                    charterData.byMonth[m] = {
                        associates: { [associate]: ad.months[m] },
                        total2025: ad.months[m].total2025, total2026: ad.months[m].total2026, target2026: ad.months[m].target2026
                    };
                });
            }
        } else if (associate === 'All' && month !== 'All') {
            const md = this.processedData.charter.byMonth[month];
            if (md) {
                charterData.byMonth[month] = JSON.parse(JSON.stringify(md));
                charterData.totals = { total2025: md.total2025, total2026: md.total2026, target2026: md.target2026 };
                Object.keys(md.associates).forEach(a => {
                    charterData.byAssociate[a] = {
                        months: { [month]: md.associates[a] },
                        total2025: md.associates[a].total2025, total2026: md.associates[a].total2026,
                        target2026: md.associates[a].target2026, busbuddy2026: md.associates[a].busbuddy2026||0,
                        busbuddy2025: md.associates[a].busbuddy2025||0
                    };
                });
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
                hrData.totals = {
                    target2026: bd.target2026, actual2026: bd.actual2026,
                    actual2025: bd.actual2025 || 0, newRevenue2025: bd.newRevenue2025 || 0,
                    newRevenue: bd.newRevenue || 0, oldRevenue: bd.oldRevenue || 0,
                    totalRevenue2026: bd.totalRevenue2026 || 0, corporateClosures: bd.corporateClosures || 0
                };
                Object.keys(bd.months).forEach(m => {
                    if (!hrData.byMonth[m]) hrData.byMonth[m] = { businesses: {}, target2026: 0, actual2026: 0, actual2025: 0, newRevenue2025: 0, newRevenue: 0, oldRevenue: 0 };
                    hrData.byMonth[m].businesses[business] = bd.months[m];
                    hrData.byMonth[m].target2026 += bd.months[m].target2026;
                    hrData.byMonth[m].actual2026 += bd.months[m].actual2026;
                    hrData.byMonth[m].actual2025 = (hrData.byMonth[m].actual2025 || 0) + (bd.months[m].actual2025 || 0);
                    hrData.byMonth[m].newRevenue2025 = (hrData.byMonth[m].newRevenue2025 || 0) + (bd.months[m].newRevenue2025 || 0);
                    hrData.byMonth[m].newRevenue = (hrData.byMonth[m].newRevenue || 0) + (bd.months[m].newRevenue || 0);
                    hrData.byMonth[m].oldRevenue = (hrData.byMonth[m].oldRevenue || 0) + (bd.months[m].oldRevenue || 0);
                });
            }
        } else if (business === 'All' && month !== 'All') {
            const md = this.processedData.hr.byMonth[month];
            if (md) {
                hrData.byMonth[month] = JSON.parse(JSON.stringify(md));
                hrData.totals = {
                    target2026: md.target2026, actual2026: md.actual2026,
                    actual2025: md.actual2025 || 0, newRevenue2025: md.newRevenue2025 || 0,
                    newRevenue: md.newRevenue || 0, oldRevenue: md.oldRevenue || 0,
                    totalRevenue2026: md.totalRevenue2026 || 0, corporateClosures: md.corporateClosures || 0
                };
                Object.keys(md.businesses).forEach(b => {
                    hrData.byBusiness[b] = {
                        months: { [month]: md.businesses[b] },
                        target2026: md.businesses[b].target2026, actual2026: md.businesses[b].actual2026,
                        actual2025: md.businesses[b].actual2025 || 0, newRevenue2025: md.businesses[b].newRevenue2025 || 0,
                        newRevenue: md.businesses[b].newRevenue || 0, oldRevenue: md.businesses[b].oldRevenue || 0
                    };
                });
            }
        } else {
            const bd = this.processedData.hr.byBusiness[business];
            if (bd && bd.months[month]) {
                const md = bd.months[month];
                hrData.byMonth[month] = { businesses: { [business]: md }, target2026: md.target2026, actual2026: md.actual2026, actual2025: md.actual2025 || 0, newRevenue2025: md.newRevenue2025 || 0, newRevenue: md.newRevenue || 0, oldRevenue: md.oldRevenue || 0 };
                hrData.byBusiness[business] = { months: { [month]: md }, target2026: md.target2026, actual2026: md.actual2026, actual2025: md.actual2025 || 0, newRevenue2025: md.newRevenue2025 || 0, newRevenue: md.newRevenue || 0, oldRevenue: md.oldRevenue || 0 };
                hrData.totals = { target2026: md.target2026, actual2026: md.actual2026, actual2025: md.actual2025 || 0, newRevenue2025: md.newRevenue2025 || 0, newRevenue: md.newRevenue || 0, oldRevenue: md.oldRevenue || 0 };
            }
        }

        return {
            charter: charterData,
            hr: hrData,
            hr2: this.processedData.hr2,
            tele: this.processedData.tele,
            summary: this.processedData.summary,
            filters: { associate, month, business }
        };
    }

    // Build a text summary of all data for the chatbot
    getDataSummary() {
        const d = this.processedData;
        if (!d || !d.summary) return 'No data loaded yet. Please upload an Excel file.';

        const ct = d.charter.totals || {};
        const ht = d.hr.totals || {};
        const tt = d.tele.totals || {};
        const h2t = d.hr2?.totals || {};

        const lines = [];
        lines.push('=== LITTLE AFRICA ANALYTICS DATA SUMMARY ===');
        lines.push(`Data covers months: ${d.summary.months.join(', ')}`);
        lines.push('');
        lines.push('--- CHARTER ---');
        lines.push(`Total 2026 Revenue: Ksh ${this.formatNumber(ct.total2026 || 0)}`);
        lines.push(`Total 2025 Revenue: Ksh ${this.formatNumber(ct.total2025 || 0)}`);
        lines.push(`2026 Target: Ksh ${this.formatNumber(ct.target2026 || 0)}`);
        lines.push(`Achievement: ${ct.target2026 > 0 ? ((ct.total2026/ct.target2026)*100).toFixed(1) : 0}%`);
        lines.push(`Net Revenue (20% of total): Ksh ${this.formatNumber((ct.total2026||0)*0.20)}`);
        lines.push(`YoY Growth: ${ct.total2025 > 0 ? (((ct.total2026-ct.total2025)/ct.total2025)*100).toFixed(1) : 0}%`);
        lines.push(`New Business 2026: Ksh ${this.formatNumber(ct.newBusiness2026||0)}`);
        lines.push(`Existing Business 2026: Ksh ${this.formatNumber(ct.existingBusiness2026||0)}`);
        lines.push(`Busbuddy 2026: Ksh ${this.formatNumber(ct.busbuddy2026||0)}`);

        const associates = d.summary.associates || [];
        if (associates.length > 0) {
            lines.push('');
            lines.push('Charter Associates:');
            associates.forEach(a => {
                const ad = d.charter.byAssociate[a] || {};
                lines.push(`  ${a}: 2026 Rev = Ksh ${this.formatNumber(ad.total2026||0)}, Target = Ksh ${this.formatNumber(ad.target2026||0)}, Achievement = ${ad.target2026>0?((ad.total2026/ad.target2026)*100).toFixed(1):0}%`);
            });
        }

        lines.push('');
        lines.push('--- HR SERVICES ---');
        lines.push(`2026 Actual Revenue: Ksh ${this.formatNumber(ht.actual2026||0)}`);
        lines.push(`2026 Target: Ksh ${this.formatNumber(ht.target2026||0)}`);
        lines.push(`2025 Actual: Ksh ${this.formatNumber(ht.actual2025||0)}`);
        lines.push(`Corporate Closures 2026: Ksh ${this.formatNumber(ht.corporateClosures||0)}`);
        lines.push(`New Revenue 2025: Ksh ${this.formatNumber(ht.newRevenue2025||0)}`);
        lines.push(`New Revenue 2026: Ksh ${this.formatNumber(ht.newRevenue||0)}`);
        lines.push(`Old Revenue 2026: Ksh ${this.formatNumber(ht.oldRevenue||0)}`);
        lines.push(`HR Achievement: ${ht.target2026 > 0 ? ((ht.actual2026/ht.target2026)*100).toFixed(1) : 0}%`);

        const businesses = d.summary.businesses || [];
        if (businesses.length > 0) {
            lines.push('HR Business Units:');
            businesses.forEach(b => {
                const bd = d.hr.byBusiness[b] || {};
                lines.push(`  ${b}: Actual = Ksh ${this.formatNumber(bd.actual2026||0)}, Target = Ksh ${this.formatNumber(bd.target2026||0)}`);
            });
        }

        if (h2t && (h2t.hr_meetings_booked > 0 || h2t.hr_closed > 0)) {
            lines.push('');
            lines.push('--- HR WEEKLY MEETINGS (HR2) ---');
            lines.push(`HR Meetings Booked: ${h2t.hr_meetings_booked||0}`);
            lines.push(`HRMS Meetings Booked: ${h2t.hrms_meetings_booked||0}`);
            lines.push(`Meetings Attended: ${h2t.meetings_attended||0}`);
            lines.push(`HR Free Trials: ${h2t.hr_free_trials||0}`);
            lines.push(`HR Free Trials Target: ${h2t.hr_free_trials_target||0}`);
            lines.push(`HR Closed: ${h2t.hr_closed||0}`);
        }

        if (tt && (tt.busbuddy_booked > 0 || tt.taxi_booked > 0)) {
            lines.push('');
            lines.push('--- TELESALES ---');
            lines.push(`BusBuddy Booked: ${tt.busbuddy_booked||0}`);
            lines.push(`BusBuddy Attended: ${tt.busbuddy_attended||0}`);
            lines.push(`BusBuddy Trials: ${tt.busbuddy_trials||0}`);
            lines.push(`Taxi Booked: ${tt.taxi_booked||0}`);
            lines.push(`Taxi Attended: ${tt.taxi_attended||0}`);
            lines.push(`Taxi Closed: ${tt.taxi_closed||0}`);
            const totalBooked = (tt.busbuddy_booked||0)+(tt.taxi_booked||0);
            const totalClosed = (tt.taxi_closed||0)+(tt.busbuddy_trials||0);
            lines.push(`Overall Close Rate: ${totalBooked > 0 ? ((totalClosed/totalBooked)*100).toFixed(1) : 0}%`);
        }

        // Monthly breakdown
        lines.push('');
        lines.push('--- MONTHLY CHARTER BREAKDOWN ---');
        const months = d.summary.months || [];
        months.forEach(m => {
            const cm = d.charter.byMonth[m];
            if (cm && (cm.total2026 > 0 || cm.total2025 > 0)) {
                lines.push(`${m}: 2026 = Ksh ${this.formatNumber(cm.total2026||0)}, 2025 = Ksh ${this.formatNumber(cm.total2025||0)}, Target = Ksh ${this.formatNumber(cm.target2026||0)}`);
            }
        });

        lines.push('');
        lines.push('--- MONTHLY HR BREAKDOWN ---');
        months.forEach(m => {
            const hm = d.hr.byMonth[m];
            if (hm && (hm.actual2026 > 0 || hm.target2026 > 0)) {
                lines.push(`${m}: Actual = Ksh ${this.formatNumber(hm.actual2026||0)}, Target = Ksh ${this.formatNumber(hm.target2026||0)}, 2025 = Ksh ${this.formatNumber(hm.actual2025||0)}`);
            }
        });

        return lines.join('\n');
    }

    // ============================================================
    // GOOGLE SHEETS FETCH
    // ============================================================
    // Base URL for the published spreadsheet
    // Each sheet is fetched as CSV using its gid (sheet tab ID).
    // gids are discovered automatically by fetching the HTML index.
    // ============================================================

    async fetchFromGoogleSheets(baseUrl, onProgress) {
        const progress = onProgress || (() => {});

        // Normalise base URL — strip any trailing params or /pubhtml
        const pubBase = baseUrl.split('?')[0].replace(/\/pubhtml$/, '').replace(/\/$/, '');
        const csvUrl  = (gid) => `${pubBase}/pub?output=csv&gid=${gid}`;

        // ── Robust CSV parser (handles quoted fields containing commas) ──
        const parseCSV = (text) => {
            const lines = text.split(/\r?\n/).filter(l => l.trim());
            if (lines.length < 2) return [];
            const headers = splitCSVLine(lines[0]);
            return lines.slice(1).map(line => {
                const vals = splitCSVLine(line);
                const row = {};
                headers.forEach((h, i) => { row[h] = (vals[i] || '').trim(); });
                return row;
            }).filter(row => Object.values(row).some(v => v !== ''));
        };

        const splitCSVLine = (line) => {
            const vals = [];
            let cur = '', inQ = false;
            for (let i = 0; i < line.length; i++) {
                const ch = line[i];
                if (ch === '"') {
                    if (inQ && line[i+1] === '"') { cur += '"'; i++; } // escaped quote
                    else inQ = !inQ;
                } else if (ch === ',' && !inQ) {
                    vals.push(cur.trim()); cur = '';
                } else {
                    cur += ch;
                }
            }
            vals.push(cur.trim());
            return vals;
        };

        // ── Fetch one CSV, return { gid, rows, headers } or null ──
        const fetchSheet = async (gid) => {
            try {
                const res = await fetch(csvUrl(gid), { cache: 'no-store' });
                if (!res.ok) return null;
                const text = await res.text();
                // Google redirects to an HTML error page if gid is invalid
                if (text.trim().startsWith('<')) return null;
                const rows = parseCSV(text);
                const headers = rows.length > 0 ? Object.keys(rows[0]).map(h => h.toLowerCase()) : [];
                return { gid, rows, headers };
            } catch(e) { return null; }
        };

        // ── Identify sheet type from its column headers ──
        const identify = (headers) => {
            const h = headers.join(' ');
            if (h.includes('associate') || h.includes('busbuddy revenue') || h.includes('new business revenue')) return 'charter';
            if (h.includes('business') && (h.includes('2026 target') || h.includes('2025 actual') || h.includes('2026 total'))) return 'hr';
            if (h.includes('hr_meetings_booked') || h.includes('hrms_meetings_booked') || h.includes('hr_free_trials')) return 'hr2';
            if (h.includes('busbuddy_meetings_booked') || h.includes('taxi_meetings_booked') || h.includes('busbuddy') && h.includes('taxi')) return 'tele';
            return null;
        };

        // ── Probe a list of gids to discover all sheets ──
        // Google Sheets gids are arbitrary integers. We try:
        //  1. gid=0 (always first sheet)
        //  2. Known gids from the URL if user pasted one with #gid=
        //  3. A set of common gids that Google auto-assigns
        const extractGidsFromUrl = (url) => {
            const matches = [...url.matchAll(/gid=(\d+)/g)];
            return matches.map(m => m[1]);
        };

        const PROBE_GIDS = [
            '0',
            ...extractGidsFromUrl(baseUrl),
            // Google commonly uses these ranges for auto-assigned gids
            '1','2','3',
            '1516031763','205548690','608980584','1082013324',
            '889764859','1771881119','1339130469','1234567890',
            '1481793188','1567616083','692340437','1817000252',
        ];
        // Deduplicate
        const uniqueGids = [...new Set(PROBE_GIDS)];

        progress(5, 'Discovering sheet tabs…');
        const found = { charter: null, hr: null, hr2: null, tele: null };
        let probed = 0;

        // First pass: probe all candidate gids
        for (const gid of uniqueGids) {
            const sheet = await fetchSheet(gid);
            probed++;
            if (!sheet || sheet.rows.length === 0) continue;
            const type = identify(sheet.headers);
            console.log(`gid=${gid} → ${type || 'unknown'} (headers: ${sheet.headers.slice(0,4).join(', ')})`);
            if (type && !found[type]) {
                found[type] = sheet;
                progress(5 + Math.round((probed / uniqueGids.length) * 20), `Found ${type} sheet (gid=${gid})`);
            }
            // Stop early if all 4 found
            if (found.charter && found.hr && found.hr2 && found.tele) break;
        }

        // Report what was found
        const foundTypes = Object.entries(found).filter(([,v]) => v).map(([k]) => k);
        console.log('Sheets found:', foundTypes);
        if (foundTypes.length === 0) {
            throw new Error('Could not find any matching sheets. Make sure the spreadsheet is published to the web (File → Share → Publish to web).');
        }

        // ── Process each sheet ──
        if (found.charter) {
            progress(30, `Loading Charter data (${found.charter.rows.length} rows)…`);
            this.charterData = found.charter.rows;
            this.processCharterData();
            console.log('Charter processed:', this.charterData.length, 'rows. Sample:', this.charterData[0]);
        }

        if (found.hr) {
            progress(50, `Loading HR data (${found.hr.rows.length} rows)…`);
            this.hrData = found.hr.rows;
            this.processHRData();
            console.log('HR processed:', this.hrData.length, 'rows. Sample:', this.hrData[0]);
        }

        if (found.hr2) {
            progress(65, `Loading HR Weekly data (${found.hr2.rows.length} rows)…`);
            this.hr2Data = found.hr2.rows;
            this.processHR2Data();
        }

        if (found.tele) {
            progress(80, `Loading Telesales data (${found.tele.rows.length} rows)…`);
            this.teleData = found.tele.rows;
            this.processTeleData();
        }

        progress(92, 'Finalising…');
        this.processSummaryData();
        this.saveToLocalStorage();
        localStorage.setItem('sheetsUrl', pubBase);
        localStorage.setItem('dataSource', 'google-sheets');
        // Cache the discovered gids so future loads skip probing
        localStorage.setItem('sheetsGids', JSON.stringify({
            charter: found.charter?.gid,
            hr:      found.hr?.gid,
            hr2:     found.hr2?.gid,
            tele:    found.tele?.gid,
        }));
        progress(100, 'Done!');
        console.log('Google Sheets load complete.');

        return {
            success: true,
            charterRows: this.charterData.length,
            hrRows:      this.hrData.length,
            hr2Rows:     this.hr2Data.length,
            teleRows:    this.teleData.length,
            sheetsFound: foundTypes,
            gids: {
                charter: found.charter?.gid,
                hr:      found.hr?.gid,
                hr2:     found.hr2?.gid,
                tele:    found.tele?.gid,
            }
        };
    }

}

const dataParser = new DataParser();