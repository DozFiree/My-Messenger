const API_BASE_URL = window.location.origin + '/api';
console.log('API Base URL:', API_BASE_URL);

// Основные элементы DOM
let authForm, chatInterface, loginForm, registerForm;
let currentUser = null;
let currentChat = null;
let accessToken = null;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM загружен, инициализация элементов...');
    console.log('Текущий URL:', window.location.href);
    console.log('Origin:', window.location.origin);
    
    // Инициализация элементов
    initElements();
    
    // Проверка статуса авторизации
    checkAuthStatus();
    
    // Настройка обработчиков событий
    setupEventListeners();
});

// Инициализация DOM элементов
function initElements() {
    console.log('Инициализация элементов...');
    
    authForm = document.getElementById('auth-form');
    chatInterface = document.getElementById('chat');
    loginForm = document.getElementById('login-form');
    registerForm = document.getElementById('register-form');
    
    console.log('Элементы инициализированы');
}

// Проверка статуса авторизации
async function checkAuthStatus() {
    console.log('Проверка статуса авторизации...');
    
    accessToken = localStorage.getItem('access_token');
    currentUser = JSON.parse(localStorage.getItem('current_user'));
    
    if (accessToken && currentUser) {
        console.log('Пользователь авторизован:', currentUser.username);
        
        // Проверяем валидность токена
        try {
            const response = await fetch(`${API_BASE_URL}/users/me`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });
            
            if (response.ok) {
                showChatInterface();
                loadUserData();
                loadChats();
            } else {
                console.log('Токен невалиден, показываем форму входа');
                localStorage.clear();
                showAuthForm();
            }
        } catch (error) {
            console.error('Ошибка проверки токена:', error);
            localStorage.clear();
            showAuthForm();
        }
    } else {
        console.log('Пользователь не авторизован, показываем форму входа');
        showAuthForm();
    }
}

// Показать форму авторизации
function showAuthForm() {
    console.log('Показать форму авторизации');
    
    if (authForm) {
        authForm.style.display = 'flex';
    }
    
    if (chatInterface) {
        chatInterface.style.display = 'none';
    }
    
    // Показываем форму входа по умолчанию
    if (loginForm) {
        loginForm.style.display = 'block';
    }
    if (registerForm) {
        registerForm.style.display = 'none';
    }
}

// Показать интерфейс чата
function showChatInterface() {
    console.log('Показать интерфейс чата');
    
    if (authForm) {
        authForm.style.display = 'none';
    }
    
    if (chatInterface) {
        chatInterface.style.display = 'flex';
    }
}

// Настройка обработчиков событий
function setupEventListeners() {
    console.log('Настройка обработчиков событий...');
    
    // Кнопка входа
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        console.log('Найдена кнопка входа');
        loginBtn.addEventListener('click', login);
        
        // Также добавим обработку нажатия Enter в полях формы
        const loginUsername = document.getElementById('login-username');
        const loginPassword = document.getElementById('login-password');
        
        if (loginUsername && loginPassword) {
            loginUsername.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') login();
            });
            
            loginPassword.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') login();
            });
        }
    }
    
    // Кнопка регистрации
    const registerBtn = document.getElementById('register-btn');
    if (registerBtn) {
        console.log('Найдена кнопка регистрации');
        registerBtn.addEventListener('click', register);
    }
    
    // Переключение между формами
    const showRegisterBtn = document.getElementById('show-register-btn');
    if (showRegisterBtn) {
        showRegisterBtn.addEventListener('click', () => {
            if (loginForm) loginForm.style.display = 'none';
            if (registerForm) registerForm.style.display = 'block';
        });
    }
    
    const showLoginBtn = document.getElementById('show-login-btn');
    if (showLoginBtn) {
        showLoginBtn.addEventListener('click', () => {
            if (registerForm) registerForm.style.display = 'none';
            if (loginForm) loginForm.style.display = 'block';
        });
    }
    
    // Поле поиска
    const searchInput = document.getElementById('search');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(searchUsers, 300));
    }
    
    // Отправка сообщения
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
    
    // Меню для мобильных
    const menuToggle = document.getElementById('menu-toggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            const sidebar = document.getElementById('sidebar');
            sidebar.classList.toggle('open');
        });
    }
    
    // Загрузка файлов
    const fileInput = document.getElementById('file-input');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileUpload);
    }
}

// Дебаунс для поиска
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Функция поиска пользователей
async function searchUsers() {
    console.log('Поиск пользователей...');
    
    const searchInput = document.getElementById('search');
    if (!searchInput) {
        console.error('Поле поиска не найдено');
        return;
    }
    
    const query = searchInput.value.trim();
    console.log('Поисковый запрос:', query);
    
    if (query.length < 1) {
        // Скрываем результаты поиска
        const searchResults = document.getElementById('search-results');
        const userList = document.getElementById('user-list');
        
        if (searchResults) {
            searchResults.style.display = 'none';
        }
        if (userList) {
            userList.innerHTML = '';
        }
        return;
    }
    
    try {
        console.log(`Запрос к API: ${API_BASE_URL}/users/search?q=${encodeURIComponent(query)}`);

        const response = await fetch(`${API_BASE_URL}/users/search?q=${encodeURIComponent(query)}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json'
            },
            signal: AbortSignal.timeout(5000) // Таймаут 5 секунд
        });

        console.log('Статус ответа поиска:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Текст ошибки поиска:', errorText);

            if (response.status === 401) {
                showNotification('Сессия истекла', 'error');
                logout();
                return;
            }

            throw new Error(`Ошибка поиска: ${response.status} - ${errorText}`);
        }

        const users = await response.json();
        console.log('Получены пользователи:', users);
        console.log('Тип данных:', typeof users);

        if (!Array.isArray(users)) {
            console.error('Ожидался массив пользователей, получено:', users);
            throw new Error('Неверный формат данных пользователей');
        }

        console.log('Найдено пользователей:', users.length);

        displaySearchResults(users);

    } catch (error) {
        console.error('Ошибка при поиске пользователей:', error);

        if (error.name === 'AbortError') {
            showNotification('Таймаут поиска. Проверьте соединение.', 'error');
        } else {
            showNotification(`Ошибка поиска: ${error.message}`, 'error');
        }
    }
}

// Отображение результатов поиска
function displaySearchResults(users) {
    console.log('Отображение результатов поиска');
    
    const userList = document.getElementById('user-list');
    const searchResults = document.getElementById('search-results');
    
    if (!userList || !searchResults) {
        console.error('Элементы для отображения результатов не найдены');
        return;
    }
    
    // Очищаем список
    userList.innerHTML = '';
    
    if (users.length === 0) {
        userList.innerHTML = '<li class="empty-search"><i class="fas fa-search"></i> Пользователи не найдены</li>';
    } else {
        users.forEach(user => {
            console.log('Обработка пользователя:', user);

            const userItem = document.createElement('li');
            userItem.className = 'user-item';

            // Используем правильные поля из ответа API
            const userId = user.id || user.user_id;
            const username = user.username || user.name || 'Без имени';
            const email = user.email || '';
            const avatar = user.avatar_path || user.avatar || '/static/img/default-avatar.png';

            userItem.innerHTML = `
                <img src="${avatar}"
                     class="user-avatar"
                     alt="${username}"
                     onerror="this.onerror=null; this.src='/static/img/default-avatar.png'">
                <div class="user-info">
                    <div class="username">${escapeHtml(username)}</div>
                    ${email ? `<div class="email">${escapeHtml(email)}</div>` : ''}
                </div>
                <button class="btn btn-small btn-primary start-chat-btn"
                        data-user-id="${userId}"
                        data-username="${username}">
                    <i class="fas fa-comment"></i>
                </button>
            `;

            userList.appendChild(userItem);
        });

        // Добавляем обработчики для кнопок начала чата
        const startChatBtns = userList.querySelectorAll('.start-chat-btn');
        startChatBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const userId = this.getAttribute('data-user-id');
                const username = this.getAttribute('data-username');
                if (userId && userId !== 'undefined') {
                    startPrivateChat(userId, username);
                } else {
                    showNotification('Не удалось определить ID пользователя', 'error');
                }
            });
        });
    }
    
    // Показываем блок результатов
    searchResults.style.display = 'block';
}

// Начать личный чат
async function startPrivateChat(userId, username) {
    console.log('Начало личного чата с пользователем ID:', userId);
    
    try {
        const response = await fetch(`${API_BASE_URL}/chats/private`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                target_user_id: parseInt(userId)
            })
        });
        
        if (!response.ok) {
            throw new Error(`Ошибка создания чата: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Результат создания чата:', result);
        
        // Очищаем поиск
        const searchInput = document.getElementById('search');
        if (searchInput) {
            searchInput.value = '';
        }
        
        const searchResults = document.getElementById('search-results');
        if (searchResults) {
            searchResults.style.display = 'none';
        }
        
        // Загружаем чаты заново
        loadChats();
        
        // Открываем созданный чат
        if (result.chat_id) {
            openChat(result.chat_id);
        }
        
        showNotification(
            result.is_new ? `Чат с ${username} создан` : `Чат с ${username} уже существует`, 
            'success'
        );
    } catch (error) {
        console.error('Ошибка при создании чата:', error);
        showNotification('Ошибка при создании чата', 'error');
    }
}

// Функция входа
async function login() {
    console.log('Функция login вызвана');
    
    const username = document.getElementById('login-username')?.value;
    const password = document.getElementById('login-password')?.value;
    
    if (!username || !password) {
        showNotification('Введите имя пользователя и пароль', 'error');
        return;
    }
    
    console.log('Попытка входа для пользователя:', username);
    
    try {
        // Показываем индикатор загрузки
        const loginBtn = document.getElementById('login-btn');
        const originalText = loginBtn.innerHTML;
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Вход...';
        loginBtn.disabled = true;

        // Используем window.location.origin для текущего хоста
        const baseUrl = window.location.origin;
        console.log('Текущий origin:', baseUrl);

        const response = await fetch(`${baseUrl}/api/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                password: password
            }),
            // Добавляем таймаут для предотвращения зависания
            signal: AbortSignal.timeout(10000)  // 10 секунд таймаут
        });

        console.log('Ответ от сервера:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Текст ошибки:', errorText);

            let errorMessage = 'Ошибка входа';
            try {
                const errorData = JSON.parse(errorText);
                errorMessage = errorData.detail || errorMessage;
            } catch (e) {
                errorMessage = `Ошибка ${response.status}: ${response.statusText}`;
            }

            throw new Error(errorMessage);
        }

        const data = await response.json();
        console.log('Данные ответа:', data);

        if (data.success) {
            console.log('Успешный вход, данные:', data);

            // Сохраняем токен и данные пользователя
            localStorage.setItem('access_token', data.access_token);
            localStorage.setItem('current_user', JSON.stringify(data.user));

            accessToken = data.access_token;
            currentUser = data.user;

            showChatInterface();
            loadUserData();
            loadChats();

            showNotification('Успешный вход!', 'success');
        } else {
            throw new Error(data.message || 'Ошибка входа');
        }

    } catch (error) {
        console.error('Ошибка при входе:', error);
        console.error('Тип ошибки:', error.name);
        console.error('Сообщение:', error.message);

        // Детальная диагностика
        let userMessage = 'Ошибка при входе';

        if (error.name === 'AbortError' || error.name === 'TimeoutError') {
            userMessage = 'Таймаут подключения. Сервер не отвечает.';
        } else if (error.name === 'TypeError') {
            if (error.message.includes('Failed to fetch')) {
                userMessage = 'Не удалось подключиться к серверу. Проверьте:<br>1. Сервер запущен<br>2. Брандмауэр не блокирует порт 8000<br>3. Правильный IP адрес';
            } else if (error.message.includes('NetworkError')) {
                userMessage = 'Ошибка сети. Проверьте подключение к интернету.';
            }
        } else if (error.message.includes('CORS')) {
            userMessage = 'Ошибка CORS. Сервер не разрешает запросы с этого домена.';
        }

        showNotification(userMessage, 'error');

        // Дополнительный вывод для отладки
        console.log('Диагностика сети:');
        console.log('- window.location.href:', window.location.href);
        console.log('- window.location.hostname:', window.location.hostname);
        console.log('- window.location.port:', window.location.port);

        // Показать диагностическую информацию пользователю
        const networkInfo = document.createElement('div');
        networkInfo.style.marginTop = '10px';
        networkInfo.style.fontSize = '12px';
        networkInfo.style.color = '#888';
        networkInfo.innerHTML = `
            <div>Текущий URL: ${window.location.href}</div>
            <div>Попытка подключения к: ${window.location.origin}/api/login</div>
        `;

        // Найдем контейнер для формы и добавим информацию
        const authForm = document.getElementById('auth-form');
        if (authForm && !authForm.querySelector('.network-info')) {
            networkInfo.className = 'network-info';
            authForm.appendChild(networkInfo);
        }

    } finally {
        // Восстанавливаем кнопку
        const loginBtn = document.getElementById('login-btn');
        if (loginBtn) {
            loginBtn.innerHTML = originalText || '<i class="fas fa-sign-in-alt"></i> Войти';
            loginBtn.disabled = false;
        }
    }
}

// Функция регистрации
async function register() {
    console.log('Функция register вызвана');
    
    const username = document.getElementById('register-username')?.value;
    const email = document.getElementById('register-email')?.value;
    const password = document.getElementById('register-password')?.value;
    const confirmPassword = document.getElementById('register-confirm-password')?.value;
    
    // Валидация
    if (!username || !email || !password || !confirmPassword) {
        showNotification('Заполните все поля', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showNotification('Пароли не совпадают', 'error');
        return;
    }
    
    if (password.length < 6) {
        showNotification('Пароль должен быть не менее 6 символов', 'error');
        return;
    }
    
    console.log('Попытка регистрации пользователя:', username);
    
    try {
        const response = await fetch(`${API_BASE_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                email: email,
                password: password
            })
        });
        
        console.log('Ответ от сервера регистрации:', response.status);
        
        const data = await response.json();
        
        if (response.ok) {
            console.log('Успешная регистрация, данные:', data);
            
            // Переключаемся на форму входа
            if (registerForm) registerForm.style.display = 'none';
            if (loginForm) loginForm.style.display = 'block';
            
            // Заполняем поля для входа
            const loginUsername = document.getElementById('login-username');
            const loginPassword = document.getElementById('login-password');
            
            if (loginUsername) loginUsername.value = username;
            if (loginPassword) loginPassword.value = '';
            
            showNotification('Регистрация успешна! Теперь вы можете войти', 'success');
        } else {
            console.error('Ошибка регистрации:', data.detail);
            showNotification(data.detail || 'Ошибка регистрации', 'error');
        }
    } catch (error) {
        console.error('Ошибка сети при регистрации:', error);
        showNotification('Ошибка сети при регистрации', 'error');
    }
}

// Загрузка данных пользователя
function loadUserData() {
    console.log('Загрузка данных пользователя');
    
    if (!currentUser) {
        console.error('Текущий пользователь не определен');
        return;
    }
    
    // Обновляем аватар и имя в сайдбаре
    const currentUserAvatar = document.getElementById('current-user-avatar');
    const currentUsername = document.getElementById('current-username');
    
    if (currentUserAvatar) {
        currentUserAvatar.src = currentUser.avatar_path 
            ? currentUser.avatar_path 
            : '/static/img/default-avatar.png';
        currentUserAvatar.onerror = function() {
            this.src = '/static/img/default-avatar.png';
        };
    }
    
    if (currentUsername) {
        currentUsername.textContent = currentUser.username;
    }
}

// Загрузка списка чатов
async function loadChats() {
    console.log('Загрузка списка чатов...');
    console.log('Токен доступа:', accessToken ? 'Есть' : 'Нет');
    console.log('API URL:', `${API_BASE_URL}/chats`);

    if (!accessToken) {
        console.error('Токен доступа отсутствует');
        showNotification('Требуется авторизация', 'error');
        return;
    }

    try {
        // Показываем индикатор загрузки
        showLoader('#chat-list', 'Загрузка чатов...');

        const response = await fetch(`${API_BASE_URL}/chats`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            mode: 'cors',
            credentials: 'include'
        });

        console.log('Ответ от сервера:', {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
            url: response.url
        });

        if (!response.ok) {
            if (response.status === 401) {
                console.warn('Токен недействителен, выполняем выход');
                logout();
                showNotification('Сессия истекла. Пожалуйста, войдите снова.', 'error');
                return;
            }

            const errorText = await response.text();
            console.error('Текст ошибки:', errorText);
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Получены данные чатов:', data);

        // Убираем индикатор загрузки
        hideLoader('#chat-list');

        // Проверяем структуру данных
        if (!Array.isArray(data)) {
            console.error('Ожидался массив, получено:', typeof data, data);
            throw new Error('Неверный формат данных. Ожидался массив чатов.');
        }

        displayChats(data);

    } catch (error) {
        console.error('Ошибка при загрузке чатов:', error);
        console.error('Полный стек ошибки:', error.stack);

        // Убираем индикатор загрузки
        hideLoader('#chat-list');

        // Показываем понятное сообщение об ошибке
        let errorMessage = 'Ошибка загрузки чатов';

        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            errorMessage = 'Не удалось подключиться к серверу. Проверьте:<br>' +
                          '1. Сервер запущен<br>' +
                          '2. Адрес: ' + window.location.origin + '<br>' +
                          '3. Брандмауэр не блокирует подключение';
        } else if (error.message.includes('NetworkError')) {
            errorMessage = 'Ошибка сети. Проверьте интернет-подключение.';
        } else {
            errorMessage = error.message;
        }

        showNotification(errorMessage, 'error');

        // Показываем сообщение об ошибке в списке чатов
        const chatList = document.getElementById('chat-list');
        if (chatList) {
            chatList.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <div class="error-title">Ошибка загрузки</div>
                    <div class="error-details">${errorMessage}</div>
                    <button onclick="loadChats()" class="btn-retry">
                        <i class="fas fa-redo"></i> Попробовать снова
                    </button>
                    <button onclick="testConnection()" class="btn-test">
                        <i class="fas fa-wifi"></i> Проверить соединение
                    </button>
                </div>
            `;
        }
    }
}
// Отображение списка чатов
function displayChats(chats) {
    const chatList = document.getElementById('chat-list');
    if (!chatList) {
        console.error('Элемент chat-list не найден');
        return;
    }

    console.log('Отображение чатов:', chats);

    // Очищаем список
    chatList.innerHTML = '';

    if (!chats || chats.length === 0) {
        chatList.innerHTML = `
            <li class="empty-chats">
                <div class="empty-state">
                    <i class="fas fa-comments empty-state-icon"></i>
                    <div class="empty-state-title">Нет чатов</div>
                    <div class="empty-state-description">Начните новый разговор</div>
                </div>
            </li>
        `;
        return;
    }

    // Проверяем структуру первого чата
    if (chats.length > 0) {
        console.log('Структура первого чата:', chats[0]);
        console.log('Ключи первого чата:', Object.keys(chats[0]));
    }

    chats.forEach((chat, index) => {
        console.log(`Обработка чата ${index}:`, chat);

        try {
            const chatItem = document.createElement('li');
            chatItem.className = 'chat-item';
            chatItem.dataset.chatId = chat.id || chat.chat_id || index;

            // Определяем название чата и аватар
            let chatName = chat.chat_name || chat.name || 'Без названия';
            let chatAvatar = chat.chat_avatar || chat.avatar || '/static/img/default-avatar.png';

            // Для личных чатов используем имя собеседника
            if (chat.chat_type === 'private' || chat.type === 'private') {
                chatName = chat.chat_name || chat.name || 'Личный чат';

                // Ищем собеседника
                if (chat.participants && Array.isArray(chat.participants)) {
                    const otherParticipant = chat.participants.find(p => {
                        const participantId = p.id || p.user_id;
                        return participantId !== currentUser?.id;
                    });

                    if (otherParticipant) {
                        chatName = otherParticipant.username || otherParticipant.name || chatName;
                        chatAvatar = otherParticipant.avatar_path ||
                                    otherParticipant.avatar ||
                                    chatAvatar;
                    }
                }
            }

            // Последнее сообщение
            let lastMessage = 'Нет сообщений';
            let lastMessageTime = '';

            if (chat.last_message) {
                const msg = chat.last_message;
                lastMessage = msg.content || 'Файл';
                if (lastMessage.length > 30) {
                    lastMessage = lastMessage.substring(0, 30) + '...';
                }

                try {
                    const messageDate = new Date(msg.created_at || msg.timestamp || Date.now());
                    lastMessageTime = formatTime(messageDate);
                } catch (e) {
                    console.error('Ошибка форматирования времени:', e);
                    lastMessageTime = 'только что';
                }
            }

            // Бейдж непрочитанных сообщений
            let unreadBadge = '';
            if (chat.unread_count > 0) {
                unreadBadge = `<span class="unread-badge">${chat.unread_count}</span>`;
            }

            chatItem.innerHTML = `
                <img src="${chatAvatar}"
                     class="chat-avatar"
                     alt="${chatName}"
                     onerror="this.onerror=null; this.src='/static/img/default-avatar.png'">
                <div class="chat-info">
                    <div class="chat-name-row">
                        <div class="chat-name">${escapeHtml(chatName)}</div>
                        <div class="chat-time">${lastMessageTime}</div>
                    </div>
                    <div class="chat-last-message">${escapeHtml(lastMessage)}</div>
                </div>
                ${unreadBadge}
            `;

            // Обработчик клика по чату
            chatItem.addEventListener('click', () => {
                const chatId = chat.id || chat.chat_id;
                if (chatId) {
                    openChat(chatId);
                } else {
                    console.error('ID чата не определен:', chat);
                    showNotification('Не удалось открыть чат', 'error');
                }
            });

            chatList.appendChild(chatItem);

        } catch (error) {
            console.error(`Ошибка при обработке чата ${index}:`, error);
            console.error('Данные чата:', chat);
        }
    });
}

// Открыть чат
async function openChat(chatId) {
    console.log('Открытие чата ID:', chatId);
    
    if (!chatId) return;
    
    currentChat = chatId;
    
    // Обновляем активный элемент в списке
    const chatItems = document.querySelectorAll('.chat-item');
    chatItems.forEach(item => {
        item.classList.remove('active');
        if (parseInt(item.dataset.chatId) === chatId) {
            item.classList.add('active');
        }
    });
    
    // Загружаем сообщения
    await loadChatMessages(chatId);
    
    // Показываем поле ввода
    const inputArea = document.getElementById('input-area');
    if (inputArea) {
        inputArea.style.display = 'flex';
    }
}

// Загрузка сообщений чата
async function loadChatMessages(chatId) {
    console.log('Загрузка сообщений чата ID:', chatId);

    try {
        const response = await fetch(`${API_BASE_URL}/chats/${chatId}/messages?limit=50`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            throw new Error(`Ошибка загрузки сообщений: ${response.status}`);
        }

        const messages = await response.json();
        console.log('Загружено сообщений:', messages.length);

        displayMessages(messages);
    } catch (error) {
        console.error('Ошибка при загрузке сообщений:', error);
        showNotification('Ошибка при загрузке сообщений', 'error');
    }
}

// Отображение сообщений
function displayMessages(messages) {
    const messagesContainer = document.getElementById('messages');
    if (!messagesContainer) return;
    
    messagesContainer.innerHTML = '';
    
    if (messages.length === 0) {
        messagesContainer.innerHTML = `
            <div class="empty-chat">
                <div class="empty-state">
                    <i class="fas fa-comments empty-state-icon"></i>
                    <div class="empty-state-title">Нет сообщений</div>
                    <div class="empty-state-description">Начните общение</div>
                </div>
            </div>
        `;
        return;
    }
    
    // Группируем сообщения по датам
    const groupedMessages = groupMessagesByDate(messages);
    
    // Отображаем сообщения по группам
    for (const [date, dateMessages] of Object.entries(groupedMessages)) {
        // Добавляем разделитель даты
        const dateDivider = document.createElement('div');
        dateDivider.className = 'message-date-divider';
        dateDivider.innerHTML = `<span>${date}</span>`;
        messagesContainer.appendChild(dateDivider);
        
        // Добавляем сообщения
        dateMessages.forEach(message => {
            const messageElement = createMessageElement(message);
            messagesContainer.appendChild(messageElement);
        });
    }
    
    // Прокручиваем вниз
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Группировка сообщений по дате
function groupMessagesByDate(messages) {
    const groups = {};
    
    messages.forEach(message => {
        const messageDate = new Date(message.created_at);
        const dateKey = formatDate(messageDate);
        
        if (!groups[dateKey]) {
            groups[dateKey] = [];
        }
        
        groups[dateKey].push(message);
    });
    
    return groups;
}

// Создание элемента сообщения
function createMessageElement(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';
    
    // Определяем класс в зависимости от отправителя
    const isOwnMessage = message.sender_id === currentUser?.id;
    messageDiv.classList.add(isOwnMessage ? 'sent' : 'received');
    
    // Форматируем время
    const messageTime = new Date(message.created_at);
    const timeString = formatTime(messageTime);
    
    // Создаем содержимое сообщения
    let messageContent = `<div class="message-content">${escapeHtml(message.content)}</div>`;
    
    // Если есть файл
    if (message.file_path) {
        const fileName = message.file_path.split('/').pop();
        const fileType = message.file_type || 'file';
        
        messageContent += `
            <div class="message-file">
                <div class="file-preview">
                    <i class="fas fa-file ${getFileIcon(fileType)}"></i>
                    <div class="file-info">
                        <div class="file-name">${fileName}</div>
                        <div class="file-size">${getFileSize(message.file_path)}</div>
                    </div>
                    <a href="${message.file_path}" 
                       target="_blank" 
                       class="file-download" 
                       download="${fileName}">
                        <i class="fas fa-download"></i> Скачать
                    </a>
                </div>
            </div>
        `;
    }
    
    messageDiv.innerHTML = `
        <div class="message-info">
            ${!isOwnMessage ? `<span class="message-sender">${message.sender.username}</span>` : ''}
            <span class="message-time">${timeString}</span>
        </div>
        ${messageContent}
    `;
    
    return messageDiv;
}

// Отправка сообщения
async function sendMessage() {
    console.log('Отправка сообщения');
    
    const messageInput = document.getElementById('message-input');
    if (!messageInput || !currentChat) return;
    
    const content = messageInput.value.trim();
    if (!content) {
        showNotification('Введите сообщение', 'error');
        return;
    }
    
    try {
        const formData = new FormData();
        formData.append('chat_id', currentChat);
        formData.append('content', content);
        
        const response = await fetch(`${API_BASE_URL}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            },
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`Ошибка отправки сообщения: ${response.status}`);
        }
        
        const message = await response.json();
        console.log('Сообщение отправлено:', message);
        
        // Очищаем поле ввода
        messageInput.value = '';
        
        // Обновляем сообщения
        await loadChatMessages(currentChat);
        
        // Обновляем список чатов
        loadChats();
        
    } catch (error) {
        console.error('Ошибка при отправке сообщения:', error);
        showNotification('Ошибка при отправке сообщения', 'error');
    }
}

// Обработка загрузки файла
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    console.log('Загрузка файла:', file.name);
    
    // Здесь можно добавить логику предпросмотра файла
    // и отправки его на сервер
}

// Выход из системы
function logout() {
    console.log('Выход из системы');
    
    // Очищаем localStorage
    localStorage.removeItem('access_token');
    localStorage.removeItem('current_user');
    
    // Сбрасываем переменные
    accessToken = null;
    currentUser = null;
    currentChat = null;
    
    // Показываем форму авторизации
    showAuthForm();
    
    showNotification('Вы вышли из системы', 'success');
}

// Уведомления
function showNotification(message, type = 'info') {
    console.log(`Уведомление [${type}]: ${message}`);
    
    // Создаем элемент уведомления
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-icon">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
        </div>
        <div class="notification-content">
            <div class="notification-title">${type === 'success' ? 'Успешно' : type === 'error' ? 'Ошибка' : type === 'warning' ? 'Внимание' : 'Информация'}</div>
            <div class="notification-message">${message}</div>
        </div>
        <button class="notification-close">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Добавляем на страницу
    document.body.appendChild(notification);
    
    // Автоматическое удаление через 5 секунд
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 5000);
    
    // Закрытие по клику
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    });
}

// Вспомогательные функции
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(date) {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
        return 'Сегодня';
    } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Вчера';
    } else {
        return date.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    }
}

function formatTime(date) {
    return date.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getFileIcon(fileType) {
    if (fileType.startsWith('image/')) return 'fa-file-image';
    if (fileType.includes('pdf')) return 'fa-file-pdf';
    if (fileType.includes('word') || fileType.includes('document')) return 'fa-file-word';
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return 'fa-file-excel';
    if (fileType.includes('zip') || fileType.includes('archive')) return 'fa-file-archive';
    return 'fa-file';
}
function showLoader(selector, text = 'Загрузка...') {
    const element = document.querySelector(selector);
    if (element) {
        element.innerHTML = `
            <div class="loader-container">
                <div class="loader"></div>
                <div class="loader-text">${text}</div>
            </div>
        `;
    }
}

// Скрыть индикатор загрузки
function hideLoader(selector) {
    const element = document.querySelector(selector);
    if (element && element.querySelector('.loader-container')) {
        // Просто очищаем, displayChats заполнит заново
        element.innerHTML = '';
    }
}

// Функция тестирования соединения
async function testConnection() {
    console.log('Тестирование соединения...');

    try {
        // Тест 1: Проверка доступности сервера
        const healthResponse = await fetch('/health', {
            method: 'GET',
            cache: 'no-cache'
        });

        // Тест 2: Проверка API
        const apiResponse = await fetch(`${API_BASE_URL}/ping`, {
            method: 'GET',
            cache: 'no-cache'
        });

        const results = {
            server: healthResponse.ok ? '✅ Доступен' : '❌ Недоступен',
            api: apiResponse.ok ? '✅ Работает' : '❌ Ошибка',
            status: healthResponse.status,
            apiStatus: apiResponse.status
        };

        console.log('Результаты теста:', results);

        showNotification(`
            Результаты теста:<br>
            - Сервер: ${results.server}<br>
            - API: ${results.api}<br>
            - Статус: ${results.status}
        `, 'info');

    } catch (error) {
        console.error('Ошибка тестирования:', error);
        showNotification(`Ошибка теста: ${error.message}`, 'error');
    }
}