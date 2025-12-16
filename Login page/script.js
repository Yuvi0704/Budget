/* ================================
   Yuvi Private Dashboard - JavaScript
   ================================ */

// Allowed credentials
const VALID_EMAIL = 'yuvi@private.local';
const VALID_PASSWORD = 'MyStrongPwd!2025';

// Task storage key
const TASKS_STORAGE_KEY = 'yuviTasks';

// ================================
// Login Page Logic
// ================================

function initLoginPage() {
    // Check if already logged in - redirect to dashboard
    if (localStorage.getItem('isLoggedIn') === 'true' ||
        sessionStorage.getItem('isLoggedIn') === 'true') {
        window.location.href = 'dashboard.html';
        return;
    }

    // Get form elements
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const rememberMe = document.getElementById('rememberMe');
    const errorMessage = document.getElementById('errorMessage');

    if (!loginForm) return;

    // Handle form submission
    loginForm.addEventListener('submit', function (e) {
        e.preventDefault();

        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const remember = rememberMe.checked;

        // Clear previous error
        errorMessage.textContent = '';
        errorMessage.style.display = 'none';

        // Validate credentials
        if (email === VALID_EMAIL && password === VALID_PASSWORD) {
            // Success - store login state
            if (remember) {
                localStorage.setItem('isLoggedIn', 'true');
                localStorage.setItem('userEmail', email);
            } else {
                sessionStorage.setItem('isLoggedIn', 'true');
                sessionStorage.setItem('userEmail', email);
            }

            // Redirect to dashboard
            window.location.href = 'dashboard.html';
        } else {
            // Error - show message
            errorMessage.textContent = 'Invalid email or password. Please try again.';
            errorMessage.style.display = 'block';

            // Shake animation for feedback
            loginForm.classList.add('shake');
            setTimeout(() => loginForm.classList.remove('shake'), 500);
        }
    });
}

// ================================
// Dashboard Page Logic
// ================================

function initDashboardPage() {
    // AUTH CHECK: Redirect to login if not authenticated
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true' ||
        sessionStorage.getItem('isLoggedIn') === 'true';

    if (!isLoggedIn) {
        window.location.href = 'index.html';
        return;
    }

    // Initialize tasks
    loadAndRenderTasks();

    // Setup add task buttons
    setupAddTaskButtons();

    // Setup logout button
    setupLogoutButton();
}

// ================================
// Task Management
// ================================

// Get tasks from localStorage
function getTasks() {
    const stored = localStorage.getItem(TASKS_STORAGE_KEY);
    if (stored) {
        return JSON.parse(stored);
    }
    // Return default empty structure
    return {
        today: [],
        week: [],
        backlog: []
    };
}

// Save tasks to localStorage
function saveTasks(tasks) {
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
}

// Load and render all tasks
function loadAndRenderTasks() {
    const tasks = getTasks();

    renderTaskList('today', tasks.today);
    renderTaskList('week', tasks.week);
    renderTaskList('backlog', tasks.backlog);
}

// Render a single task list
function renderTaskList(columnKey, taskArray) {
    const columnMap = {
        today: 'todayTasks',
        week: 'weekTasks',
        backlog: 'backlogTasks'
    };

    const container = document.getElementById(columnMap[columnKey]);
    if (!container) return;

    if (taskArray.length === 0) {
        container.innerHTML = '<div class="task-empty">No tasks yet</div>';
        return;
    }

    container.innerHTML = taskArray.map((task, index) => `
    <div class="task-card">
      <span class="task-text">${escapeHtml(task)}</span>
      <button class="btn-delete" data-column="${columnKey}" data-index="${index}">✕</button>
    </div>
  `).join('');

    // Add delete event listeners
    container.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', function () {
            const column = this.dataset.column;
            const index = parseInt(this.dataset.index, 10);
            deleteTask(column, index);
        });
    });
}

// Add a new task
function addTask(columnKey, taskText) {
    if (!taskText.trim()) return;

    const tasks = getTasks();
    tasks[columnKey].push(taskText.trim());
    saveTasks(tasks);

    // Re-render the affected column
    renderTaskList(columnKey, tasks[columnKey]);
}

// Delete a task
function deleteTask(columnKey, index) {
    const tasks = getTasks();
    tasks[columnKey].splice(index, 1);
    saveTasks(tasks);

    // Re-render the affected column
    renderTaskList(columnKey, tasks[columnKey]);
}

// Setup add task button listeners
function setupAddTaskButtons() {
    const addButtons = document.querySelectorAll('.btn-add');

    addButtons.forEach(btn => {
        btn.addEventListener('click', function () {
            const column = this.dataset.column;
            const inputMap = {
                today: 'todayInput',
                week: 'weekInput',
                backlog: 'backlogInput'
            };

            const input = document.getElementById(inputMap[column]);
            if (input && input.value.trim()) {
                addTask(column, input.value);
                input.value = '';
                input.focus();
            }
        });
    });

    // Also allow Enter key to add tasks
    const inputs = document.querySelectorAll('.task-input');
    inputs.forEach(input => {
        input.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                const column = this.id.replace('Input', '');
                if (this.value.trim()) {
                    addTask(column, this.value);
                    this.value = '';
                }
            }
        });
    });
}

// ================================
// Logout
// ================================

function setupLogoutButton() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function () {
            // Clear ALL login data from both storages
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('userEmail');
            sessionStorage.removeItem('isLoggedIn');
            sessionStorage.removeItem('userEmail');

            // Redirect to login page
            window.location.href = 'index.html';
        });
    }
}

// ================================
// Utility Functions
// ================================

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ================================
// Initialize on Page Load
// ================================

document.addEventListener('DOMContentLoaded', function () {
    // Check which page we're on and initialize accordingly
    if (document.getElementById('loginForm')) {
        initLoginPage();
    } else if (document.getElementById('taskBoard')) {
        initDashboardPage();
    }
});
