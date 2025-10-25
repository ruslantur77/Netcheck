// src/components/pages/SignInPage.jsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
// import axios from 'axios'; // Комментируем, чтобы использовать заглушку

// --- Заглушки Компонентов (без изменений, кроме шрифта) ---

// 1. Заглушка для Logo
// Добавляем стиль font-family для применения JetBrains Mono
const Logo = () => (
    <div style={{ marginBottom: '1.5em', marginTop: '1.5em' }}>
        {/* Ссылка на logo.svg в папке public */}
        <img
            src="/logo.svg"
            alt="Project Logo"
            style={{ margin: '0 auto' }}
        />
        {/* Добавляем заголовок "Вход" под логотипом */}
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

// 2. Заглушка для AuthInput (Добавлен стиль font-family)
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
                fontFamily: 'JetBrains Mono, monospace', // Применяем шрифт
                color: '#000', // Черный текст
            }}
        />
    </div>
);

// 3. Заглушка для ErrorMessage (Добавлен стиль font-family)
const ErrorMessage = ({ message }) => (
    <p style={{ color: 'red', marginBottom: '15px', fontSize: '0.9em', fontFamily: 'JetBrains Mono, monospace' }}>
        {message}
    </p>
);

// 4. Заглушка для Button (Без изменений, так как он синий)
const Button = ({ title, type, loading, onClick }) => (
    <button
        type={type}
        disabled={loading}
        onClick={onClick}
        style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#007bff', // Синий цвет
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '1em',
            fontWeight: 'bold',
            marginTop: '10px',
            opacity: loading ? 0.6 : 1,
            transition: 'background-color 0.3s',
            fontFamily: 'JetBrains Mono, monospace', // Применяем шрифт
        }}
    >
        {loading ? 'Загрузка...' : title}
    </button>
);

// --- Основной Компонент SignInPage ---

const ERROR_MESSAGES = {
    // ... (оставляем для валидации, если решим использовать для заглушки)
    401: 'Неправильный логин или пароль. (Заглушка)'
};


function SignInPage() {
    const navigate = useNavigate();

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

    // --- Функция-заглушка для симуляции HTTP-запроса ---
    const mockLogin = () => {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                // Условие для симуляции успеха: email='admin@test.com', password='password'
                if (email === 'admin@test.com' && password === 'password') {
                    // Симуляция успешного ответа с токеном
                    resolve({ data: { access_token: 'mock-admin-token-12345' } });
                } else {
                    // Симуляция ошибки 401 (Неправильный логин/пароль)
                    reject({ response: { status: 401 } });
                }
            }, 1500); // Задержка 1.5 секунды для демонстрации loading
        });
    };
    // --------------------------------------------------------

    const handleSubmit = async (event) => {
        event.preventDefault();

        setEmailWrong(false);
        setPasswordWrong(false);
        setErrorMessage('');

        if (!validateFields()) return;

        setLoading(true);

        try {
            // Использование ЗАГЛУШКИ вместо axios.post
            const response = await mockLogin();

            // Успешный вход
            const accessToken = response.data.access_token;
            localStorage.setItem('token', accessToken);

            // В реальном проекте вы бы тут настраивали axios, но для заглушки это не обязательно:
            // axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

            // Перенаправление на страницу агентов
            navigate('/agents');
        } catch (err) {
            // Отображение ошибок валидации для полей
            setEmailWrong(true);
            setPasswordWrong(true);

            // Обработка ошибок заглушки
            if (err.response && err.response.status === 401) {
                setErrorMessage(ERROR_MESSAGES[401]);
            } else {
                setErrorMessage('Произошла ошибка при попытке входа (Заглушка).');
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