// Main JavaScript - Handles upload and common functionality
document.addEventListener('DOMContentLoaded', function() {
    console.log('App initializing...');
    
    // Portal switching
    const switchButtons = document.querySelectorAll('#switchPortal, #switchFromHome');
    switchButtons.forEach(button => {
        if (button) {
            button.addEventListener('click', function() {
                window.location.href = 'https://phil7799.github.io/little-portal-africa/dashboard.html#overview';
            });
        }
    });
    
    // Determine current page
    const path = window.location.pathname;
    const page = path.substring(path.lastIndexOf('/') + 1) || 'index.html';
    
    console.log('Current page:', page);
    
    if (page === 'index.html' || page === '' || page === '/') {
        initHomePage();
    } else if (page === 'upload.html') {
        initUploadPage();
    }
});

function initHomePage() {
    console.log('Home page initialized');
}

function initUploadPage() {
    console.log('Upload page initializing...');
    
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const browseBtn = document.getElementById('browseBtn');
    const processBtn = document.getElementById('processFile');
    const downloadTemplateBtn = document.getElementById('downloadTemplate');
    const loadSampleBtn = document.getElementById('loadSample');
    
    console.log('Upload elements:', {
        uploadArea: !!uploadArea,
        fileInput: !!fileInput,
        browseBtn: !!browseBtn,
        processBtn: !!processBtn
    });
    
    if (browseBtn && fileInput) {
        browseBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Browse clicked');
            fileInput.click();
        });
    }
    
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }
    
    if (uploadArea) {
        uploadArea.addEventListener('click', (e) => {
            if (e.target !== browseBtn && !browseBtn.contains(e.target)) {
                fileInput.click();
            }
        });
        
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });
        
        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            if (e.dataTransfer.files.length) {
                fileInput.files = e.dataTransfer.files;
                handleFileSelect({ target: { files: e.dataTransfer.files } });
            }
        });
    }
    
    if (processBtn) {
        processBtn.addEventListener('click', processUploadedFile);
    }
    
    if (downloadTemplateBtn) {
        downloadTemplateBtn.addEventListener('click', downloadSampleTemplate);
    }
    
    if (loadSampleBtn) {
        loadSampleBtn.addEventListener('click', loadSampleData);
    }
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    console.log('File selected:', file.name);
    
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const fileSize = document.getElementById('fileSize');
    const fileModified = document.getElementById('fileModified');
    const sheetCount = document.getElementById('sheetCount');
    const sheetInfo = document.getElementById('sheetInfo');
    
    if (fileName) fileName.textContent = file.name;
    if (fileSize) fileSize.textContent = formatFileSize(file.size);
    if (fileModified) fileModified.textContent = new Date(file.lastModified).toLocaleDateString();
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            if (sheetCount) sheetCount.textContent = workbook.SheetNames.length;
            
            if (sheetInfo) {
                sheetInfo.innerHTML = '';
                workbook.SheetNames.forEach(name => {
                    const sheet = workbook.Sheets[name];
                    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                    const div = document.createElement('div');
                    div.style.cssText = 'margin-top: 10px; padding: 10px; background: white; border-radius: 5px;';
                    div.innerHTML = `<strong>${name}:</strong> ${jsonData.length - 1} rows, ${jsonData[0] ? jsonData[0].length : 0} columns`;
                    sheetInfo.appendChild(div);
                });
            }
        } catch (error) {
            console.error('Error reading sheets:', error);
        }
    };
    reader.readAsArrayBuffer(file);
    
    if (fileInfo) fileInfo.style.display = 'block';
}

function processUploadedFile() {
    const fileInput = document.getElementById('fileInput');
    if (!fileInput || !fileInput.files.length) {
        alert('Please select a file first.');
        return;
    }
    
    const file = fileInput.files[0];
    console.log('Processing:', file.name);
    
    const processingStatus = document.getElementById('processingStatus');
    const statusText = document.getElementById('statusText');
    const progressFill = document.getElementById('progressFill');
    
    if (processingStatus) processingStatus.style.display = 'block';
    if (statusText) statusText.textContent = 'Reading Excel file...';
    if (progressFill) progressFill.style.width = '25%';
    
    dataParser.parseExcelFile(file, function(result) {
        console.log('Result:', result);
        
        if (result.success) {
            if (statusText) statusText.textContent = 'Processing...';
            if (progressFill) progressFill.style.width = '75%';
            
            setTimeout(() => {
                if (statusText) statusText.textContent = 'Complete!';
                if (progressFill) progressFill.style.width = '100%';
                
                setTimeout(() => {
                    if (processingStatus) processingStatus.style.display = 'none';
                    const successMessage = document.getElementById('successMessage');
                    if (successMessage) successMessage.style.display = 'block';
                }, 500);
            }, 500);
        } else {
            if (statusText) statusText.textContent = 'Error: ' + result.error;
            if (progressFill) {
                progressFill.style.width = '100%';
                progressFill.style.background = 'var(--red)';
            }
            setTimeout(() => {
                if (processingStatus) processingStatus.style.display = 'none';
                alert('Error: ' + result.error);
            }, 2000);
        }
    });
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' bytes';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
}

function downloadSampleTemplate() {
    const wb = XLSX.utils.book_new();
    
    const charterData = [
        ['Month', 'Associate', 'new business revenue_2025', 'existing business revenue_2025', 'busbuddy revenue_2025', 'Total Revenue_2025', 'new business revenue_2026', 'existing business revenue_2026', 'busbuddy revenue_2026', 'Total Revenue_2026', 'Target 2026'],
        ['January', 'philip.ngugi@little.africa', 74000, 1407940, 0, 1481940, 200000, 30000, 4000000, 4230000, 4908418],
        ['February', 'carol.ngugi@little.africa', 153000, 2164260, 0, 2317260, 2000000, 300000, 7000000, 9300000, 6512810]
    ];
    
    const hrData = [
        ['Month', 'Business', '2026 Target', '2026 Actual'],
        ['January', 'Overall', 975519, 120000],
        ['January', 'Payroll System', 200000, 2300005],
        ['January', 'School Attendance System', 0, 0],
        ['January', 'TELESALES - Payroll System', 180000, 0],
        ['February', 'Overall', 383040, 230000],
        ['February', 'Payroll System', 200000, 212345]
    ];
    
    const ws1 = XLSX.utils.aoa_to_sheet(charterData);
    const ws2 = XLSX.utils.aoa_to_sheet(hrData);
    
    XLSX.utils.book_append_sheet(wb, ws1, 'charter');
    XLSX.utils.book_append_sheet(wb, ws2, 'hr');
    
    XLSX.writeFile(wb, 'charter_hr_template.xlsx');
}

function loadSampleData() {
    console.log('Loading sample...');
    const sampleData = {
        charter: { byMonth: {}, byAssociate: {}, totals: { total2025: 3792600, total2026: 13530000, target2026: 19337064 } },
        hr: { byMonth: {}, byBusiness: {}, totals: { target2026: 2738559, actual2026: 2862350 } },
        summary: {
            associates: ['philip.ngugi@little.africa', 'carol.ngugi@little.africa', 'wambui.ngugi@little.africa'],
            businesses: ['Overall', 'Payroll System', 'School Attendance System', 'TELESALES - Payroll System'],
            months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
        }
    };
    
    // Build charter data
    [
        { m: 'January', a: 'philip.ngugi@little.africa', r25: 1481940, r26: 4230000, t: 4908418 },
        { m: 'February', a: 'carol.ngugi@little.africa', r25: 2317260, r26: 9300000, t: 6512810 },
        { m: 'January', a: 'wambui.ngugi@little.africa', r25: 1493400, r26: 0, t: 4908418 }
    ].forEach(d => {
        if (!sampleData.charter.byMonth[d.m]) sampleData.charter.byMonth[d.m] = { associates: {}, total2025: 0, total2026: 0, target2026: 0 };
        if (!sampleData.charter.byAssociate[d.a]) sampleData.charter.byAssociate[d.a] = { months: {}, total2025: 0, total2026: 0, target2026: 0 };
        
        sampleData.charter.byMonth[d.m].associates[d.a] = { total2025: d.r25, total2026: d.r26, target2026: d.t };
        sampleData.charter.byMonth[d.m].total2025 += d.r25;
        sampleData.charter.byMonth[d.m].total2026 += d.r26;
        sampleData.charter.byMonth[d.m].target2026 += d.t;
        
        sampleData.charter.byAssociate[d.a].months[d.m] = { total2025: d.r25, total2026: d.r26, target2026: d.t };
        sampleData.charter.byAssociate[d.a].total2025 += d.r25;
        sampleData.charter.byAssociate[d.a].total2026 += d.r26;
        sampleData.charter.byAssociate[d.a].target2026 += d.t;
    });
    
    // Build HR data
    [
        { m: 'January', b: 'Overall', t: 975519, a: 120000 },
        { m: 'January', b: 'Payroll System', t: 200000, a: 2300005 },
        { m: 'January', b: 'School Attendance System', t: 0, a: 0 },
        { m: 'January', b: 'TELESALES - Payroll System', t: 180000, a: 0 },
        { m: 'February', b: 'Overall', t: 383040, a: 230000 },
        { m: 'February', b: 'Payroll System', t: 200000, a: 212345 },
        { m: 'February', b: 'School Attendance System', t: 0, a: 0 },
        { m: 'February', b: 'TELESALES - Payroll System', t: 180000, a: 0 }
    ].forEach(d => {
        if (!sampleData.hr.byMonth[d.m]) sampleData.hr.byMonth[d.m] = { businesses: {}, target2026: 0, actual2026: 0 };
        if (!sampleData.hr.byBusiness[d.b]) sampleData.hr.byBusiness[d.b] = { months: {}, target2026: 0, actual2026: 0 };
        
        sampleData.hr.byMonth[d.m].businesses[d.b] = { target2026: d.t, actual2026: d.a };
        sampleData.hr.byMonth[d.m].target2026 += d.t;
        sampleData.hr.byMonth[d.m].actual2026 += d.a;
        
        sampleData.hr.byBusiness[d.b].months[d.m] = { target2026: d.t, actual2026: d.a };
        sampleData.hr.byBusiness[d.b].target2026 += d.t;
        sampleData.hr.byBusiness[d.b].actual2026 += d.a;
    });
    
    localStorage.setItem('charterHRData', JSON.stringify(sampleData));
    localStorage.setItem('lastDataUpdate', new Date().toISOString());
    dataParser.processedData = sampleData;
    
    const successMessage = document.getElementById('successMessage');
    if (successMessage) successMessage.style.display = 'block';
    const fileInfo = document.getElementById('fileInfo');
    if (fileInfo) fileInfo.style.display = 'block';
}