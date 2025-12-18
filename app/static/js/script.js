const API_BASE = '/api';
let currentUser = null;
let currentChatId = null;
let currentChatType = null;
let secretKey = 'mySecretKey123'; // В реальности это должен быть динамический ключ
let messagePollingInterval = null;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    setupEventListeners();
});

// Проверка авторизации
function checkAuthStatus() {
    const token = localStorage.getItem('token');
    if (token) {
        // Проверяем токен через API
        fetch(`${API_BASE}/users/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => {
            if (response.ok) {
                return response.json();
            }
            throw new Error('Not authenticated');
        })
        .then(user => {
            currentUser = user;
            showChatInterface();
            loadUserChats();
            startMessagePolling();
        })
        .catch(() => {
            localStorage.removeItem('token');
            showAuthForm();
        });
    } else {
        showAuthForm();
    }
}

// Показать форму авторизации
function showAuthForm() {
    document.getElementById('auth-form').style.display = 'flex';
    document.getElementById('chat').style.display = 'none';
}

// Показать интерфейс чата
function showChatInterface() {
    document.getElementById('auth-form').style.display = 'none';
    document.getElementById('chat').style.display = 'flex';
    document.getElementById('current-username').textContent = currentUser.username;
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Авторизация
    document.getElementById('login-btn').addEventListener('click', login);
    document.getElementById('register-btn').addEventListener('click', register);

    // Поиск
    document.getElementById('search').addEventListener('input', searchUsers);

    // Отправка сообщений
    document.getElementById('send-btn').addEventListener('click', sendMessage);
    document.getElementById('message-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Загрузка файлов
    document.getElementById('file-btn').addEventListener('click', () => {
        document.getElementById('file-input').click();
    });

    document.getElementById('file-input').addEventListener('change', (e) => {
        if (e.target.files[0]) {
            sendMessage();
        }
    });

    // Создание группы
    document.getElementById('create-group-btn').addEventListener('click', createGroup);

    // Переключение сайдбара (мобильная версия)
    document.getElementById('menu-toggle').addEventListener('click', toggleSidebar);
}

// Шифрование/дешифрование
function encrypt(text) {
    return CryptoJS.AES.encrypt(text, secretKey).toString();
}

function decrypt(encrypted) {
    try {
        const bytes = CryptoJS.AES.decrypt(encrypted, secretKey);
        return bytes.toString(CryptoJS.enc.Utf8) || '[Невозможно расшифровать]';
    } catch (e) {
        return '[Ошибка расшифровки]';
    }
}

// Вход в систему
async function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (!username || !password) {
        showNotification('Введите имя пользователя и пароль', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.access_token);
            currentUser = data.user;
            showChatInterface();
            loadUserChats();
            startMessagePolling();
            showNotification('Вход выполнен успешно!', 'success');
        } else {
            showNotification(data.detail || 'Ошибка входа', 'error');
        }
    } catch (error) {
        showNotification('Ошибка сети', 'error');
        console.error('Login error:', error);
    }
}

// Регистрация
async function register() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const email = document.getElementById('email').value;

    if (!username || !password || !email) {
        showNotification('Заполните все поля', 'error');
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
            showNotification('Регистрация успешна! Теперь войдите', 'success');
            document.getElementById('email').value = '';
        } else {
            showNotification(data.detail || 'Ошибка регистрации', 'error');
        }
    } catch (error) {
        showNotification('Ошибка сети', 'error');
        console.error('Register error:', error);
    }
}

// Поиск пользователей
async function searchUsers() {
    const query = document.getElementById('search').value;

    if (query.length < 1) {
        document.getElementById('user-list').innerHTML = '';
        return;
    }

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

// Отображение результатов поиска
function displaySearchResults(users) {
    const userList = document.getElementById('user-list');
    userList.innerHTML = '';

    users.forEach(user => {
        const li = document.createElement('li');
        li.className = 'user-item';
        li.innerHTML = `
            <img src="${user.avatar_path || '/static/img/default-avatar.png'}"
                 class="user-avatar"
                 onerror="this.src='/static/img/default-avatar.png'">
            <span>${user.username}</span>
        `;
        li.addEventListener('click', () => startPrivateChat(user));
        userList.appendChild(li);
    });
}

// Начать личный чат
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
            currentChatType = 'private';
            loadChatMessages();
            updateChatHeader(user.username, user.avatar_path);
            toggleSidebar(); // Закрыть сайдбар на мобилке
        }
    } catch (error) {
        console.error('Start chat error:', error);
        showNotification('Ошибка создания чата', 'error');
    }
}

// Создать групповой чат
async function createGroup() {
    const name = prompt('Введите название группы:');
    if (!name) return;

    // Здесь нужно добавить логику выбора участников
    const user_ids = []; // Заполните ID выбранных пользователей

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/chats/group`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, user_ids })
        });

        if (response.ok) {
            showNotification('Группа создана', 'success');
            loadUserChats();
        }
    } catch (error) {
        console.error('Create group error:', error);
        showNotification('Ошибка создания группы', 'error');
    }
}

// Загрузка чатов пользователя
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

// Отображение списка чатов
function displayChats(chats) {
    const chatList = document.getElementById('chat-list');
    chatList.innerHTML = '';

    chats.forEach(chat => {
        const li = document.createElement('li');
        li.className = 'chat-item';
        li.dataset.chatId = chat.id;
        li.dataset.chatType = chat.chat_type;

        // Определяем название чата и аватар
        let chatName = chat.chat_name;
        let chatAvatar = chat.chat_avatar;

        if (chat.chat_type === 'private') {
            const otherUser = chat.participants.find(p => p.id !== currentUser.id);
            if (otherUser) {
                chatName = otherUser.username;
                chatAvatar = otherUser.avatar_path;
            }
        }

        li.innerHTML = `
            <img src="${chatAvatar || '/static/img/default-avatar.png'}"
                 class="user-avatar"
                 onerror="this.src='/static/img/default-avatar.png'">
            <div style="flex: 1;">
                <div style="font-weight: bold;">${chatName}</div>
                <div style="font-size: 0.9rem; opacity: 0.8;">
                    ${chat.last_message ? decrypt(chat.last_message.content).substring(0, 30) + '...' : 'Нет сообщений'}
                </div>
            </div>
            ${chat.unread_count > 0 ? `<span class="unread-badge">${chat.unread_count}</span>` : ''}
        `;

        li.addEventListener('click', () => selectChat(chat));
        chatList.appendChild(li);
    });
}

// Выбор чата
function selectChat(chat) {
    currentChatId = chat.id;
    currentChatType = chat.chat_type;

    // Определяем название для заголовка
    let chatName = chat.chat_name;
    let chatAvatar = chat.chat_avatar;

    if (chat.chat_type === 'private') {
        const otherUser = chat.participants.find(p => p.id !== currentUser.id);
        if (otherUser) {
            chatName = otherUser.username;
            chatAvatar = otherUser.avatar_path;
        }
    }

    updateChatHeader(chatName, chatAvatar);
    loadChatMessages();
    toggleSidebar(); // Закрыть сайдбар на мобилке
}

// Обновление заголовка чата
function updateChatHeader(name, avatar) {
    document.getElementById('chat-title').textContent = name;
    document.getElementById('chat-avatar').src = avatar || '/static/img/default-avatar.png';
}

// Загрузка сообщений чата
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

// Отображение сообщений
function displayMessages(messages) {
    const messagesContainer = document.getElementById('messages');
    messagesContainer.innerHTML = '';

    messages.forEach(message => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.sender_id === currentUser.id ? 'sent' : 'received'}`;

        const decryptedContent = decrypt(message.content);
        const time = new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        messageDiv.innerHTML = `
            <div class="message-info">
                <img src="${message.sender.avatar_path || '/static/img/default-avatar.png'}"
                     class="message-sender-avatar"
                     onerror="this.src='/static/img/default-avatar.png'">
                <span>${message.sender.username}</span>
                <span class="message-time">${time}</span>
            </div>
            <div class="message-content">${decryptedContent}</div>
            ${message.file_path ?
                `<a href="${message.file_path}" class="file-link" target="_blank">
                    <i class="fas fa-download"></i> Скачать файл
                </a>` : ''}
        `;

        messagesContainer.appendChild(messageDiv);
    });

    // Прокрутка вниз
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Отправка сообщения
async function sendMessage() {
    if (!currentChatId) {
        showNotification('Выберите чат для отправки сообщения', 'warning');
        return;
    }

    const messageInput = document.getElementById('message-input');
    const fileInput = document.getElementById('file-input');
    const content = messageInput.value.trim();
    const file = fileInput.files[0];

    if (!content && !file) return;

    const formData = new FormData();
    formData.append('chat_id', currentChatId);

    if (content) {
        const encryptedContent = encrypt(content);
        formData.append('content', encryptedContent);
    }

    if (file) {
        formData.append('file', file);
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
        } else {
            showNotification('Ошибка отправки сообщения', 'error');
        }
    } catch (error) {
        console.error('Send message error:', error);
        showNotification('Ошибка сети', 'error');
    }
}

// Опрос новых сообщений
function startMessagePolling() {
    if (messagePollingInterval) {
        clearInterval(messagePollingInterval);
    }

    messagePollingInterval = setInterval(() => {
        if (currentChatId) {
            loadChatMessages();
        }
        loadUserChats(); // Обновляем список чатов для счетчиков непрочитанных
    }, 5000); // Каждые 5 секунд
}

// Показать уведомление
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Переключение сайдбара (мобильная версия)
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('open');
}

// Выход из системы
function logout() {
    localStorage.removeItem('token');
    currentUser = null;
    currentChatId = null;

    if (messagePollingInterval) {
        clearInterval(messagePollingInterval);
        messagePollingInterval = null;
    }

    showAuthForm();
    showNotification('Вы вышли из системы', 'info');
}

// Экспорт функций для HTML
window.login = login;
window.register = register;
window.searchUser = searchUsers;
window.sendMessage = sendMessage;
window.createGroup = createGroup;
window.toggleSidebar = toggleSidebar;
window.logout = logout;