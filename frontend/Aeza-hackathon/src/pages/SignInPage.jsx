// src/components/pages/SignInPage.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { setGlobalNavigator } from '../utils/api'; 


const Logo = () => (
    <div style={{ marginBottom: '1.5em', marginTop: '1.5em' }}>
        <img
            src="/logo.svg"
            alt="Project Logo"
            style={{ margin: '0 auto' }}
        />
        <h2 style={{
            marginTop: '20px',
            marginBottom: '10px',
            color: '#000',
            fontFamily: 'JetBrains Mono, monospace',
            fontWeight: 'bold'
        }}>
            Вход для администраторов
        </h2>
    </div>
);


const AuthInput = ({ title, type, isWrong, value, onChange }) => (
    <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', textAlign: 'left', marginBottom: '5px', fontFamily: 'JetBrains Mono, monospace', color: '#000' }}>
            {title.charAt(0).toUpperCase() + title.slice(1)}
        </label>
        <input
            type={type}
            placeholder={title}
            value={value}
            onChange={onChange}
            style={{
                width: '100%',
                padding: '10px',
                border: `1px solid ${isWrong ? 'red' : '#ccc'}`,
                borderRadius: '4px',
                boxSizing: 'border-box',
                fontFamily: 'JetBrains Mono, monospace', 
                color: '#000', 
            }}
        />
    </div>
);

const ErrorMessage = ({ message }) => (
    <p style={{ color: 'red', marginBottom: '15px', fontSize: '0.9em', fontFamily: 'JetBrains Mono, monospace' }}>
        {message}
    </p>
);

const Button = ({ title, type, loading, onClick }) => (
    <button
        type={type}
        disabled={loading}
        onClick={onClick}
        style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#007bff', 
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '1em',
            fontWeight: 'bold',
            marginTop: '10px',
            opacity: loading ? 0.6 : 1,
            transition: 'background-color 0.3s',
            fontFamily: 'JetBrains Mono, monospace', 
        }}
    >
        {loading ? 'Загрузка...' : title}
    </button>
);


const ERROR_MESSAGES = {
    400: 'Неверный формат запроса. Проверьте введённые данные.',
    422: 'Неверный формат запроса. Проверьте введённые данные.',
    401: 'Неправильный логин или пароль.',
    404: 'Сервис авторизации недоступен.',
    500: 'Ошибка на сервере. Попробуйте позже.',
};

function SignInPage() {
    const navigate = useNavigate();
    useEffect(() => {
        setGlobalNavigator(navigate);
    }, [navigate]); 

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [emailWrong, setEmailWrong] = useState(false);
    const [passwordWrong, setPasswordWrong] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const validateFields = () => {
        const isEmailValid = !!email.trim();
        const isPasswordValid = !!password.trim();
        setEmailWrong(!isEmailValid);
        setPasswordWrong(!isPasswordValid);
        return isEmailValid && isPasswordValid;
    };

    // 💡 Используем НАСТРОЕННЫЙ API вместо заглушки
    const handleSubmit = async (event) => {
        event.preventDefault();

        setEmailWrong(false);
        setPasswordWrong(false);
        setErrorMessage('');

        if (!validateFields()) return;

        setLoading(true);

        try {
            // Использование FormData для отправки данных (как в оригинальном Vue коде)
            const form = new FormData();
            form.append('username', email); // Соответствует бэкенду
            form.append('password', password);

            // ⚠️ Используем наш настроенный 'api' (с интерсепторами)
            // Добавляем skipRefresh: true, чтобы не обновлять токен во время самого логина.
            const response = await api.post('/api/auth/login', form, { 
                skipRefresh: true,
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            // Успешный вход
            const accessToken = response.data.access_token;
            localStorage.setItem('token', accessToken);
            
            // Настройка заголовка Authorization для всех последующих запросов (для текущего экземпляра 'api')
            api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
            
            // Перенаправление на страницу агентов
            navigate('/agents'); 
        } catch (err) {
            // Отображение ошибок валидации для полей
            setEmailWrong(true);
            setPasswordWrong(true);

            // Обработка ошибок сервера
            if (err.response) {
                const status = err.response.status;
                setErrorMessage(
                    ERROR_MESSAGES[status] || 'Произошла неизвестная ошибка.'
                );
            } else {
                setErrorMessage('Не удалось подключиться к серверу.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-wrapper">
            <div className="auth-page">
                <Logo />
                <form noValidate onSubmit={handleSubmit}>
                    <AuthInput
                        title="email"
                        type="email"
                        isWrong={emailWrong}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <AuthInput
                        title="password"
                        type="password"
                        isWrong={passwordWrong}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />

                    {errorMessage && <ErrorMessage message={errorMessage} />}

                    <Button title="Вход" type="submit" loading={loading} />
                </form>
            </div>
        </div>
    );
}

export default SignInPage;