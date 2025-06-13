let currentUser = null;
let tasks = [];
let users = [];
let notifications = [];
let draggedTask = null;
let editingTaskId = null;

const authContainer = document.getElementById('auth-container');
const dashboardContainer = document.getElementById('dashboard-container');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const showRegisterBtn = document.getElementById('show-register');
const showLoginBtn = document.getElementById('show-login');
const registerBtn = document.getElementById('register-btn');
const loginBtn = document.getElementById('login-btn');
const logoutBtnSidebar = document.getElementById('logout-btn-sidebar');
const logoutBtnTopbar = document.getElementById('logout-btn-topbar');
const addTaskBtn = document.getElementById('add-task-btn');
const taskModal = document.getElementById('task-modal');
const appSidebar = document.getElementById('app-sidebar');
const appMainContent = document.getElementById('app-main-content');
const userAvatarTopbar = document.getElementById('user-avatar-topbar');
const userAvatarSettingsTopbar = document.getElementById('user-avatar-settings-topbar');
const logoutBtnSettingsTopbar = document.getElementById('logout-btn-settings-topbar');

const boardView = document.getElementById('board-view');
const settingsView = document.getElementById('settings-view');
const profileNameInput = document.getElementById('profile-name');
const profileEmailInput = document.getElementById('profile-email');
const profileDepartmentInput = document.getElementById('profile-department');
const profileRoleInput = document.getElementById('profile-role');
const avatarFileInput = document.getElementById('avatar-file-input');
const changeAvatarBtn = document.getElementById('change-avatar-btn');
const avatarPreview = document.getElementById('avatar-preview');
const saveAvatarBtn = document.getElementById('save-avatar-btn');
const deleteAccountBtn = document.getElementById('delete-account-btn');
const registerAvatarInput = document.getElementById('register-avatar-input');
const registerChooseAvatarBtn = document.getElementById('register-choose-avatar-btn');
const registerAvatarPreview = document.getElementById('register-avatar-preview');

const notificationsPanel = document.getElementById('sidebar-notifications-panel');
const notificationsList = document.getElementById('notifications-list');
const notificationBadgeCount = document.getElementById('notification-badge-count');
const clearNotificationsBtn = document.getElementById('clear-notifications-btn');
const noNotificationsMessage = document.getElementById('no-notifications-message');
const closeNotificationsPanelBtn = document.getElementById('close-notifications-panel-btn');


const closeModalBtn = document.getElementById('close-modal');
const saveTaskBtn = document.getElementById('save-task-btn');
const deleteTaskBtn = document.getElementById('delete-task-btn');
const taskLists = document.querySelectorAll('.task-list');
const searchInput = document.getElementById('search-input');
const filterDepartment = document.getElementById('filter-department');
const filterDate = document.getElementById('filter-date');
const clearDateFilterBtn = document.getElementById('clear-date-filter');
const toastContainer = document.getElementById('toast-container');
const modalTitle = document.getElementById('modal-title');

function playSound(soundUrl) {
    try {
        const audio = new Audio(soundUrl);
        audio.play().catch(error => console.warn("Autoplay was prevented for sound:", soundUrl, error));
    } catch (error) {
        console.warn("Error playing sound:", soundUrl, error);
    }
}

function init() {
    loadUsers();
    loadTasks();
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
        loadNotifications();
        loadDashboard();
    } else {
        loadNotificationsForGuest();
        showAuthContainer();
    }
    setupEventListeners();
    renderNotifications();
}

function setupEventListeners() {
    const addClickSound = (element, originalCallback) => {
        if (element) {
            element.addEventListener('click', (event) => {
                playSound('sounds/click.mp3');
                if (originalCallback) {
                    originalCallback(event);
                }
            });
        }
    };

    addClickSound(showRegisterBtn, () => {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
    });
    addClickSound(showLoginBtn, () => {
        registerForm.style.display = 'none';
        loginForm.style.display = 'block';
    });

    addClickSound(registerBtn, registerUser);
    loginBtn.addEventListener('click', loginUser); 

    addClickSound(logoutBtnSidebar, logoutUser);
    addClickSound(logoutBtnTopbar, logoutUser);
    if (logoutBtnSettingsTopbar) addClickSound(logoutBtnSettingsTopbar, logoutUser);

    addClickSound(addTaskBtn, showAddTaskModal);
    addClickSound(closeModalBtn, closeModal);
    addClickSound(saveTaskBtn, saveTask);
    addClickSound(deleteTaskBtn, () => deleteTask(editingTaskId));

    searchInput.addEventListener('input', filterTasks);
    filterDepartment.addEventListener('change', filterTasks);
    filterDate.addEventListener('change', filterTasks);
    addClickSound(clearDateFilterBtn, clearDateFilter);

    setupDragAndDrop();

    const sidebarMenuItems = document.querySelectorAll('.sidebar-menu-item');
    sidebarMenuItems.forEach(item => {
        addClickSound(item, () => {
            const currentView = item.dataset.view;
            if (currentView !== 'notifications') {
                sidebarMenuItems.forEach(i => {
                    if (i.dataset.view !== 'notifications') i.classList.remove('active');
                });
                item.classList.add('active');
            }
            if (currentView === 'notifications') {
                toggleNotificationsPanel();
            } else {
                if (notificationsPanel.classList.contains('active')) {
                    notificationsPanel.classList.remove('active');
                    const notificationsMenuItem = document.querySelector('.sidebar-menu-item[data-view="notifications"]');
                    if(notificationsMenuItem) notificationsMenuItem.classList.remove('active');
                }
                switchView(currentView);
            }
        });
    });

    if (changeAvatarBtn) addClickSound(changeAvatarBtn, () => avatarFileInput.click());
    if (avatarFileInput) avatarFileInput.addEventListener('change', previewAvatar);
    if (saveAvatarBtn) addClickSound(saveAvatarBtn, saveAvatar);
    if (deleteAccountBtn) addClickSound(deleteAccountBtn, deleteCurrentUserAccount);

    if (clearNotificationsBtn) addClickSound(clearNotificationsBtn, clearAllNotificationsForCurrentUser);
    if (closeNotificationsPanelBtn) addClickSound(closeNotificationsPanelBtn, toggleNotificationsPanel);
    
    if (registerChooseAvatarBtn) addClickSound(registerChooseAvatarBtn, () => registerAvatarInput.click());
    if (registerAvatarInput) registerAvatarInput.addEventListener('change', previewRegisterAvatar);
}

function previewRegisterAvatar() {
    const file = registerAvatarInput.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            registerAvatarPreview.src = e.target.result;
            registerAvatarPreview.style.display = 'block';
        }
        reader.readAsDataURL(file);
    } else {
        registerAvatarPreview.src = '#';
        registerAvatarPreview.style.display = 'none';
    }
}

function deleteCurrentUserAccount() {
    if (!currentUser) return;

    const confirmation = confirm(`Are you sure you want to delete your account, ${currentUser.name}? This will also delete all tasks created by you or assigned to you. This action cannot be undone.`);

    if (confirmation) {
        tasks = tasks.filter(task => task.createdBy !== currentUser.id && task.assignee !== currentUser.id);
        saveTasks();

        users = users.filter(user => user.id !== currentUser.id);
        saveUsers();

        localStorage.removeItem(`notifications_${currentUser.id}`);

        users = users.filter(user => user.id !== currentUser.id);
        saveUsers();
        
        const userName = currentUser.name; 
        logoutUser(); 
        showToast(`Account for ${userName} has been successfully deleted.`, 'success');
    }
}

function toggleNotificationsPanel() {
    if (!notificationsPanel) return;
    
    const isActive = notificationsPanel.classList.toggle('active');

    if (isActive) {
        notificationsPanel.style.display = 'flex';
        setTimeout(() => {
            notificationsPanel.classList.add('active-transition'); 
        }, 10);

        if (currentUser) {
            notifications.forEach(n => n.read = true);
            saveNotificationsForCurrentUser();
            renderNotifications();
        }
    } else {
        notificationsPanel.classList.remove('active-transition');
        setTimeout(() => {
            notificationsPanel.style.display = 'none';
        }, 300);
    }

    const notificationsMenuItem = document.querySelector('.sidebar-menu-item[data-view="notifications"]');
    if (notificationsMenuItem) {
        notificationsMenuItem.classList.toggle('active', isActive);
    }
    
    if (!isActive) {
        const activeMainViewItem = document.querySelector('.sidebar-menu-item[data-view="board"].active, .sidebar-menu-item[data-view="settings"].active');
        if (!activeMainViewItem && document.querySelector('.sidebar-menu-item[data-view="board"]')) {
            document.querySelector('.sidebar-menu-item[data-view="board"]').classList.add('active');
            switchView('board');
        }
    }
}


function addNotification(message, type = 'info', forUserId = null) {
    const userIdToNotify = forUserId || (currentUser ? currentUser.id : 'guest');
    if (userIdToNotify === 'guest' && !forUserId) return;
    if (!userIdToNotify) return;

    const notificationKey = `notifications_${userIdToNotify}`;
    let userNotifications = [];
    try {
        userNotifications = JSON.parse(localStorage.getItem(notificationKey) || '[]');
    } catch (e) {
        console.error("Error parsing notifications from localStorage:", e);
        userNotifications = [];
    }
    
    const newNotification = { 
        id: Date.now() + Math.random().toString(36).substring(2, 9), 
        message, 
        type, 
        timestamp: new Date().toISOString(), 
        read: false 
    };
    userNotifications.unshift(newNotification);
    localStorage.setItem(notificationKey, JSON.stringify(userNotifications));

    if (currentUser && userIdToNotify === currentUser.id) {
        notifications = userNotifications; 
        renderNotifications();
        playSound('sounds/notification.mp3');
    }
}


function renderNotifications() {
    if (!notificationsList || !noNotificationsMessage || !notificationBadgeCount) return;

    notificationsList.innerHTML = '';
    if (notifications.length === 0) {
        noNotificationsMessage.style.display = 'block';
    } else {
        noNotificationsMessage.style.display = 'none';
        notifications.forEach(notification => {
            const li = document.createElement('li');
            li.className = `notification-item ${notification.read ? 'read' : ''}`;
            li.dataset.notificationId = notification.id;
            
            const messageP = document.createElement('p');
            messageP.className = 'notification-message';
            messageP.textContent = notification.message;
            
            const timeSpan = document.createElement('span');
            timeSpan.className = 'notification-time';
            timeSpan.textContent = formatTimeAgo(notification.timestamp);
            
            li.appendChild(messageP);
            li.appendChild(timeSpan);
            notificationsList.appendChild(li);
        });
    }
    const unreadCount = notifications.filter(n => !n.read).length;
    if (unreadCount > 0) {
        notificationBadgeCount.textContent = unreadCount;
        notificationBadgeCount.style.display = 'inline-block';
    } else {
        notificationBadgeCount.style.display = 'none';
    }
}

function formatTimeAgo(timestamp) {
    const now = new Date();
    const seconds = Math.round((now - new Date(timestamp)) / 1000);

    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.round(hours / 24);
    return `${days}d ago`;
}

function clearAllNotificationsForCurrentUser() {
    if (currentUser) {
        notifications = [];
        saveNotificationsForCurrentUser();
        renderNotifications();
        showToast('Notifications cleared', 'info');
    }
}

function saveNotificationsForCurrentUser() {
    if (currentUser) {
        localStorage.setItem(`notifications_${currentUser.id}`, JSON.stringify(notifications));
    }
}

function loadNotifications() {
    if (currentUser) {
        const storedNotifications = localStorage.getItem(`notifications_${currentUser.id}`);
        notifications = storedNotifications ? JSON.parse(storedNotifications) : [];
    } else {
        notifications = [];
    }
}
function loadNotificationsForGuest() {
    const storedNotifications = localStorage.getItem('notifications_guest');
    notifications = storedNotifications ? JSON.parse(storedNotifications) : [];
}


function previewAvatar() {
    const file = avatarFileInput.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            avatarPreview.src = e.target.result;
            avatarPreview.style.display = 'block';
            saveAvatarBtn.style.display = 'inline-flex';
        }
        reader.readAsDataURL(file);
    } else {
        avatarPreview.style.display = 'none';
        saveAvatarBtn.style.display = 'none';
    }
}

function switchView(viewName) {
    boardView.style.display = 'none';
    settingsView.style.display = 'none';
    
    if (notificationsPanel.classList.contains('active')) {
         notificationsPanel.classList.remove('active');
    }

    if (viewName === 'board') {
        boardView.style.display = 'block';
        renderTasks(); 
    } else if (viewName === 'settings') {
        settingsView.style.display = 'block';
        loadProfileSettings();
    }
}

function loadProfileSettings() {
    if (currentUser) {
        profileNameInput.value = currentUser.name;
        profileEmailInput.value = currentUser.email;
        profileDepartmentInput.value = capitalizeFirstLetter(currentUser.department);
        profileRoleInput.value = capitalizeFirstLetter(currentUser.role);
        avatarPreview.style.display = 'none';
        saveAvatarBtn.style.display = 'none';
        avatarFileInput.value = '';
        if (currentUser.avatarData) {
            avatarPreview.src = currentUser.avatarData;
            avatarPreview.style.display = 'block';
        }
        if(userAvatarSettingsTopbar) {
            if (currentUser.avatarData) {
                userAvatarSettingsTopbar.innerHTML = `<img src="${currentUser.avatarData}" alt="${currentUser.name.charAt(0)}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
            } else {
                userAvatarSettingsTopbar.textContent = currentUser.name.charAt(0).toUpperCase();
            }
        }
    }
}

function saveAvatar() {
    const file = avatarFileInput.files[0];
    if (currentUser && file) {
        const reader = new FileReader();
        reader.onloadend = function() {
            const base64String = reader.result;
            currentUser.avatarData = base64String;
            const userIndex = users.findIndex(u => u.id === currentUser.id);
            if (userIndex !== -1) users[userIndex].avatarData = base64String;
            saveUsers();
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            updateAvatarDisplays(base64String);
            showToast('Avatar updated successfully!', 'success');
            avatarPreview.style.display = 'block';
            saveAvatarBtn.style.display = 'none';
        }
        reader.readAsDataURL(file);
    } else {
        showToast('Please choose an image first.', 'error');
    }
}

function updateAvatarDisplays(avatarData) {
    const userInitial = currentUser ? currentUser.name.charAt(0).toUpperCase() : '';
    const avatarContent = avatarData ? `<img src="${avatarData}" alt="${userInitial}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">` : userInitial;
    
    if(userAvatarTopbar) userAvatarTopbar.innerHTML = avatarContent;
    if(userAvatarSettingsTopbar) userAvatarSettingsTopbar.innerHTML = avatarContent;

    const userNameTopbar = document.getElementById('user-name-topbar');
    const userRoleDeptTopbar = document.getElementById('user-role-department-topbar');

    if (currentUser) {
        if (userNameTopbar) userNameTopbar.textContent = currentUser.name;
        if (userRoleDeptTopbar) {
            userRoleDeptTopbar.textContent = `${capitalizeFirstLetter(currentUser.role)} - ${capitalizeFirstLetter(currentUser.department)}`;
        }
    } else {
        if (userNameTopbar) userNameTopbar.textContent = '';
        if (userRoleDeptTopbar) userRoleDeptTopbar.textContent = '';
    }

    renderDepartmentUserAvatars(); 
    renderTasks(); 
}

function renderDepartmentUserAvatars() {
    const departmentAvatarsContainer = document.getElementById('department-users-avatars-topbar');
    if (!departmentAvatarsContainer || !currentUser) return;

    departmentAvatarsContainer.innerHTML = ''; 

    const departmentUsers = users.filter(user => user.department === currentUser.department && user.id !== currentUser.id);
    
    const maxAvatarsToShow = 3;
    departmentUsers.slice(0, maxAvatarsToShow).forEach(user => {
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'avatar department-user-avatar';
        avatarDiv.title = user.name;
        if (user.avatarData) {
            avatarDiv.innerHTML = `<img src="${user.avatarData}" alt="${user.name.charAt(0)}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
        } else {
            avatarDiv.textContent = user.name.charAt(0).toUpperCase();
        }
        departmentAvatarsContainer.appendChild(avatarDiv);
    });
    if (departmentUsers.length > maxAvatarsToShow) {
        const moreUsersDiv = document.createElement('div');
        moreUsersDiv.className = 'avatar department-user-avatar more-users-count';
        moreUsersDiv.textContent = `+${departmentUsers.length - maxAvatarsToShow}`;
        moreUsersDiv.title = `${departmentUsers.length - maxAvatarsToShow} more users in this department`;
        departmentAvatarsContainer.appendChild(moreUsersDiv);
    }
}

function loadUsers() {
    const storedUsers = localStorage.getItem('users');
    if (storedUsers) {
        users = JSON.parse(storedUsers);
    } else {
        users = [
            { id: 1, name: 'Admin User', email: 'admin@example.com', password: 'admin123', department: 'development', role: 'manager', avatarData: null },
            { id: 2, name: 'Dev User', email: 'dev@example.com', password: 'dev123', department: 'development', role: 'employee', avatarData: null },
            { id: 3, name: 'Design User', email: 'design@example.com', password: 'design123', department: 'design', role: 'employee', avatarData: null }
        ];
        saveUsers();
    }
}

function saveUsers() {
    localStorage.setItem('users', JSON.stringify(users));
}

function loadTasks() {
    const storedTasks = localStorage.getItem('tasks');
    if (storedTasks) {
        tasks = JSON.parse(storedTasks);
    } else {
        tasks = [
        ];
        saveTasks();
    }
}

function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

function registerUser() {
    const name = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value.trim();
    const department = document.getElementById('register-department').value;
    const role = document.getElementById('register-role').value;
    const avatarFile = registerAvatarInput.files[0];

    if (!name || !email || !password) {
        showToast('Please fill in all fields', 'error'); return;
    }
    if (users.find(user => user.email === email)) {
        showToast('Email already exists', 'error'); return;
    }

    const processRegistration = (avatarDataUrl = null) => {
        const newUserId = users.length > 0 ? (Math.max(...users.map(user => typeof user.id === 'number' ? user.id : 0)) + 1) : 1;
        const finalUserId = name.toLowerCase();

        const newUser = { 
            id: finalUserId,
            name, email, password, department, role, 
            avatarData: avatarDataUrl 
        };
        users.push(newUser);
        saveUsers();
        showToast('Registration successful! You can now login.', 'success');
        registerForm.style.display = 'none';
        loginForm.style.display = 'block';
        document.getElementById('register-form').reset(); 
        registerAvatarPreview.style.display = 'none'; 
        registerAvatarPreview.src = '#';
    };

    if (avatarFile) {
        const reader = new FileReader();
        reader.onloadend = function() {
            processRegistration(reader.result);
        }
        reader.readAsDataURL(avatarFile);
    } else {
        processRegistration(null);
    }
}

function loginUser() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value.trim();
    if (!email || !password) {
        showToast('Please fill in all fields', 'error'); return;
    }
    const user = users.find(user => user.email === email && user.password === password);
    if (!user) {
        showToast('Invalid email or password', 'error'); return;
    }
    currentUser = user;
    localStorage.setItem('currentUser', JSON.stringify(user));
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
    
    loadNotifications();
    loadDashboard();
    showToast(`Welcome back, ${user.name}!`, 'success');
    playSound('sounds/login.mp3');
}

function logoutUser() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    loadNotificationsForGuest();
    showAuthContainer();
    showToast('Logged out successfully', 'info');
}

function showAuthContainer() {
    authContainer.style.display = 'block';
    dashboardContainer.style.display = 'none';
    appSidebar.style.display = 'none';
    document.body.classList.remove('sidebar-active', 'dashboard-active');
    document.body.classList.add('auth-active'); 
    appMainContent.style.marginLeft = '0';
    if(notificationsPanel) {
        notificationsPanel.classList.remove('active', 'active-transition');
        notificationsPanel.style.display = 'none';
    }
    renderNotifications();
}

function loadDashboard() {
    authContainer.style.display = 'none';
    dashboardContainer.style.display = 'block';
    appSidebar.style.display = 'flex';
    appMainContent.style.marginLeft = '260px'; 
    document.body.classList.add('sidebar-active', 'dashboard-active');
    document.body.classList.remove('auth-active');
    updateAvatarDisplays(currentUser.avatarData);
    renderDepartmentUserAvatars();
    const addTaskButton = document.getElementById('add-task-btn');
    const departmentFilterGroup = document.getElementById('filter-department').parentElement;
    if (currentUser.role === 'manager') {
        addTaskButton.style.display = 'inline-flex';
        departmentFilterGroup.style.display = 'flex';
        filterDepartment.value = 'all';
    } else {
        addTaskButton.style.display = 'none';
        departmentFilterGroup.style.display = 'none';
        filterDepartment.value = currentUser.department;
    }
    populateTaskAssignees();
    switchView('board'); 
    document.querySelectorAll('.sidebar-menu-item').forEach(item => item.classList.remove('active'));
    const boardMenuItem = document.querySelector('.sidebar-menu-item[data-view="board"]');
    if (boardMenuItem) boardMenuItem.classList.add('active');
    renderNotifications(); 
    updateGreeting(); // Add this line
}

// Add this new function
function updateGreeting() {
    const greetingMessageElement = document.getElementById('greeting-message');
    if (!greetingMessageElement || !currentUser) return;

    const now = new Date();
    const hours = now.getHours();
    let greeting = '';
    let icon = '';

    if (hours >= 5 && hours < 12) {
        greeting = 'Good morning';
        icon = '☀️'; // Sun icon
    } else if (hours >= 12 && hours < 18) {
        greeting = 'Good afternoon';
        icon = '🌤️'; // Sun behind cloud icon
    } else { // Covers 18:00 to 23:59 and 00:00 to 04:59
        greeting = 'Good evening';
        icon = '🌙'; // Moon icon
    }

    greetingMessageElement.innerHTML = `${icon} ${greeting}, ${currentUser.name}!`;
}

function showAddTaskModal() {
    modalTitle.textContent = 'Add New Task';
    editingTaskId = null;
    document.getElementById('task-title').value = '';
    document.getElementById('task-description').value = '';
    document.getElementById('task-department').value = currentUser.department;
    populateTaskAssignees();
    document.getElementById('task-assignee').value = '';
    document.getElementById('task-due-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('task-status').value = 'todo';
    deleteTaskBtn.style.display = 'none';
    taskModal.classList.add('active');
}

function showEditTaskModal(taskId) {
    const task = tasks.find(t => t.id.toString() === taskId.toString());
    if (!task) return;
    modalTitle.textContent = 'Edit Task';
    editingTaskId = taskId;
    document.getElementById('task-title').value = task.title;
    document.getElementById('task-description').value = task.description;
    document.getElementById('task-department').value = task.department;
    populateTaskAssignees();
    document.getElementById('task-assignee').value = task.assignee;
    document.getElementById('task-due-date').value = task.dueDate;
    document.getElementById('task-status').value = task.status;
    deleteTaskBtn.style.display = 'inline-flex';
    taskModal.classList.add('active');
}

function closeModal() {
    taskModal.classList.remove('active');
}

function populateTaskAssignees() {
    const assigneeSelect = document.getElementById('task-assignee');
    const departmentSelect = document.getElementById('task-department');
    const selectedDepartment = departmentSelect.value;
    
    assigneeSelect.innerHTML = '<option value="">Select Assignee</option>';
    
    const departmentUsers = users.filter(user => user.department === selectedDepartment && user.role === 'employee');
    departmentUsers.forEach(user => {
        const option = document.createElement('option');
        option.value = user.id;
        option.textContent = user.name;
        assigneeSelect.appendChild(option);
    });
}
document.getElementById('task-department')?.addEventListener('change', populateTaskAssignees);


function saveTask() {
    const title = document.getElementById('task-title').value.trim();
    const description = document.getElementById('task-description').value.trim();
    const department = document.getElementById('task-department').value;
    const assigneeId = document.getElementById('task-assignee').value;
    const dueDate = document.getElementById('task-due-date').value;
    const status = document.getElementById('task-status').value;

    if (!title) { showToast('Please enter a task title', 'error'); return; }
    if (!assigneeId && status !== 'done') { showToast('Please select an assignee', 'error'); return; }
    if (!dueDate) { showToast('Please select a due date', 'error'); return; }
    if (currentUser.role !== 'manager' && department !== currentUser.department) {
        showToast('You do not have permission to create tasks for this department', 'error'); return;
    }

    const assigneeUser = users.find(u => u.id.toString() === assigneeId.toString());

    if (editingTaskId) {
        if (currentUser && currentUser.role !== 'manager' && tasks.find(t => t.id.toString() === editingTaskId.toString())?.createdBy.toString() !== currentUser.id.toString()) {
            showToast('You do not have permission to edit this task.', 'error');
            closeModal();
            return;
        }
        const taskIndex = tasks.findIndex(t => t.id.toString() === editingTaskId.toString());
        if (taskIndex !== -1) {
            const oldTask = { ...tasks[taskIndex] };
            tasks[taskIndex] = { ...tasks[taskIndex], title, description, department, assignee: assigneeId, dueDate, status };
            
            if (oldTask.status !== status) {
                addNotification(`Task "${tasks[taskIndex].title}" status updated to ${getStatusName(status)}.`, 'info', currentUser.id);
                if (assigneeUser && assigneeUser.id !== currentUser.id) {
                     addNotification(`Task "${tasks[taskIndex].title}" (assigned to you) status updated to ${getStatusName(status)}.`, 'info', assigneeUser.id);
                }
            }
            if (oldTask.assignee !== assigneeId && assigneeUser) {
                 addNotification(`Task "${tasks[taskIndex].title}" reassigned to ${assigneeUser.name}.`, 'info', currentUser.id);
                 if (oldTask.assignee && oldTask.assignee.toString() !== currentUser.id.toString()) {
                    const oldAssigneeUser = users.find(u => u.id.toString() === oldTask.assignee.toString());
                    if (oldAssigneeUser) {
                        addNotification(`Task "${tasks[taskIndex].title}" has been unassigned from you.`, 'info', oldAssigneeUser.id);
                    }
                 }
                 if (assigneeUser.id !== currentUser.id) {
                    addNotification(`You have been assigned a new task: "${tasks[taskIndex].title}" by ${currentUser.name}.`, 'info', assigneeUser.id);
                 }
            }
            showToast('Task updated successfully', 'success');
        }
    } else {
        const newTaskId = tasks.length > 0 ? (Math.max(...tasks.map(task => typeof task.id === 'number' ? task.id : 0).filter(id => id > 0)) + 1) : 1;
        const finalNewTaskId = Date.now() + Math.random().toString(36).substring(2, 7);

        const newTask = {
            id: finalNewTaskId,
            title, description, department, assignee: assigneeId, dueDate, status,
            createdBy: currentUser.id, createdAt: new Date().toISOString()
        };
        tasks.push(newTask);
        
        addNotification(`New task "${title}" created and assigned to ${assigneeUser ? assigneeUser.name : 'Unassigned'}.`, 'info', currentUser.id);
                if (assigneeUser && assigneeUser.id !== currentUser.id) {
            addNotification(`You have been assigned a new task: "${title}" by ${currentUser.name}.`, 'info', assigneeUser.id);
        }
        showToast('Task created successfully', 'success');
    }
    saveTasks();
    closeModal();
    renderTasks();
}


function renderTasks() {
    document.getElementById('todo-list').innerHTML = '';
    document.getElementById('progress-list').innerHTML = '';
    document.getElementById('done-list').innerHTML = '';
    let filteredTasks = [...tasks];

    if (currentUser.role !== 'manager') {
        filteredTasks = filteredTasks.filter(task => 
            task.department === currentUser.department && 
            (task.assignee && task.assignee.toString() === currentUser.id.toString())
        );
    } else {
        const selectedDepartment = filterDepartment.value;
        if (selectedDepartment !== 'all') {
            filteredTasks = filteredTasks.filter(task => task.department === selectedDepartment);
        }
    }

    const searchTerm = searchInput.value.toLowerCase().trim();
    if (searchTerm) {
        filteredTasks = filteredTasks.filter(task => 
            task.title.toLowerCase().includes(searchTerm) || 
            (task.description && task.description.toLowerCase().includes(searchTerm))
        );
    }
    const selectedDate = filterDate.value;
    if (selectedDate) {
        filteredTasks = filteredTasks.filter(task => task.dueDate === selectedDate);
    }

    const todoTasks = filteredTasks.filter(task => task.status === 'todo');
    const progressTasks = filteredTasks.filter(task => task.status === 'inprogress');
    const doneTasks = filteredTasks.filter(task => task.status === 'done');
    
    document.getElementById('todo-count').textContent = todoTasks.length;
    document.getElementById('progress-count').textContent = progressTasks.length;
    document.getElementById('done-count').textContent = doneTasks.length;
    
    todoTasks.forEach(task => renderTaskCard(task, 'todo-list'));
    progressTasks.forEach(task => renderTaskCard(task, 'progress-list'));
    doneTasks.forEach(task => renderTaskCard(task, 'done-list'));
}

function renderTaskCard(task, containerId) {
    const container = document.getElementById(containerId);
    const assignee = users.find(user => user.id.toString() === (task.assignee ? task.assignee.toString() : ''));
    const creator = users.find(user => user.id.toString() === (task.createdBy ? task.createdBy.toString() : ''));
    const taskCard = document.createElement('div');
    taskCard.className = `task-card status-${task.status}`;
    taskCard.draggable = (currentUser.role === 'manager' || (assignee && assignee.id.toString() === currentUser.id.toString()));
    taskCard.dataset.taskId = task.id.toString();
    
    const dueDate = new Date(task.dueDate);
    const formattedDate = dueDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const today = new Date();
    today.setHours(0,0,0,0);
    const isOverdue = task.status !== 'done' && dueDate < today;
    const createdAtDate = new Date(task.createdAt);
    const formattedCreatedAt = createdAtDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }); 

    const assigneeAvatarContent = assignee 
        ? (assignee.avatarData ? `<img src="${assignee.avatarData}" alt="${assignee.name.charAt(0)}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">` : assignee.name.charAt(0).toUpperCase())
        : '?';
    
    const creatorAvatarContent = creator
        ? (creator.avatarData ? `<img src="${creator.avatarData}" alt="${creator.name.charAt(0)}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">` : creator.name.charAt(0).toUpperCase())
        : '?';

    const creatorName = creator ? creator.name : 'Unknown';
    const assigneeName = assignee ? assignee.name : 'Unassigned';

    let taskActionsHTML = '';
    if (currentUser && (currentUser.role === 'manager' || task.createdBy.toString() === currentUser.id.toString())) {
        taskActionsHTML = `
            <div class="task-actions">
                <button class="task-action-btn edit-task-btn" title="Edit Task">✏️</button>
            </div>`;
    }

    taskCard.innerHTML = `
        <div class="department-badge dept-${task.department}">${capitalizeFirstLetter(task.department)}</div>
        <div class="task-header">
            <div class="task-title">${task.title}</div>
            ${taskActionsHTML}
        </div>
        <div class="task-description">${task.description || ''}</div>
        <div class="task-meta">
            <div class="task-user-details">
                <div class="task-creator" title="Created by ${creatorName}">
                    <div class="avatar task-user-avatar">${creatorAvatarContent}</div>
                    <div class="user-name-container">
                        <span class="task-user-label">Created by</span>
                        <span class="task-user-name">${creatorName}</span>
                    </div>
                </div>
                <div class="task-assignee" title="Assigned to ${assigneeName}">
                    <div class="avatar task-user-avatar">${assigneeAvatarContent}</div>
                    <div class="user-name-container">
                        <span class="task-user-label">Assigned to</span>
                        <span class="task-user-name">${assigneeName}</span>
                    </div>
                </div>
            </div>
            <div class="task-meta-right">
                <div class="task-created-date" title="Creation date">Created: ${formattedCreatedAt}</div>
                <div class="task-date ${isOverdue ? 'overdue' : ''}" title="Due date">
                    ${isOverdue ? '<span class="overdue-icon" title="Overdue">⚠️</span> ' : ''}Until: ${formattedDate}
                </div>
            </div>
        </div>
    `;
    taskCard.classList.add(`dept-${task.department}`);
    
    if (taskCard.draggable) {
        taskCard.addEventListener('dragstart', handleDragStart);
        taskCard.addEventListener('dragend', handleDragEnd);
    }
    
    const editBtn = taskCard.querySelector('.edit-task-btn');
    if (editBtn) {
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showEditTaskModal(task.id);
        });
    }
    
    container.appendChild(taskCard);
}


function setupDragAndDrop() {
    taskLists.forEach(list => {
        list.addEventListener('dragover', handleDragOver);
        list.addEventListener('dragenter', handleDragEnter);
        list.addEventListener('dragleave', handleDragLeave);
        list.addEventListener('drop', handleDrop);
    });
}

function handleDragStart(e) {
    draggedTask = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.dataset.taskId);
}
function handleDragEnd() { 
    if(draggedTask) {
      draggedTask.classList.remove('dragging');
      draggedTask = null;
    }
}
function handleDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; return false; }
function handleDragEnter(e) { e.preventDefault(); this.classList.add('drag-over'); }
function handleDragLeave() { this.classList.remove('drag-over'); }

function handleDrop(e) {
    e.preventDefault();
    this.classList.remove('drag-over');

    const taskId = e.dataTransfer.getData('text/plain');
    const newStatus = e.currentTarget.dataset.status;
    const taskIndex = tasks.findIndex(task => task.id.toString() === taskId);
    
    if (taskIndex !== -1) {
        const task = tasks[taskIndex];
        const oldStatus = task.status;
        
        const canChangeStatus = currentUser.role === 'manager' || 
                                (task.assignee && task.assignee.toString() === currentUser.id.toString());

        if (!canChangeStatus) {
            showToast("You don't have permission to change the status of this task.", "error");
            if (draggedTask) draggedTask.classList.remove('dragging');
            draggedTask = null;
            return false;
        }

        if (oldStatus !== newStatus) {
            task.status = newStatus;
            saveTasks();
            renderTasks();
            
            const assigneeUser = users.find(u => u.id.toString() === (task.assignee ? task.assignee.toString() : ''));

            addNotification(`Task "${task.title}" moved to ${getStatusName(newStatus)}.`, 'info', currentUser.id);

            if (assigneeUser && assigneeUser.id !== currentUser.id) {
                addNotification(`Task "${task.title}" (assigned to you) was moved to ${getStatusName(newStatus)}.`, 'info', assigneeUser.id);
            }
            
            if (newStatus === 'done') {
                addNotification(`Task "${task.title}" was completed!`, 'success', currentUser.id);
                 if (assigneeUser && assigneeUser.id !== currentUser.id) {
                    addNotification(`Task "${task.title}" (assigned to you) was completed!`, 'success', assigneeUser.id);
                }
            }
        }
    }
    if (draggedTask) draggedTask.classList.remove('dragging');
    draggedTask = null;
    return false;
}


function filterTasks() { renderTasks(); }
function clearDateFilter() { filterDate.value = ''; filterTasks(); }

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3000);
}

function getStatusName(status) {
    switch (status) {
        case 'todo': return 'To Do';
        case 'inprogress': return 'In Progress';
        case 'done': return 'Done';
        default: return capitalizeFirstLetter(status);
    }
}
function capitalizeFirstLetter(string) {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function deleteTask(taskId) {
    if (!taskId) return;
    const taskToDelete = tasks.find(t => t.id.toString() === taskId.toString());
    if (!taskToDelete) {
        showToast('Task not found.', 'error');
        return;
    }

    if (currentUser.role !== 'manager' && taskToDelete.createdBy.toString() !== currentUser.id.toString()) {
        showToast('You do not have permission to delete this task.', 'error');
        return;
    }

    if (confirm(`Are you sure you want to delete the task "${taskToDelete.title}"? This action cannot be undone.`)) {
        tasks = tasks.filter(t => t.id.toString() !== taskId.toString());
        saveTasks();
        closeModal();
        renderTasks();
        
        addNotification(`Task "${taskToDelete.title}" was deleted.`, 'info', currentUser.id);
        
        const assigneeUser = users.find(u => u.id.toString() === (taskToDelete.assignee ? taskToDelete.assignee.toString() : ''));
        if (assigneeUser && assigneeUser.id !== currentUser.id) {
            addNotification(`Task "${taskToDelete.title}" (assigned to you) was deleted by ${currentUser.name}.`, 'info', assigneeUser.id);
        }
        showToast('Task deleted successfully', 'success');
    }
}

document.addEventListener('DOMContentLoaded', init);

const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = `
    .sidebar-notifications-panel.active-transition {
        transform: translateX(0) !important;
        opacity: 1 !important;
        visibility: visible !important;
    }
`;
document.head.appendChild(styleSheet);
