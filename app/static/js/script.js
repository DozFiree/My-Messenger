const API_BASE = '/api';
let currentUser = null;
let currentChatId = null;

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    console.log('Страница загружена');


    console.log('login-btn:', document.getElementById('login-btn'));
    console.log('register-btn:', document.getElementById('register-btn'));
    console.log('show-register-btn:', document.getElementById('show-register-btn'));
    console.log('show-login-btn:', document.getElementById('show-login-btn'));

    setupEventListeners();
    checkAuthStatus();
});

function setupEventListeners() {
    console.log('Настройка обработчиков...');

    // Кнопки формы
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const showRegisterBtn = document.getElementById('show-register-btn');
    const showLoginBtn = document.getElementById('show-login-btn');

    if (loginBtn) {
        loginBtn.addEventListener('click', login);
        console.log('Обработчик login добавлен');
    }

    if (registerBtn) {
        registerBtn.addEventListener('click', register);
        console.log('Обработчик register добавлен');
    }

    if (showRegisterBtn) {
        showRegisterBtn.addEventListener('click', showRegisterForm);
        console.log('Обработчик showRegisterForm добавлен');
    }

    if (showLoginBtn) {
        showLoginBtn.addEventListener('click', showLoginForm);
        console.log('Обработчик showLoginForm добавлен');
    }

    // Поиск
    const search = document.getElementById('search');
    if (search) {
        search.addEventListener('input', searchUsers);
    }

    // Отправка сообщений
    const sendBtn = document.getElementById('send-btn');
    if (sendBtn) {
        sendBtn.addEventListener('click', sendMessage);
    }

    const messageInput = document.getElementById('message-input');
    if (messageInput) {
        messageInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    // Файлы
    const fileBtn = document.getElementById('file-btn');
    const fileInput = document.getElementById('file-input');
    if (fileBtn && fileInput) {
        fileBtn.addEventListener('click', function() {
            fileInput.click();
        });
    }

    // Группа
    const createGroupBtn = document.getElementById('create-group-btn');
    if (createGroupBtn) {
        createGroupBtn.addEventListener('click', createGroup);
    }

    // Меню
    const menuToggle = document.getElementById('menu-toggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', toggleSidebar);
    }
}

// Проверка авторизации
async function checkAuthStatus() {
    const token = localStorage.getItem('token');
    if (!token) {
        showAuthForm();
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/users/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const user = await response.json();
            currentUser = user;
            showChatInterface();
        } else {
            localStorage.removeItem('token');
            showAuthForm();
        }
    } catch (error) {
        console.error('Auth error:', error);
        showAuthForm();
    }
}

function showAuthForm() {
    document.getElementById('auth-form').style.display = 'block';
    document.getElementById('chat').style.display = 'none';
    showLoginForm();
}

function showLoginForm() {
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('register-form').style.display = 'none';
}

function showRegisterForm() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
}

function showChatInterface() {
    document.getElementById('auth-form').style.display = 'none';
    document.getElementById('chat').style.display = 'flex';

    if (currentUser) {
        document.getElementById('current-username').textContent = currentUser.username;
    }

    loadUserChats();
}

// Вход
async function login() {
    console.log('Функция login вызвана');

    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    if (!username || !password) {
        alert('Введите имя пользователя и пароль');
        return;
    }

    try {
        console.log('Отправка запроса на вход...');
        const response = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        console.log('Ответ:', data);

        if (response.ok) {
            localStorage.setItem('token', data.access_token);
            currentUser = data.user;
            showChatInterface();
            alert('Вход выполнен!');
        } else {
            alert(data.detail || 'Ошибка входа');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Ошибка сети');
    }
}

// Регистрация
async function register() {
    console.log('Функция register вызвана');

    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;

    if (!username || !email || !password || !confirmPassword) {
        alert('Заполните все поля');
        return;
    }

    if (password !== confirmPassword) {
        alert('Пароли не совпадают');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            alert('Регистрация успешна! Теперь войдите');
            showLoginForm();
            document.getElementById('login-username').value = username;
        } else {
            alert(data.detail || 'Ошибка регистрации');
        }
    } catch (error) {
        console.error('Register error:', error);
        alert('Ошибка сети');
    }
}

// Загрузка чатов
async function loadUserChats() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/chats`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const chats = await response.json();
            displayChats(chats);
        }
    } catch (error) {
        console.error('Load chats error:', error);
    }
}

function displayChats(chats) {
    const chatList = document.getElementById('chat-list');
    chatList.innerHTML = '';

    chats.forEach(chat => {
        const li = document.createElement('li');
        li.textContent = chat.chat_name || 'Чат';
        li.style.cursor = 'pointer';
        li.style.padding = '10px';
        li.addEventListener('click', function() {
            selectChat(chat);
        });
        chatList.appendChild(li);
    });
}

function selectChat(chat) {
    currentChatId = chat.id;
    document.getElementById('chat-title').textContent = chat.chat_name || 'Чат';
    loadChatMessages();
}

async function loadChatMessages() {
    if (!currentChatId) return;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/chats/${currentChatId}/messages?limit=50`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const messages = await response.json();
            displayMessages(messages);
        }
    } catch (error) {
        console.error('Load messages error:', error);
    }
}

function displayMessages(messages) {
    const messagesContainer = document.getElementById('messages');
    messagesContainer.innerHTML = '';

    messages.forEach(msg => {
        const div = document.createElement('div');
        div.style.margin = '10px';
        div.style.padding = '10px';
        div.style.background = msg.sender_id === currentUser.id ? '#d1ecf1' : '#f8d7da';
        div.textContent = `${msg.sender.username}: ${msg.content}`;
        messagesContainer.appendChild(div);
    });
}

async function searchUsers() {
    const query = document.getElementById('search').value;
    if (!query) return;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/users/search?q=${encodeURIComponent(query)}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const users = await response.json();
            displaySearchResults(users);
        }
    } catch (error) {
        console.error('Search error:', error);
    }
}

function displaySearchResults(users) {
    const userList = document.getElementById('user-list');
    userList.innerHTML = '';

    users.forEach(user => {
        const li = document.createElement('li');
        li.textContent = user.username;
        li.style.cursor = 'pointer';
        li.style.padding = '10px';
        li.addEventListener('click', function() {
            startPrivateChat(user);
        });
        userList.appendChild(li);
    });
}

async function startPrivateChat(user) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/chats/private`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ target_user_id: user.id })
        });

        const data = await response.json();

        if (response.ok) {
            currentChatId = data.chat_id;
            document.getElementById('chat-title').textContent = user.username;
            loadChatMessages();
        }
    } catch (error) {
        console.error('Start chat error:', error);
        alert('Ошибка создания чата');
    }
}

async function sendMessage() {
    if (!currentChatId) {
        alert('Выберите чат');
        return;
    }

    const messageInput = document.getElementById('message-input');
    const content = messageInput.value.trim();

    if (!content) {
        alert('Введите сообщение');
        return;
    }

    const formData = new FormData();
    formData.append('chat_id', currentChatId);
    formData.append('content', content);

    const fileInput = document.getElementById('file-input');
    if (fileInput.files[0]) {
        formData.append('file', fileInput.files[0]);
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (response.ok) {
            messageInput.value = '';
            fileInput.value = '';
            loadChatMessages();
        }
    } catch (error) {
        console.error('Send error:', error);
        alert('Ошибка отправки');
    }
}

async function createGroup() {
    const name = prompt('Название группы:');
    if (!name) return;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/chats/group`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, user_ids: [currentUser.id] })
        });

        if (response.ok) {
            alert('Группа создана');
            loadUserChats();
        }
    } catch (error) {
        console.error('Create group error:', error);
        alert('Ошибка создания группы');
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.style.display = sidebar.style.display === 'none' ? 'block' : 'none';
}

function logout() {
    localStorage.removeItem('token');
    currentUser = null;
    currentChatId = null;
    showAuthForm();
}


window.login = login;
window.register = register;
window.logout = logout;
window.showLoginForm = showLoginForm;
window.showRegisterForm = showRegisterForm;
window.searchUsers = searchUsers;
window.sendMessage = sendMessage;
window.createGroup = createGroup;
window.toggleSidebar = toggleSidebar;