let expression = document.getElementById('expression');
let result = document.getElementById('result');
const themeToggle = document.getElementById('theme-toggle');
const langToggle = document.getElementById('lang-toggle');
const historyToggle = document.getElementById('history-toggle');
const historyPanel = document.getElementById('history-panel');
const html = document.documentElement;

// الترجمات
const translations = {
    ar: {
        title: 'الآلة الحاسبة العلمية',
        subtitle: 'حاسبة متقدمة للعمليات الرياضية والعلمية',
        expressionPlaceholder: 'أدخل التعبير الرياضي',
        history: 'السجل',
        clearHistory: 'مسح السجل',
        toggleHistory: 'عرض السجل',
        exportToExcel: 'تصدير السجل إلى ملف Excel',
        importFromExcel: 'استيراد السجل من ملف Excel',
        confirmClearHistory: 'هل أنت متأكد من مسح كل السجل؟',
        yes: 'نعم',
        no: 'لا'
    },
    en: {
        title: 'Scientific Calculator',
        subtitle: 'Advanced Calculator for Mathematical and Scientific Operations',
        expressionPlaceholder: 'Enter mathematical expression',
        history: 'History',
        clearHistory: 'Clear History',
        toggleHistory: 'Show History',
        exportToExcel: 'Export History to Excel',
        importFromExcel: 'Import History from Excel',
        confirmClearHistory: 'Are you sure you want to clear all history?',
        yes: 'Yes',
        no: 'No'
    }
};

// Global settings
const settings = {
    isRadianMode: true,
    errorMessages: {
        invalidExpression: 'Invalid expression',
        divisionByZero: 'Division by zero',
        invalidFunction: 'Invalid function input',
        syntaxError: 'Syntax error'
    }
};

// استرجاع السمة واللغة المحفوظة
const savedTheme = localStorage.getItem('theme') || 'dark';
const savedLang = localStorage.getItem('lang') || 'ar';
html.setAttribute('data-theme', savedTheme);
html.setAttribute('lang', savedLang);
html.setAttribute('dir', savedLang === 'ar' ? 'rtl' : 'ltr');
updateTranslations(savedLang);

// Initialize history array
let calculationHistory = JSON.parse(localStorage.getItem('calculatorHistory') || '[]');

// Initialize history visibility state
let isHistoryVisible = false;

// Function to add calculation to history
function addToHistory(expression, result) {
    if (result === 'Error') return; // Don't add errors to history
    
    const historyItem = { expression, result, timestamp: Date.now() };
    calculationHistory.unshift(historyItem); // Add to beginning of array
    
    // Keep only last 50 calculations
    if (calculationHistory.length > 50) {
        calculationHistory.pop();
    }
    
    // Save to localStorage
    localStorage.setItem('calculatorHistory', JSON.stringify(calculationHistory));
    
    // Update display
    updateHistoryDisplay();
}

// Custom popup functions
function showPopup() {
    const popup = document.getElementById('confirmPopup');
    popup.classList.add('show');
}

function hidePopup() {
    const popup = document.getElementById('confirmPopup');
    popup.classList.remove('show');
}

// Function to clear history
function clearHistory() {
    showPopup();
}

// Function to update history display
function updateHistoryDisplay() {
    const historyList = document.getElementById('history-list');
    historyList.innerHTML = '';
    
    calculationHistory.forEach((item, index) => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'history-item-content';
        contentDiv.onclick = () => loadHistoryItem(item);
        
        const expressionDiv = document.createElement('div');
        expressionDiv.className = 'history-expression';
        expressionDiv.textContent = item.expression;
        
        const resultDiv = document.createElement('div');
        resultDiv.className = 'history-result';
        resultDiv.textContent = item.result;
        
        const deleteButton = document.createElement('button');
        deleteButton.className = 'history-delete-btn';
        deleteButton.innerHTML = '×';
        deleteButton.title = 'Delete from history';
        deleteButton.onclick = (e) => {
            e.stopPropagation(); // Prevent triggering the loadHistoryItem
            deleteHistoryItem(index);
        };
        
        contentDiv.appendChild(expressionDiv);
        contentDiv.appendChild(resultDiv);
        historyItem.appendChild(contentDiv);
        historyItem.appendChild(deleteButton);
        historyList.appendChild(historyItem);
    });
}

// Function to delete specific history item
function deleteHistoryItem(index) {
    calculationHistory.splice(index, 1);
    localStorage.setItem('calculatorHistory', JSON.stringify(calculationHistory));
    updateHistoryDisplay();
    showNotification('Item deleted from history');
}

// Function to load history item into calculator
function loadHistoryItem(item) {
    expression.value = item.expression;
    result.value = item.result;
    // Close history panel
    isHistoryVisible = false;
    historyPanel.classList.remove('show');
    historyToggle.classList.remove('active');
}

// Copy to clipboard functionality
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showNotification('Copied to clipboard!');
    }).catch(err => {
        showNotification('Failed to copy');
    });
}

// Show notification
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.remove();
    }, 2000);
}

// Enhanced error handling
function handleError(error) {
    let errorMessage = settings.errorMessages.invalidExpression;
    
    if (error.message.includes('division by zero')) {
        errorMessage = settings.errorMessages.divisionByZero;
    } else if (error.message.includes('syntax')) {
        errorMessage = settings.errorMessages.syntaxError;
    } else if (error.message.includes('ln_domain')) {
        errorMessage = 'ln(x) is only defined for x > 0';
    } else if (error.message.includes('log_domain')) {
        errorMessage = 'log(x) is only defined for x > 0';
    } else if (error.message.includes('undefined')) {
        errorMessage = 'Undefined trigonometric value';
    }
    
    result.value = errorMessage;
    showNotification(errorMessage);
}

// Enhanced calculate function
function calculate() {
    try {
        // Check if there's an expression to calculate
        if (!expression.value.trim()) {
            return;
        }

        if (!checkBrackets()) {
            throw new Error('syntax');
        }
        
        let exp = expression.value;
        
        // First replace constants
        exp = exp.replace(/π/g, 'Math.PI');
        
        // Replace mathematical functions with their JavaScript equivalents
        exp = exp.replace(/sin\(/g, 'Math.sin(')
            .replace(/cos\(/g, 'Math.cos(')
            .replace(/tan\(/g, '(function(x) { const c = Math.cos(x); if (Math.abs(c) < 1e-10) throw new Error("undefined"); return Math.sin(x)/c; })(')
            .replace(/sqrt\(/g, 'Math.sqrt(')
            .replace(/log\(/g, 'Math.log10(')
            .replace(/ln\(/g, 'Math.log(')
            .replace(/\^/g, '**');
            
        // Convert trigonometric inputs if in degree mode
        if (!settings.isRadianMode) {
            exp = exp.replace(/Math\.sin\((.*?)\)/g, (match, p1) => `Math.sin(${p1} * Math.PI / 180)`);
            exp = exp.replace(/Math\.cos\((.*?)\)/g, (match, p1) => `Math.cos(${p1} * Math.PI / 180)`);
            exp = exp.replace(/Math\.tan\((.*?)\)/g, (match, p1) => `(function(x) { const c = Math.cos(x * Math.PI / 180); if (Math.abs(c) < 1e-10) throw new Error("undefined"); return Math.sin(x * Math.PI / 180)/c; })(${p1})`);
        }
        
        // Validate logarithm inputs
        const validateLogInputs = (expr) => {
            const testExp = expr.replace(/Math\.(log10|log)\((.*?)\)/g, (match, func, content) => {
                const value = eval(content);
                if (value <= 0) {
                    throw new Error('log_domain');
                }
                return value; // return a valid number to continue evaluation
            });
            // Test evaluation without actually using the result
            eval(testExp);
        };
        
        // Validate all logarithm inputs
        validateLogInputs(exp);
        
        let resultValue = eval(exp);
        
        // Normalize special angle results
        if (Math.abs(resultValue) < 1e-10) {
            resultValue = 0;
        }
        
        if (!isFinite(resultValue)) {
            throw new Error('division by zero');
        }
        
        result.value = resultValue;
        addToHistory(expression.value, resultValue);
        
    } catch (error) {
        handleError(error);
    }
}

// Toggle history panel
historyToggle.addEventListener('click', () => {
    isHistoryVisible = !isHistoryVisible;
    historyPanel.classList.toggle('show');
    historyToggle.classList.toggle('active');
    document.querySelector('.calculator-container').classList.toggle('history-open');
    
    // Update aria-expanded for accessibility
    historyToggle.setAttribute('aria-expanded', isHistoryVisible);
});

// Close history panel when clicking outside
document.addEventListener('click', (e) => {
    if (isHistoryVisible && 
        !historyPanel.contains(e.target) && 
        !historyToggle.contains(e.target)) {
        isHistoryVisible = false;
        historyPanel.classList.remove('show');
        historyToggle.classList.remove('active');
        document.querySelector('.calculator-container').classList.remove('history-open');
        historyToggle.setAttribute('aria-expanded', 'false');
    }
});

// Prevent closing when clicking inside history panel
historyPanel.addEventListener('click', (e) => {
    e.stopPropagation();
});

// تبديل السمة
themeToggle.addEventListener('click', () => {
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
});

// تبديل اللغة
langToggle.addEventListener('click', () => {
    const currentLang = html.getAttribute('lang');
    const newLang = currentLang === 'ar' ? 'en' : 'ar';
    
    html.setAttribute('lang', newLang);
    html.setAttribute('dir', newLang === 'ar' ? 'rtl' : 'ltr');
    localStorage.setItem('lang', newLang);
    
    // تحديث نص زر اللغة
    langToggle.querySelector('.lang-text').textContent = newLang === 'ar' ? 'EN' : 'عربي';
    
    updateTranslations(newLang);
});

// تحديث الترجمات
function updateTranslations(lang) {
    document.querySelectorAll('[data-translate]').forEach(element => {
        const key = element.getAttribute('data-translate');
        if (translations[lang][key]) {
            if (element.classList.contains('function-btn')) {
                // Keep the data-function attribute value for internal use
                element.setAttribute('data-display-text', translations[lang][key]);
            } else {
                element.textContent = translations[lang][key];
            }
        }
    });
    
    // Update title translations
    document.querySelectorAll('[data-translate-title]').forEach(element => {
        const key = element.getAttribute('data-translate-title');
        if (translations[lang][key]) {
            element.title = translations[lang][key];
        }
    });
    
    // Update title attributes for buttons
    historyToggle.title = translations[lang].toggleHistory;
    
    // تحديث نص زر اللغة
    langToggle.querySelector('.lang-text').textContent = lang === 'ar' ? 'EN' : 'عربي';
    
    // Update expression input placeholder
    expression.placeholder = translations[lang].expressionPlaceholder;
}

function addToDisplay(value) {
    // Special handling for brackets in RTL mode
    if (html.getAttribute('dir') === 'rtl') {
        if (value === '(') value = ')';
        else if (value === ')') value = '(';
    }
    expression.value += value;
    checkBrackets();
}

function clearDisplay() {
    expression.value = '';
    result.value = '';
    // Remove error class when clearing
    document.querySelector('.display').classList.remove('error');
    checkBrackets();
}

function deleteLast() {
    expression.value = expression.value.slice(0, -1);
    checkBrackets();
}

function sin() {
    expression.value += 'sin(';
    checkBrackets();
}

function cos() {
    expression.value += 'cos(';
    checkBrackets();
}

function tan() {
    expression.value += 'tan(';
    checkBrackets();
}

function sqrt() {
    expression.value += 'sqrt(';
    checkBrackets();
}

function power() {
    expression.value += '^';
    checkBrackets();
}

function log() {
    expression.value += 'log(';
    checkBrackets();
}

function ln() {
    expression.value += 'ln(';
    checkBrackets();
}

function pi() {
    expression.value += 'π';
    checkBrackets();
}

function checkBrackets() {
    let text = expression.value;
    let stack = [];
    let isValid = true;

    for (let char of text) {
        if (char === '(') {
            stack.push(char);
        } else if (char === ')') {
            if (stack.length === 0) {
                isValid = false;
                break;
            }
            stack.pop();
        }
    }

    if (!isValid || stack.length > 0) {
        expression.classList.add('error');
    } else {
        expression.classList.remove('error');
    }
    return isValid;
}

// إضافة دعم لوحة المفاتيح
document.addEventListener('keydown', function(event) {
    const key = event.key;
    
    if (key >= '0' && key <= '9' || key === '.' || key === '+' || key === '-' || key === '*' || key === '/' || key === '(' || key === ')') {
        addToDisplay(key);
    } else if (key === 'Enter') {
        // Check if there are unbalanced parentheses before calculating
        let text = expression.value;
        let stack = [];
        let isBalanced = true;

        for (let char of text) {
            if (char === '(') {
                stack.push(char);
            } else if (char === ')') {
                if (stack.length === 0) {
                    isBalanced = false;
                    break;
                }
                stack.pop();
            }
        }

        if (stack.length > 0) {
            isBalanced = false;
        }

        if (isBalanced) {
            calculate();
        }
    } else if (key === 'Backspace') {
        deleteLast();
    } else if (key === 'Escape') {
        clearDisplay();
    }
});

// Load history on page load
document.addEventListener('DOMContentLoaded', () => {
    updateHistoryDisplay();
    
    // Setup popup event listeners
    const confirmYes = document.getElementById('confirmYes');
    const confirmNo = document.getElementById('confirmNo');
    const popup = document.getElementById('confirmPopup');
    
    confirmYes.addEventListener('click', () => {
        calculationHistory = [];
        localStorage.removeItem('calculatorHistory');
        updateHistoryDisplay();
        const currentLang = html.getAttribute('lang') || 'ar';
        showNotification(translations[currentLang].clearHistory);
        hidePopup();
    });
    
    confirmNo.addEventListener('click', hidePopup);
    
    // Close popup when clicking outside
    popup.addEventListener('click', (e) => {
        if (e.target === popup) {
            hidePopup();
        }
    });
    
    // Close popup on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && popup.classList.contains('show')) {
            hidePopup();
        }
    });
});

// Excel Export/Import Functions
function exportToExcel() {
    const wb = XLSX.utils.book_new();
    const data = calculationHistory.map(item => ({
        Expression: item.expression,
        Result: item.result
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Calculator History");
    XLSX.writeFile(wb, "calculator_history.xlsx");
}

function importFromExcel(e) {
    const file = e.target.files[0];
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);
        
        // Create new history items with timestamps
        const newHistoryItems = jsonData.map(row => {
            if (row.Expression && row.Result) {
                return {
                    expression: row.Expression,
                    result: row.Result,
                    timestamp: Date.now()
                };
            }
            return null;
        }).filter(item => item !== null);
        
        // Add new items to history array
        calculationHistory = [...newHistoryItems, ...calculationHistory];
        
        // Keep only last 50 calculations if exceeded
        // if (calculationHistory.length > 50) {
        //     calculationHistory = calculationHistory.slice(0, 50);
        // }
        
        // Save to localStorage and update display
        localStorage.setItem('calculatorHistory', JSON.stringify(calculationHistory));
        updateHistoryDisplay();
        
        // Show success notification
        const currentLang = html.getAttribute('lang') || 'ar';
        showNotification(translations[currentLang].importFromExcel);
    };
    
    reader.readAsArrayBuffer(file);
}

// Event Listeners for Excel buttons
document.getElementById('export-xlsx').addEventListener('click', exportToExcel);

const importInput = document.createElement('input');
importInput.type = 'file';
importInput.accept = '.xlsx,.xls,.csv';
importInput.style.display = 'none';
importInput.addEventListener('change', importFromExcel);
document.body.appendChild(importInput);

document.getElementById('import-xlsx').addEventListener('click', () => {
    importInput.click();
});
