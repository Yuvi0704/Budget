/**
 * Yuvi's Monthly Money Tracker
 * A personal expense tracking application with localStorage persistence
 */

// ============================================
// Configuration & Default Data
// ============================================

const DEFAULT_EXPENSES = [
    { category: 'Rent', planned: 450, actual: 0 },
    { category: 'Utilities', planned: 50, actual: 0 },
    { category: 'Wifi', planned: 20, actual: 0 },
    { category: 'Insurance', planned: 307, actual: 0 },
    { category: 'Gas', planned: 100, actual: 0 },
    { category: 'Food', planned: 100, actual: 0 },
    { category: 'Subscriptions', planned: 65, actual: 0 },
    { category: 'Affirm 1', planned: 60, actual: 0 },
    { category: 'Affirm 2', planned: 34, actual: 0 },
    { category: 'Mobile bill', planned: 140, actual: 0 },
    { category: 'Send to India', planned: 150, actual: 0 }
];

const DEFAULT_INCOME = {
    name: 'Holiday Inn',
    amount: 1500
};

const STORAGE_KEY = 'yuvi-expense-tracker';

// Chart color palette
const CHART_COLORS = [
    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
    '#FF9F40', '#E7E9ED', '#7BC043', '#EE4035', '#0392CF',
    '#F37736'
];

// ============================================
// State Management
// ============================================

let state = {
    income: { ...DEFAULT_INCOME },
    expenses: JSON.parse(JSON.stringify(DEFAULT_EXPENSES)),
    transactions: []
};

// Charts instances
let expenseChart = null;
let comparisonChart = null;

// ============================================
// LocalStorage Functions
// ============================================

function saveToStorage() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
        console.error('Failed to save to localStorage:', e);
    }
}

function loadFromStorage() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            // Merge with defaults in case new categories were added
            state = {
                income: parsed.income || { ...DEFAULT_INCOME },
                expenses: parsed.expenses || JSON.parse(JSON.stringify(DEFAULT_EXPENSES)),
                transactions: parsed.transactions || []
            };
        }
    } catch (e) {
        console.error('Failed to load from localStorage:', e);
    }
}

// ============================================
// Utility Functions
// ============================================

function formatCurrency(amount) {
    return `$${parseFloat(amount || 0).toFixed(2)} CAD`;
}

function formatCurrencyShort(amount) {
    return `$${parseFloat(amount || 0).toFixed(2)}`;
}

function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

// ============================================
// Calculation Functions
// ============================================

function calculateTotals() {
    const totalPlanned = state.expenses.reduce((sum, exp) => sum + (parseFloat(exp.planned) || 0), 0);
    const totalActual = state.expenses.reduce((sum, exp) => sum + (parseFloat(exp.actual) || 0), 0);
    const income = parseFloat(state.income.amount) || 0;
    const moneyLeft = income - totalActual;
    const savingsRate = income > 0 ? ((moneyLeft / income) * 100) : 0;

    return {
        totalPlanned,
        totalActual,
        income,
        moneyLeft,
        savingsRate
    };
}

// ============================================
// UI Update Functions
// ============================================

function updateSummaryCards() {
    const totals = calculateTotals();

    document.getElementById('total-income').textContent = formatCurrency(totals.income);
    document.getElementById('total-expenses').textContent = formatCurrency(totals.totalActual);
    document.getElementById('money-left').textContent = formatCurrency(totals.moneyLeft);
    document.getElementById('savings-rate').textContent = `${totals.savingsRate.toFixed(1)}%`;

    // Update table totals
    document.getElementById('total-planned').textContent = formatCurrencyShort(totals.totalPlanned);
    document.getElementById('total-actual').textContent = formatCurrencyShort(totals.totalActual);
}

function renderExpenseTable() {
    const tbody = document.getElementById('expense-table-body');
    tbody.innerHTML = '';

    state.expenses.forEach((expense, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
      <td>
        <input type="text" 
               class="category-input" 
               value="${expense.category}" 
               data-index="${index}" 
               data-field="category">
      </td>
      <td>
        <input type="number" 
               class="amount-input" 
               value="${expense.planned}" 
               data-index="${index}" 
               data-field="planned"
               min="0" 
               step="0.01">
      </td>
      <td>
        <input type="number" 
               class="amount-input" 
               value="${expense.actual}" 
               data-index="${index}" 
               data-field="actual"
               min="0" 
               step="0.01">
      </td>
    `;
        tbody.appendChild(row);
    });

    // Add event listeners to table inputs
    tbody.querySelectorAll('input').forEach(input => {
        input.addEventListener('change', handleExpenseChange);
        input.addEventListener('input', handleExpenseChange);
    });
}

function renderTransactionCategoryDropdown() {
    const select = document.getElementById('transaction-category');
    select.innerHTML = '';

    state.expenses.forEach(expense => {
        const option = document.createElement('option');
        option.value = expense.category;
        option.textContent = expense.category;
        select.appendChild(option);
    });
}

function renderTransactionList() {
    const listContainer = document.getElementById('transaction-list');

    if (state.transactions.length === 0) {
        listContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">📝</div>
        <p>No transactions logged yet</p>
      </div>
    `;
        return;
    }

    // Sort transactions by date (newest first)
    const sortedTransactions = [...state.transactions].sort((a, b) =>
        new Date(b.date) - new Date(a.date)
    );

    listContainer.innerHTML = sortedTransactions.map((transaction, index) => `
    <div class="transaction-item">
      <div class="transaction-item__info">
        <span class="transaction-item__date">${formatDate(transaction.date)}</span>
        <span class="transaction-item__category">${transaction.category}</span>
      </div>
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <span class="transaction-item__amount">${formatCurrencyShort(transaction.amount)}</span>
        <button class="transaction-item__delete" data-id="${transaction.id}" title="Delete">×</button>
      </div>
    </div>
  `).join('');

    // Add delete event listeners
    listContainer.querySelectorAll('.transaction-item__delete').forEach(btn => {
        btn.addEventListener('click', handleDeleteTransaction);
    });
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ============================================
// Chart Functions
// ============================================

function updateCharts() {
    updateExpenseChart();
    updateComparisonChart();
}

function updateExpenseChart() {
    const ctx = document.getElementById('expense-chart').getContext('2d');

    // Filter out expenses with 0 actual amount
    const expensesWithValues = state.expenses.filter(exp => parseFloat(exp.actual) > 0);

    const data = {
        labels: expensesWithValues.map(exp => exp.category),
        datasets: [{
            data: expensesWithValues.map(exp => parseFloat(exp.actual)),
            backgroundColor: CHART_COLORS.slice(0, expensesWithValues.length),
            borderWidth: 2,
            borderColor: '#ffffff'
        }]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    padding: 15,
                    usePointStyle: true,
                    font: {
                        family: "'Inter', sans-serif",
                        size: 11
                    }
                }
            },
            tooltip: {
                callbacks: {
                    label: function (context) {
                        const value = context.raw;
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        const percentage = ((value / total) * 100).toFixed(1);
                        return `${context.label}: $${value.toFixed(2)} (${percentage}%)`;
                    }
                }
            }
        }
    };

    if (expenseChart) {
        expenseChart.data = data;
        expenseChart.update();
    } else {
        expenseChart = new Chart(ctx, {
            type: 'doughnut',
            data: data,
            options: options
        });
    }
}

function updateComparisonChart() {
    const ctx = document.getElementById('comparison-chart').getContext('2d');

    const data = {
        labels: state.expenses.map(exp => exp.category),
        datasets: [
            {
                label: 'Planned',
                data: state.expenses.map(exp => parseFloat(exp.planned)),
                backgroundColor: 'rgba(102, 126, 234, 0.7)',
                borderColor: 'rgba(102, 126, 234, 1)',
                borderWidth: 1
            },
            {
                label: 'Actual',
                data: state.expenses.map(exp => parseFloat(exp.actual)),
                backgroundColor: 'rgba(255, 99, 132, 0.7)',
                borderColor: 'rgba(255, 99, 132, 1)',
                borderWidth: 1
            }
        ]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: true,
        indexAxis: 'y',
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    padding: 15,
                    usePointStyle: true,
                    font: {
                        family: "'Inter', sans-serif",
                        size: 11
                    }
                }
            },
            tooltip: {
                callbacks: {
                    label: function (context) {
                        return `${context.dataset.label}: $${context.raw.toFixed(2)}`;
                    }
                }
            }
        },
        scales: {
            x: {
                beginAtZero: true,
                grid: {
                    display: true,
                    color: 'rgba(0, 0, 0, 0.05)'
                },
                ticks: {
                    callback: function (value) {
                        return '$' + value;
                    },
                    font: {
                        family: "'Inter', sans-serif",
                        size: 10
                    }
                }
            },
            y: {
                grid: {
                    display: false
                },
                ticks: {
                    font: {
                        family: "'Inter', sans-serif",
                        size: 10
                    }
                }
            }
        }
    };

    if (comparisonChart) {
        comparisonChart.data = data;
        comparisonChart.update();
    } else {
        comparisonChart = new Chart(ctx, {
            type: 'bar',
            data: data,
            options: options
        });
    }
}

// ============================================
// Event Handlers
// ============================================

function handleIncomeChange() {
    state.income.name = document.getElementById('income-name').value;
    state.income.amount = parseFloat(document.getElementById('income-amount').value) || 0;

    updateSummaryCards();
    saveToStorage();
}

function handleExpenseChange(event) {
    const index = parseInt(event.target.dataset.index);
    const field = event.target.dataset.field;

    if (field === 'category') {
        state.expenses[index].category = event.target.value;
        renderTransactionCategoryDropdown();
    } else {
        state.expenses[index][field] = parseFloat(event.target.value) || 0;
    }

    updateSummaryCards();
    updateCharts();
    saveToStorage();
}

function handleAddTransaction() {
    const date = document.getElementById('transaction-date').value;
    const category = document.getElementById('transaction-category').value;
    const amount = parseFloat(document.getElementById('transaction-amount').value);

    if (!date || !category || !amount || amount <= 0) {
        alert('Please fill in all fields with valid values.');
        return;
    }

    // Create transaction
    const transaction = {
        id: Date.now(),
        date,
        category,
        amount
    };

    state.transactions.push(transaction);

    // Update actual expense for category
    const expenseIndex = state.expenses.findIndex(exp => exp.category === category);
    if (expenseIndex !== -1) {
        state.expenses[expenseIndex].actual =
            (parseFloat(state.expenses[expenseIndex].actual) || 0) + amount;
    }

    // Clear form
    document.getElementById('transaction-amount').value = '';
    document.getElementById('transaction-date').value = getTodayDate();

    // Update UI
    renderExpenseTable();
    renderTransactionList();
    updateSummaryCards();
    updateCharts();
    saveToStorage();
}

function handleDeleteTransaction(event) {
    const transactionId = parseInt(event.target.dataset.id);
    const transaction = state.transactions.find(t => t.id === transactionId);

    if (!transaction) return;

    // Subtract amount from category actual
    const expenseIndex = state.expenses.findIndex(exp => exp.category === transaction.category);
    if (expenseIndex !== -1) {
        state.expenses[expenseIndex].actual = Math.max(
            0,
            (parseFloat(state.expenses[expenseIndex].actual) || 0) - transaction.amount
        );
    }

    // Remove transaction
    state.transactions = state.transactions.filter(t => t.id !== transactionId);

    // Update UI
    renderExpenseTable();
    renderTransactionList();
    updateSummaryCards();
    updateCharts();
    saveToStorage();
}

function handleResetMonth() {
    if (!confirm('Are you sure you want to reset the month? This will clear all actual values and transactions, but keep your planned budget.')) {
        return;
    }

    // Reset actual values
    state.expenses.forEach(expense => {
        expense.actual = 0;
    });

    // Clear transactions
    state.transactions = [];

    // Update UI
    renderExpenseTable();
    renderTransactionList();
    updateSummaryCards();
    updateCharts();
    saveToStorage();
}

// ============================================
// Initialization
// ============================================

function init() {
    // Load saved data
    loadFromStorage();

    // Set initial income values
    document.getElementById('income-name').value = state.income.name;
    document.getElementById('income-amount').value = state.income.amount;

    // Set today's date for transaction form
    document.getElementById('transaction-date').value = getTodayDate();

    // Render UI
    renderExpenseTable();
    renderTransactionCategoryDropdown();
    renderTransactionList();
    updateSummaryCards();

    // Wait for DOM to be fully ready before initializing charts
    setTimeout(() => {
        updateCharts();
    }, 100);

    // Add event listeners
    document.getElementById('income-name').addEventListener('change', handleIncomeChange);
    document.getElementById('income-amount').addEventListener('change', handleIncomeChange);
    document.getElementById('income-amount').addEventListener('input', handleIncomeChange);

    document.getElementById('add-transaction-btn').addEventListener('click', handleAddTransaction);
    document.getElementById('reset-month-btn').addEventListener('click', handleResetMonth);

    // Also handle Enter key in transaction form
    document.getElementById('transaction-amount').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleAddTransaction();
        }
    });
}

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', init);
