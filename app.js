/**
 * Yuvi's Daily Expense Tracker — app.js
 * Vanilla JS, localStorage, Chart.js, jsPDF, SheetJS
 */

'use strict';

// ============================================================
// Constants
// ============================================================

const STORAGE_KEY = 'yuvi-daily-expenses-v2';

const CATEGORIES = [
  'Rent', 'Utilities', 'Wifi', 'Insurance', 'Gas',
  'Food', 'Groceries', 'Eating Out', 'Subscriptions',
  'Mobile Bill', 'Transport', 'Shopping', 'Send to India',
  'Affirm', 'Miscellaneous'
];

const CHART_COLORS = [
  '#6c63ff','#10b981','#f59e0b','#ec4899','#3b82f6',
  '#14b8a6','#ef4444','#a855f7','#f97316','#84cc16',
  '#06b6d4','#8b5cf6','#d946ef','#0ea5e9','#22c55e'
];

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

// ============================================================
// State
// ============================================================

let entries = [];           // all expense entries
let viewMode = 'today';     // 'today' | 'all'
let selectedMonth = '';     // 'YYYY-MM'
let editingId = null;       // id of entry being edited in modal

let donutChart = null;
let barChart   = null;

// ============================================================
// LocalStorage
// ============================================================

function saveEntries() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (e) {
    console.error('Save failed:', e);
  }
}

function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    entries = raw ? JSON.parse(raw) : [];
  } catch (e) {
    entries = [];
  }
}

// ============================================================
// Utility
// ============================================================

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function getTodayString() {
  // Returns YYYY-MM-DD in local timezone
  const d = new Date();
  return localDateString(d);
}

function localDateString(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getCurrentTimeString() {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${min}`;
}

function formatCAD(amount) {
  return '$' + parseFloat(amount || 0).toFixed(2) + ' CAD';
}

function formatShort(amount) {
  return '$' + parseFloat(amount || 0).toFixed(2);
}

function formatDateDisplay(dateStr) {
  // dateStr = 'YYYY-MM-DD'
  const [y, m, d] = dateStr.split('-');
  return `${MONTH_NAMES[parseInt(m,10)-1].slice(0,3)} ${parseInt(d,10)}, ${y}`;
}

function getMonthKey(dateStr) {
  // 'YYYY-MM-DD' → 'YYYY-MM'
  return dateStr.slice(0, 7);
}

function getMonthLabel(ym) {
  // 'YYYY-MM' → 'April 2026'
  const [y, m] = ym.split('-');
  return `${MONTH_NAMES[parseInt(m,10)-1]} ${y}`;
}

function getEntriesForMonth(ym) {
  return entries.filter(e => getMonthKey(e.date) === ym);
}

function getEntriesForToday() {
  return entries.filter(e => e.date === getTodayString());
}

function showToast(msg, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = 'toast' + (type ? ' toast--' + type : '');
  // force reflow
  void toast.offsetWidth;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2800);
}

// ============================================================
// Month Selector Population
// ============================================================

function buildMonthOptions() {
  const allMonths = new Set(entries.map(e => getMonthKey(e.date)));

  // Always include current month
  const now = new Date();
  const curYM = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  allMonths.add(curYM);

  // Sort descending
  const sorted = [...allMonths].sort((a,b) => b.localeCompare(a));

  const sel = document.getElementById('report-month-select');
  const current = sel.value;

  sel.innerHTML = sorted.map(ym =>
    `<option value="${ym}">${getMonthLabel(ym)}</option>`
  ).join('');

  // Restore selection or default to current month
  if (sorted.includes(current)) {
    sel.value = current;
    selectedMonth = current;
  } else {
    sel.value = sorted[0] || curYM;
    selectedMonth = sel.value;
  }
}

// ============================================================
// Summary Cards (live)
// ============================================================

function updateSummaryCards() {
  const today = getTodayString();
  const now = new Date();
  const curYM = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;

  const todayEntries = entries.filter(e => e.date === today);
  const monthEntries = entries.filter(e => getMonthKey(e.date) === curYM);

  const todayTotal = todayEntries.reduce((s, e) => s + e.amount, 0);
  const monthTotal = monthEntries.reduce((s, e) => s + e.amount, 0);

  const activeDays = new Set(monthEntries.map(e => e.date)).size;
  const avgDaily = activeDays > 0 ? monthTotal / activeDays : 0;

  document.getElementById('stat-today-total').textContent = formatCAD(todayTotal);
  document.getElementById('stat-today-count').textContent = todayEntries.length;
  document.getElementById('stat-month-total').textContent = formatCAD(monthTotal);
  document.getElementById('stat-avg-daily').textContent   = formatCAD(avgDaily);
}

// ============================================================
// Entry List Rendering
// ============================================================

function renderEntryList() {
  const list = document.getElementById('entry-list');
  const btn  = document.getElementById('view-toggle-btn');

  let filtered;
  if (viewMode === 'today') {
    filtered = entries.filter(e => e.date === getTodayString());
    btn.textContent = 'View All';
    document.querySelector('#today-section .section__title').textContent = "Today's Expenses";
  } else {
    filtered = [...entries];
    btn.textContent = 'View Today';
    document.querySelector('#today-section .section__title').textContent = 'All Expenses';
  }

  // Newest first (by date+time)
  filtered.sort((a, b) => {
    const da = a.date + 'T' + a.time;
    const db = b.date + 'T' + b.time;
    return db.localeCompare(da);
  });

  if (filtered.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <span class="empty-state__emoji">📭</span>
        <p>${viewMode === 'today' ? 'No expenses logged today yet.' : 'No expenses saved yet.'}</p>
      </div>`;
    return;
  }

  list.innerHTML = filtered.map(e => buildEntryCardHTML(e)).join('');

  // Attach events
  list.querySelectorAll('.icon-btn--edit').forEach(btn => {
    btn.addEventListener('click', () => openEditModal(btn.dataset.id));
  });
  list.querySelectorAll('.icon-btn--del').forEach(btn => {
    btn.addEventListener('click', () => deleteEntry(btn.dataset.id));
  });
}

function buildEntryCardHTML(e) {
  const paymentIcon = {
    'Cash': '💵', 'Debit': '💳', 'Credit Card': '💳',
    'Bank Transfer': '🏦', 'Other': '💰'
  }[e.payment] || '💰';

  return `
    <div class="entry-card" data-id="${e.id}">
      <div class="entry-card__left">
        <div class="entry-card__title">${escHtml(e.title)}</div>
        <div class="entry-card__meta">
          <span class="entry-card__badge">${escHtml(e.category)}</span>
          <span>📅 ${formatDateDisplay(e.date)}</span>
          <span>🕐 ${e.time}</span>
          <span>${paymentIcon} ${escHtml(e.payment)}</span>
        </div>
        ${e.notes ? `<div class="entry-card__notes">📝 ${escHtml(e.notes)}</div>` : ''}
      </div>
      <div class="entry-card__right">
        <div class="entry-card__amount">${formatShort(e.amount)}</div>
        <div class="entry-card__btns">
          <button class="icon-btn icon-btn--edit" data-id="${e.id}" aria-label="Edit expense" title="Edit">✏️</button>
          <button class="icon-btn icon-btn--del"  data-id="${e.id}" aria-label="Delete expense" title="Delete">🗑️</button>
        </div>
      </div>
    </div>`;
}

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ============================================================
// Monthly Report
// ============================================================

function renderReport() {
  const monthEntries = getEntriesForMonth(selectedMonth);

  const total  = monthEntries.reduce((s, e) => s + e.amount, 0);
  const count  = monthEntries.length;
  const days   = new Set(monthEntries.map(e => e.date));
  const activeDays = days.size;
  const avgDaily   = activeDays > 0 ? total / activeDays : 0;

  // Top category
  const catMap = {};
  monthEntries.forEach(e => {
    catMap[e.category] = (catMap[e.category] || 0) + e.amount;
  });
  const topCat = Object.entries(catMap).sort((a,b) => b[1]-a[1])[0];

  document.getElementById('report-total').textContent   = formatShort(total);
  document.getElementById('report-entries').textContent = count;
  document.getElementById('report-top-cat').textContent = topCat ? topCat[0] : '—';
  document.getElementById('report-avg').textContent     = formatShort(avgDaily);
  document.getElementById('report-days').textContent    = activeDays;

  // Last 5 entries
  const last5Container = document.getElementById('report-last5');
  const last5Wrap      = document.getElementById('report-last5-wrap');

  if (monthEntries.length === 0) {
    last5Container.innerHTML = `
      <div class="empty-state">
        <span class="empty-state__emoji">📊</span>
        <p>No expenses for ${getMonthLabel(selectedMonth)}.</p>
      </div>`;
  } else {
    const sorted5 = [...monthEntries]
      .sort((a,b) => (b.date+'T'+b.time).localeCompare(a.date+'T'+a.time))
      .slice(0, 5);
    last5Container.innerHTML = sorted5.map(e => buildEntryCardHTML(e)).join('');

    // Attach edit/delete inside report section
    last5Container.querySelectorAll('.icon-btn--edit').forEach(b => {
      b.addEventListener('click', () => openEditModal(b.dataset.id));
    });
    last5Container.querySelectorAll('.icon-btn--del').forEach(b => {
      b.addEventListener('click', () => deleteEntry(b.dataset.id));
    });
  }

  updateCharts(monthEntries, selectedMonth);
}

// ============================================================
// Charts
// ============================================================

function updateCharts(monthEntries, ym) {
  updateDonutChart(monthEntries);
  updateBarChart(monthEntries, ym);
}

function updateDonutChart(monthEntries) {
  const ctx = document.getElementById('donut-chart').getContext('2d');

  const catMap = {};
  monthEntries.forEach(e => {
    catMap[e.category] = (catMap[e.category] || 0) + e.amount;
  });

  const labels = Object.keys(catMap);
  const data   = Object.values(catMap);
  const colors = labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]);

  const chartData = {
    labels,
    datasets: [{
      data,
      backgroundColor: colors,
      borderWidth: 2,
      borderColor: '#ffffff',
      hoverOffset: 6
    }]
  };

  const opts = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 10,
          usePointStyle: true,
          font: { family: "'Inter', sans-serif", size: 10 }
        }
      },
      tooltip: {
        callbacks: {
          label(ctx) {
            const total = ctx.dataset.data.reduce((a,b)=>a+b,0);
            const pct = total > 0 ? ((ctx.raw/total)*100).toFixed(1) : 0;
            return ` ${ctx.label}: ${formatShort(ctx.raw)} (${pct}%)`;
          }
        }
      }
    }
  };

  if (donutChart) {
    donutChart.data = chartData;
    donutChart.update();
  } else {
    donutChart = new Chart(ctx, { type: 'doughnut', data: chartData, options: opts });
  }
}

function updateBarChart(monthEntries, ym) {
  const ctx = document.getElementById('bar-chart').getContext('2d');

  // Build day-by-day totals for the month
  const [year, mon] = ym.split('-').map(Number);
  const daysInMonth = new Date(year, mon, 0).getDate();

  const dayTotals = {};
  for (let d = 1; d <= daysInMonth; d++) {
    dayTotals[d] = 0;
  }
  monthEntries.forEach(e => {
    const day = parseInt(e.date.split('-')[2], 10);
    dayTotals[day] = (dayTotals[day] || 0) + e.amount;
  });

  // Only include days with data to keep chart clean (max 31 labels otherwise cluttered)
  const labels = Object.keys(dayTotals).map(d => `${MONTH_NAMES[mon-1].slice(0,3)} ${d}`);
  const data   = Object.values(dayTotals);

  const chartData = {
    labels,
    datasets: [{
      label: 'Spent (CAD)',
      data,
      backgroundColor: 'rgba(108,99,255,0.75)',
      borderColor: 'rgba(108,99,255,1)',
      borderWidth: 1.5,
      borderRadius: 4
    }]
  };

  const opts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label(ctx) { return ` ${formatShort(ctx.raw)}`; }
        }
      }
    },
    scales: {
      x: {
        ticks: {
          font: { family: "'Inter', sans-serif", size: 9 },
          maxRotation: 60,
          autoSkip: true,
          maxTicksLimit: 15
        },
        grid: { display: false }
      },
      y: {
        beginAtZero: true,
        ticks: {
          callback: v => '$'+v,
          font: { family: "'Inter', sans-serif", size: 10 }
        },
        grid: { color: 'rgba(0,0,0,0.05)' }
      }
    }
  };

  if (barChart) {
    barChart.data = chartData;
    barChart.options = opts;
    barChart.update();
  } else {
    barChart = new Chart(ctx, { type: 'bar', data: chartData, options: opts });
  }
}

// ============================================================
// Add / Edit Expense
// ============================================================

function handleAddExpense(e) {
  e.preventDefault();

  const title    = document.getElementById('field-title').value.trim();
  const amountRaw = parseFloat(document.getElementById('field-amount').value);
  const category = document.getElementById('field-category').value;
  const payment  = document.getElementById('field-payment').value;
  const date     = document.getElementById('field-date').value;
  const time     = document.getElementById('field-time').value;
  const notes    = document.getElementById('field-notes').value.trim();

  if (!title) { showToast('Please enter an expense title.', 'error'); return; }
  if (!amountRaw || amountRaw <= 0) { showToast('Please enter a valid amount.', 'error'); return; }
  if (!date) { showToast('Please select a date.', 'error'); return; }
  if (!time) { showToast('Please select a time.', 'error'); return; }

  const entry = {
    id: genId(),
    title,
    amount: amountRaw,
    category,
    payment,
    date,
    time,
    notes,
    createdAt: new Date().toISOString()
  };

  entries.push(entry);
  saveEntries();

  // Reset form but keep defaults
  document.getElementById('field-title').value  = '';
  document.getElementById('field-amount').value = '';
  document.getElementById('field-notes').value  = '';
  document.getElementById('field-date').value   = getTodayString();
  document.getElementById('field-time').value   = getCurrentTimeString();

  refreshAll();
  showToast('Expense added! 💸', 'success');

  // Scroll to expense list
  document.getElementById('today-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ============================================================
// Edit Modal
// ============================================================

function openEditModal(id) {
  const entry = entries.find(e => e.id === id);
  if (!entry) return;

  editingId = id;

  document.getElementById('edit-id').value       = id;
  document.getElementById('edit-title').value    = entry.title;
  document.getElementById('edit-amount').value   = entry.amount;
  document.getElementById('edit-category').value = entry.category;
  document.getElementById('edit-payment').value  = entry.payment;
  document.getElementById('edit-date').value     = entry.date;
  document.getElementById('edit-time').value     = entry.time;
  document.getElementById('edit-notes').value    = entry.notes || '';

  document.getElementById('edit-modal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
  document.getElementById('edit-title').focus();
}

function closeEditModal() {
  document.getElementById('edit-modal').style.display = 'none';
  document.body.style.overflow = '';
  editingId = null;
}

function handleSaveEdit(e) {
  e.preventDefault();

  const id     = document.getElementById('edit-id').value;
  const title  = document.getElementById('edit-title').value.trim();
  const amount = parseFloat(document.getElementById('edit-amount').value);
  const cat    = document.getElementById('edit-category').value;
  const pay    = document.getElementById('edit-payment').value;
  const date   = document.getElementById('edit-date').value;
  const time   = document.getElementById('edit-time').value;
  const notes  = document.getElementById('edit-notes').value.trim();

  if (!title)               { showToast('Title is required.', 'error'); return; }
  if (!amount || amount <= 0) { showToast('Enter a valid amount.', 'error'); return; }

  const idx = entries.findIndex(e => e.id === id);
  if (idx === -1) { closeEditModal(); return; }

  entries[idx] = { ...entries[idx], title, amount, category: cat, payment: pay, date, time, notes };
  saveEntries();
  closeEditModal();
  refreshAll();
  showToast('Expense updated! ✅', 'success');
}

// ============================================================
// Delete
// ============================================================

function deleteEntry(id) {
  if (!confirm('Delete this expense entry?')) return;
  entries = entries.filter(e => e.id !== id);
  saveEntries();
  refreshAll();
  showToast('Entry deleted.', '');
}

function clearTodayEntries() {
  const today = getTodayString();
  const count = entries.filter(e => e.date === today).length;
  if (count === 0) { showToast("No today's entries to clear.", ''); return; }
  if (!confirm(`Clear all ${count} expense(s) from today (${formatDateDisplay(today)})?`)) return;
  entries = entries.filter(e => e.date !== today);
  saveEntries();
  refreshAll();
  showToast("Today's entries cleared.", '');
}

function clearAllEntries() {
  if (entries.length === 0) { showToast('No data to clear.', ''); return; }
  const confirmMsg = `⚠️ This will permanently delete ALL ${entries.length} expense entries.\n\nType DELETE to confirm:`;
  const input = prompt(confirmMsg);
  if (input !== 'DELETE') { showToast('Clear cancelled.', ''); return; }
  entries = [];
  saveEntries();
  refreshAll();
  showToast('All data cleared.', '');
}

// ============================================================
// Export — PDF
// ============================================================

function exportPDF() {
  const monthEntries = getEntriesForMonth(selectedMonth);
  const label = getMonthLabel(selectedMonth);

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Title
  doc.setFontSize(18);
  doc.setTextColor(108, 99, 255);
  doc.text("Yuvi's Daily Expense Tracker", 105, 16, { align: 'center' });

  doc.setFontSize(12);
  doc.setTextColor(90, 96, 116);
  doc.text(`Monthly Report — ${label}`, 105, 24, { align: 'center' });

  // Summary block
  const total     = monthEntries.reduce((s,e)=>s+e.amount, 0);
  const count     = monthEntries.length;
  const days      = new Set(monthEntries.map(e=>e.date)).size;
  const avgDaily  = days > 0 ? total / days : 0;

  const catMap = {};
  monthEntries.forEach(e => { catMap[e.category] = (catMap[e.category]||0)+e.amount; });
  const topCat = Object.entries(catMap).sort((a,b)=>b[1]-a[1])[0];

  doc.setFontSize(11);
  doc.setTextColor(0);
  let y = 34;
  const summaryLines = [
    ['Total Spent',        formatShort(total)],
    ['Total Entries',      String(count)],
    ['Top Category',       topCat ? `${topCat[0]} (${formatShort(topCat[1])})` : '—'],
    ['Average Daily Spend',formatShort(avgDaily)],
    ['Active Spending Days',String(days)]
  ];

  doc.setFontSize(12);
  doc.setTextColor(60);
  doc.text('Summary', 14, y); y += 7;

  doc.setFontSize(10);
  summaryLines.forEach(([k,v]) => {
    doc.setTextColor(90, 96, 116);
    doc.text(`${k}:`, 14, y);
    doc.setTextColor(26, 29, 46);
    doc.text(v, 80, y);
    y += 6;
  });

  y += 4;

  // Entries table
  if (monthEntries.length > 0) {
    const sorted = [...monthEntries].sort((a,b)=>(a.date+'T'+a.time).localeCompare(b.date+'T'+b.time));
    doc.autoTable({
      head: [['Date','Time','Title','Category','Amount','Payment','Notes']],
      body: sorted.map(e => [
        e.date, e.time, e.title, e.category,
        formatShort(e.amount), e.payment, e.notes||''
      ]),
      startY: y,
      theme: 'striped',
      headStyles: { fillColor: [108, 99, 255] },
      styles: { font: 'helvetica', fontSize: 8 },
      columnStyles: { 4: { halign: 'right' } }
    });
  } else {
    doc.setFontSize(10);
    doc.setTextColor(158, 163, 184);
    doc.text('No entries for this month.', 14, y);
  }

  // Footer
  const pCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(158, 163, 184);
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, pageH - 8);
    doc.text(`Page ${i} of ${pCount}`, pageW - 30, pageH - 8);
  }

  doc.save(`Yuvi_Expenses_${selectedMonth}.pdf`);
  showToast('PDF downloaded! 📄', 'success');
}

// ============================================================
// Export — Excel (.xlsx)
// ============================================================

function exportExcel() {
  if (typeof XLSX === 'undefined') {
    showToast('SheetJS not loaded. Check your connection.', 'error');
    return;
  }

  const monthEntries = getEntriesForMonth(selectedMonth);
  const label = getMonthLabel(selectedMonth);

  const total     = monthEntries.reduce((s,e)=>s+e.amount, 0);
  const count     = monthEntries.length;
  const days      = new Set(monthEntries.map(e=>e.date)).size;
  const avgDaily  = days > 0 ? total / days : 0;

  const catMap = {};
  monthEntries.forEach(e => { catMap[e.category] = (catMap[e.category]||0)+e.amount; });
  const topCat = Object.entries(catMap).sort((a,b)=>b[1]-a[1])[0];

  // Sheet 1: Summary
  const summaryData = [
    ['Yuvi\'s Daily Expense Tracker — Monthly Report'],
    ['Month', label],
    [],
    ['Metric', 'Value'],
    ['Total Spent (CAD)', parseFloat(total.toFixed(2))],
    ['Total Entries', count],
    ['Top Category', topCat ? `${topCat[0]} ($${topCat[1].toFixed(2)})` : '—'],
    ['Average Daily Spend (CAD)', parseFloat(avgDaily.toFixed(2))],
    ['Active Spending Days', days]
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);

  // Sheet 2: Entries
  const sorted = [...monthEntries].sort((a,b)=>(a.date+'T'+a.time).localeCompare(b.date+'T'+b.time));

  const entriesHeader = ['Date','Time','Title','Category','Amount (CAD)','Payment Method','Notes'];
  const entriesRows = sorted.map(e => [
    e.date, e.time, e.title, e.category,
    parseFloat(e.amount.toFixed(2)), e.payment, e.notes || ''
  ]);

  const wsEntries = XLSX.utils.aoa_to_sheet([entriesHeader, ...entriesRows]);

  // Column widths for entries sheet
  wsEntries['!cols'] = [
    { wch: 12 }, { wch: 8 }, { wch: 28 },
    { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 28 }
  ];
  wsSummary['!cols'] = [{ wch: 28 }, { wch: 22 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
  XLSX.utils.book_append_sheet(wb, wsEntries, 'Expense Entries');

  XLSX.writeFile(wb, `Yuvi_Expenses_${selectedMonth}.xlsx`);
  showToast('Excel file downloaded! 📊', 'success');
}

// ============================================================
// View Toggle
// ============================================================

function toggleView() {
  viewMode = viewMode === 'today' ? 'all' : 'today';
  renderEntryList();
}

// ============================================================
// Full Refresh
// ============================================================

function refreshAll() {
  buildMonthOptions();
  updateSummaryCards();
  renderEntryList();
  renderReport();
}

// ============================================================
// Init
// ============================================================

function init() {
  loadEntries();

  // Default form values
  document.getElementById('field-date').value = getTodayString();
  document.getElementById('field-time').value = getCurrentTimeString();

  // Populate month selector
  buildMonthOptions();

  // Initial render
  updateSummaryCards();
  renderEntryList();
  renderReport();

  // ---- Event Listeners ----

  // Add expense form
  document.getElementById('expense-form').addEventListener('submit', handleAddExpense);

  // View toggle
  document.getElementById('view-toggle-btn').addEventListener('click', toggleView);

  // Clear today
  document.getElementById('clear-today-btn').addEventListener('click', clearTodayEntries);

  // Clear all
  document.getElementById('clear-all-btn').addEventListener('click', clearAllEntries);

  // Month selector
  document.getElementById('report-month-select').addEventListener('change', function () {
    selectedMonth = this.value;
    renderReport();
  });

  // Export
  document.getElementById('export-pdf-btn').addEventListener('click', exportPDF);
  document.getElementById('export-excel-btn').addEventListener('click', exportExcel);

  // Edit modal
  document.getElementById('edit-form').addEventListener('submit', handleSaveEdit);
  document.getElementById('modal-close-btn').addEventListener('click', closeEditModal);
  document.getElementById('modal-cancel-btn').addEventListener('click', closeEditModal);

  // Close modal on backdrop click
  document.getElementById('edit-modal').addEventListener('click', function(e) {
    if (e.target === this) closeEditModal();
  });

  // Close modal on Escape
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && editingId !== null) closeEditModal();
  });

  // Auto-update time field every minute
  setInterval(() => {
    const timeField = document.getElementById('field-time');
    // Only auto-update if the date is today and time hasn't been manually changed
    if (document.getElementById('field-date').value === getTodayString()) {
      // Only update if within ~5 minutes of current time (i.e. likely default)
      timeField.value = getCurrentTimeString();
    }
  }, 60000);
}

// Start
document.addEventListener('DOMContentLoaded', init);
