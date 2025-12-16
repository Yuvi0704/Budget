/* ================================
   Yuvi Monthly Budget Tracker - JavaScript
   ================================ */

// Storage keys
const STORAGE_KEYS = {
    income: 'yuviBudget_income',
    planned: 'yuviBudget_planned',
    actual: 'yuviBudget_actual',
    transactions: 'yuviBudget_transactions'
};

// Budget categories
const CATEGORIES = [
    { id: 'housing', name: '🏠 Housing/Rent', color: '#FF6384' },
    { id: 'utilities', name: '💡 Utilities', color: '#36A2EB' },
    { id: 'groceries', name: '🛒 Groceries', color: '#FFCE56' },
    { id: 'transport', name: '🚗 Transportation', color: '#4BC0C0' },
    { id: 'insurance', name: '🛡️ Insurance', color: '#9966FF' },
    { id: 'healthcare', name: '🏥 Healthcare', color: '#FF9F40' },
    { id: 'entertainment', name: '🎮 Entertainment', color: '#FF6384' },
    { id: 'dining', name: '🍽️ Dining Out', color: '#C9CBCF' },
    { id: 'subscriptions', name: '📺 Subscriptions', color: '#4BC0C0' },
    { id: 'savings', name: '💰 Savings', color: '#36A2EB' },
    { id: 'other', name: '📦 Other', color: '#9966FF' }
];

// Chart instances
let expenseChart = null;
let comparisonChart = null;

// ================================
// Initialization
// ================================

document.addEventListener('DOMContentLoaded', function () {
    // Check authentication
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true' ||
        sessionStorage.getItem('isLoggedIn') === 'true';

    if (!isLoggedIn) {
        window.location.href = 'index.html';
        return;
    }

    initializeApp();
});

function initializeApp() {
    displayCurrentMonth();
    initializeBudgetTable();
    initializeTransactionForm();
    loadAllData();
    setupEventListeners();
    initializeCharts();
    updateAllDisplays();
}

// ================================
// Data Management
// ================================

function getIncome() {
    return parseFloat(localStorage.getItem(STORAGE_KEYS.income)) || 0;
}

function saveIncome(amount) {
    localStorage.setItem(STORAGE_KEYS.income, amount.toString());
}

function getPlannedExpenses() {
    const stored = localStorage.getItem(STORAGE_KEYS.planned);
    return stored ? JSON.parse(stored) : {};
}

function savePlannedExpenses(data) {
    localStorage.setItem(STORAGE_KEYS.planned, JSON.stringify(data));
}

function getActualExpenses() {
    const stored = localStorage.getItem(STORAGE_KEYS.actual);
    return stored ? JSON.parse(stored) : {};
}

function saveActualExpenses(data) {
    localStorage.setItem(STORAGE_KEYS.actual, JSON.stringify(data));
}

function getTransactions() {
    const stored = localStorage.getItem(STORAGE_KEYS.transactions);
    return stored ? JSON.parse(stored) : [];
}

function saveTransactions(data) {
    localStorage.setItem(STORAGE_KEYS.transactions, JSON.stringify(data));
}

// ================================
// UI Initialization
// ================================

function displayCurrentMonth() {
    const now = new Date();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    document.getElementById('monthDisplay').textContent =
        `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
}

function initializeBudgetTable() {
    const tbody = document.getElementById('budgetTableBody');
    tbody.innerHTML = CATEGORIES.map(cat => `
        <tr data-category="${cat.id}">
            <td class="category-cell">${cat.name}</td>
            <td>
                <div class="amount-input-wrapper">
                    <span class="currency">$</span>
                    <input type="number" class="planned-input" data-category="${cat.id}" 
                           placeholder="0.00" min="0" step="0.01">
                </div>
            </td>
            <td>
                <div class="amount-input-wrapper">
                    <span class="currency">$</span>
                    <input type="number" class="actual-input" data-category="${cat.id}" 
                           placeholder="0.00" min="0" step="0.01">
                </div>
            </td>
            <td class="diff-cell" data-category="${cat.id}">$0.00</td>
        </tr>
    `).join('');
}

function initializeTransactionForm() {
    const select = document.getElementById('txCategory');
    select.innerHTML = CATEGORIES.map(cat =>
        `<option value="${cat.id}">${cat.name}</option>`
    ).join('');

    // Set default date to today
    document.getElementById('txDate').valueAsDate = new Date();
}

function loadAllData() {
    // Load income
    const income = getIncome();
    document.getElementById('incomeInput').value = income || '';

    // Load planned expenses
    const planned = getPlannedExpenses();
    document.querySelectorAll('.planned-input').forEach(input => {
        const catId = input.dataset.category;
        if (planned[catId]) {
            input.value = planned[catId];
        }
    });

    // Load actual expenses
    const actual = getActualExpenses();
    document.querySelectorAll('.actual-input').forEach(input => {
        const catId = input.dataset.category;
        if (actual[catId]) {
            input.value = actual[catId];
        }
    });

    // Load transactions
    renderTransactions();
}

// ================================
// Event Listeners
// ================================

function setupEventListeners() {
    // Save income
    document.getElementById('saveIncomeBtn').addEventListener('click', function () {
        const value = parseFloat(document.getElementById('incomeInput').value) || 0;
        saveIncome(value);
        updateAllDisplays();
    });

    // Planned expense inputs
    document.querySelectorAll('.planned-input').forEach(input => {
        input.addEventListener('change', function () {
            const planned = getPlannedExpenses();
            planned[this.dataset.category] = parseFloat(this.value) || 0;
            savePlannedExpenses(planned);
            updateAllDisplays();
        });
    });

    // Actual expense inputs
    document.querySelectorAll('.actual-input').forEach(input => {
        input.addEventListener('change', function () {
            const actual = getActualExpenses();
            actual[this.dataset.category] = parseFloat(this.value) || 0;
            saveActualExpenses(actual);
            updateAllDisplays();
        });
    });

    // Add transaction
    document.getElementById('addTxBtn').addEventListener('click', addTransaction);

    // Reset month
    document.getElementById('resetMonthBtn').addEventListener('click', resetMonth);

    // Export buttons
    document.getElementById('exportExcelBtn').addEventListener('click', exportToExcel);
    document.getElementById('exportCsvBtn').addEventListener('click', exportToCSV);
}

// ================================
// Transaction Management
// ================================

function addTransaction() {
    const date = document.getElementById('txDate').value;
    const category = document.getElementById('txCategory').value;
    const amount = parseFloat(document.getElementById('txAmount').value) || 0;
    const notes = document.getElementById('txNotes').value.trim();

    if (!date || amount <= 0) {
        alert('Please enter a valid date and amount');
        return;
    }

    const transactions = getTransactions();
    transactions.unshift({
        id: Date.now(),
        date,
        category,
        amount,
        notes
    });
    saveTransactions(transactions);

    // Update actual expenses
    const actual = getActualExpenses();
    actual[category] = (actual[category] || 0) + amount;
    saveActualExpenses(actual);

    // Update actual input field
    const actualInput = document.querySelector(`.actual-input[data-category="${category}"]`);
    if (actualInput) {
        actualInput.value = actual[category].toFixed(2);
    }

    // Clear form
    document.getElementById('txAmount').value = '';
    document.getElementById('txNotes').value = '';
    document.getElementById('txDate').valueAsDate = new Date();

    renderTransactions();
    updateAllDisplays();
}

function deleteTransaction(id) {
    let transactions = getTransactions();
    const tx = transactions.find(t => t.id === id);

    if (tx) {
        // Subtract from actual expenses
        const actual = getActualExpenses();
        actual[tx.category] = Math.max(0, (actual[tx.category] || 0) - tx.amount);
        saveActualExpenses(actual);

        // Update actual input field
        const actualInput = document.querySelector(`.actual-input[data-category="${tx.category}"]`);
        if (actualInput) {
            actualInput.value = actual[tx.category].toFixed(2);
        }
    }

    transactions = transactions.filter(t => t.id !== id);
    saveTransactions(transactions);
    renderTransactions();
    updateAllDisplays();
}

function renderTransactions() {
    const transactions = getTransactions();
    const container = document.getElementById('transactionsList');

    if (transactions.length === 0) {
        container.innerHTML = '<p class="no-transactions">No transactions logged yet</p>';
        return;
    }

    container.innerHTML = transactions.slice(0, 10).map(tx => {
        const cat = CATEGORIES.find(c => c.id === tx.category);
        return `
            <div class="transaction-item">
                <div class="tx-info">
                    <span class="tx-category">${cat ? cat.name : tx.category}</span>
                    <span class="tx-date">${formatDate(tx.date)}</span>
                    ${tx.notes ? `<span class="tx-notes">${escapeHtml(tx.notes)}</span>` : ''}
                </div>
                <div class="tx-amount">-$${tx.amount.toFixed(2)}</div>
                <button class="tx-delete" onclick="deleteTransaction(${tx.id})">✕</button>
            </div>
        `;
    }).join('');

    if (transactions.length > 10) {
        container.innerHTML += `<p class="more-transactions">...and ${transactions.length - 10} more</p>`;
    }
}

// ================================
// Display Updates
// ================================

function updateAllDisplays() {
    const income = getIncome();
    const planned = getPlannedExpenses();
    const actual = getActualExpenses();

    // Calculate totals
    let totalPlanned = 0;
    let totalActual = 0;

    CATEGORIES.forEach(cat => {
        const plannedVal = planned[cat.id] || 0;
        const actualVal = actual[cat.id] || 0;
        totalPlanned += plannedVal;
        totalActual += actualVal;

        // Update difference cell
        const diff = plannedVal - actualVal;
        const diffCell = document.querySelector(`.diff-cell[data-category="${cat.id}"]`);
        if (diffCell) {
            diffCell.textContent = formatCurrency(diff);
            diffCell.className = `diff-cell ${diff >= 0 ? 'positive' : 'negative'}`;
        }
    });

    const moneyLeft = income - totalActual;
    const savingsRate = income > 0 ? ((moneyLeft / income) * 100).toFixed(1) : 0;

    // Update summary cards
    document.getElementById('totalIncome').textContent = formatCurrency(income);
    document.getElementById('totalPlanned').textContent = formatCurrency(totalPlanned);
    document.getElementById('totalActual').textContent = formatCurrency(totalActual);

    const moneyLeftEl = document.getElementById('moneyLeft');
    moneyLeftEl.textContent = formatCurrency(moneyLeft);
    moneyLeftEl.className = `card-value ${moneyLeft >= 0 ? 'positive' : 'negative'}`;

    // Update table totals
    document.getElementById('tableTotalPlanned').textContent = formatCurrency(totalPlanned);
    document.getElementById('tableTotalActual').textContent = formatCurrency(totalActual);

    const totalDiff = totalPlanned - totalActual;
    const tableTotalDiff = document.getElementById('tableTotalDiff');
    tableTotalDiff.textContent = formatCurrency(totalDiff);
    tableTotalDiff.className = totalDiff >= 0 ? 'positive' : 'negative';

    // Update charts
    updateCharts();
}

// ================================
// Charts
// ================================

function initializeCharts() {
    const expenseCtx = document.getElementById('expenseChart').getContext('2d');
    const comparisonCtx = document.getElementById('comparisonChart').getContext('2d');

    expenseChart = new Chart(expenseCtx, {
        type: 'doughnut',
        data: {
            labels: CATEGORIES.map(c => c.name.replace(/^\S+\s/, '')),
            datasets: [{
                data: CATEGORIES.map(() => 0),
                backgroundColor: CATEGORIES.map(c => c.color),
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: '#a0a0a0', font: { size: 11 } }
                },
                title: {
                    display: true,
                    text: 'Actual Expenses by Category',
                    color: '#ffffff',
                    font: { size: 14 }
                }
            }
        }
    });

    comparisonChart = new Chart(comparisonCtx, {
        type: 'bar',
        data: {
            labels: CATEGORIES.map(c => c.name.replace(/^\S+\s/, '').substring(0, 8)),
            datasets: [
                {
                    label: 'Planned',
                    data: CATEGORIES.map(() => 0),
                    backgroundColor: 'rgba(77, 163, 255, 0.7)',
                    borderRadius: 4
                },
                {
                    label: 'Actual',
                    data: CATEGORIES.map(() => 0),
                    backgroundColor: 'rgba(255, 99, 132, 0.7)',
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#a0a0a0' }
                },
                title: {
                    display: true,
                    text: 'Planned vs Actual',
                    color: '#ffffff',
                    font: { size: 14 }
                }
            },
            scales: {
                x: {
                    ticks: { color: '#666', font: { size: 10 } },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                },
                y: {
                    ticks: { color: '#a0a0a0' },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                }
            }
        }
    });
}

function updateCharts() {
    const actual = getActualExpenses();
    const planned = getPlannedExpenses();

    // Update expense chart
    expenseChart.data.datasets[0].data = CATEGORIES.map(c => actual[c.id] || 0);
    expenseChart.update();

    // Update comparison chart
    comparisonChart.data.datasets[0].data = CATEGORIES.map(c => planned[c.id] || 0);
    comparisonChart.data.datasets[1].data = CATEGORIES.map(c => actual[c.id] || 0);
    comparisonChart.update();
}

// ================================
// Reset Month
// ================================

function resetMonth() {
    if (!confirm('This will clear all actual expenses and transactions for the current month. Planned expenses will be kept. Continue?')) {
        return;
    }

    // Clear actual expenses
    localStorage.removeItem(STORAGE_KEYS.actual);
    localStorage.removeItem(STORAGE_KEYS.transactions);

    // Clear actual inputs
    document.querySelectorAll('.actual-input').forEach(input => {
        input.value = '';
    });

    renderTransactions();
    updateAllDisplays();
}

// ================================
// Export Functions
// ================================

function getExportData() {
    const income = getIncome();
    const planned = getPlannedExpenses();
    const actual = getActualExpenses();
    const transactions = getTransactions();

    let totalPlanned = 0;
    let totalActual = 0;

    const budgetData = CATEGORIES.map(cat => {
        const plannedVal = planned[cat.id] || 0;
        const actualVal = actual[cat.id] || 0;
        totalPlanned += plannedVal;
        totalActual += actualVal;

        return {
            category: cat.name.replace(/^\S+\s/, ''), // Remove emoji
            planned: plannedVal,
            actual: actualVal,
            difference: plannedVal - actualVal
        };
    });

    const moneyLeft = income - totalActual;
    const savingsRate = income > 0 ? ((moneyLeft / income) * 100).toFixed(1) : '0.0';

    return {
        income,
        totalPlanned,
        totalActual,
        moneyLeft,
        savingsRate,
        budgetData,
        transactions
    };
}

function generateFilename(extension) {
    const now = new Date();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    const month = monthNames[now.getMonth()];
    const year = now.getFullYear();
    return `Yuvi_Monthly_Budget_${month}_${year}.${extension}`;
}

function exportToExcel() {
    const data = getExportData();
    const wb = XLSX.utils.book_new();

    // Sheet 1: Summary
    const summaryData = [
        ['Monthly Budget Summary'],
        [''],
        ['Metric', 'Value'],
        ['Total Income', `$${data.income.toFixed(2)}`],
        ['Total Planned Expenses', `$${data.totalPlanned.toFixed(2)}`],
        ['Total Actual Expenses', `$${data.totalActual.toFixed(2)}`],
        ['Money Left', `$${data.moneyLeft.toFixed(2)}`],
        ['Savings Rate', `${data.savingsRate}%`]
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary['!cols'] = [{ wch: 25 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

    // Sheet 2: Monthly Budget
    const budgetSheetData = [
        ['Category', 'Planned', 'Actual', 'Difference'],
        ...data.budgetData.map(row => [
            row.category,
            row.planned,
            row.actual,
            row.difference
        ]),
        ['', '', '', ''],
        ['TOTAL', data.totalPlanned, data.totalActual, data.totalPlanned - data.totalActual]
    ];
    const wsBudget = XLSX.utils.aoa_to_sheet(budgetSheetData);
    wsBudget['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsBudget, 'Monthly Budget');

    // Sheet 3: Transactions
    const txData = [
        ['Date', 'Category', 'Amount', 'Notes'],
        ...data.transactions.map(tx => {
            const cat = CATEGORIES.find(c => c.id === tx.category);
            return [
                tx.date,
                cat ? cat.name.replace(/^\S+\s/, '') : tx.category,
                tx.amount,
                tx.notes || ''
            ];
        })
    ];
    const wsTx = XLSX.utils.aoa_to_sheet(txData);
    wsTx['!cols'] = [{ wch: 12 }, { wch: 20 }, { wch: 12 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, wsTx, 'Transactions');

    // Generate and download file
    XLSX.writeFile(wb, generateFilename('xlsx'));
}

function exportToCSV() {
    const data = getExportData();

    // Create CSV content for Monthly Budget
    let csv = 'Category,Planned,Actual,Difference\n';
    data.budgetData.forEach(row => {
        csv += `"${row.category}",${row.planned.toFixed(2)},${row.actual.toFixed(2)},${row.difference.toFixed(2)}\n`;
    });
    csv += `"TOTAL",${data.totalPlanned.toFixed(2)},${data.totalActual.toFixed(2)},${(data.totalPlanned - data.totalActual).toFixed(2)}\n`;

    // Create and download file
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = generateFilename('csv');
    link.click();
    URL.revokeObjectURL(link.href);
}

// ================================
// Utility Functions
// ================================

function formatCurrency(amount) {
    return '$' + Math.abs(amount).toFixed(2);
}

function formatDate(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
