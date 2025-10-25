// src/components/pages/SignInPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios'; // Используем стандартный импорт axios

// --- Заглушки Компонентов (замените на свои реальные компоненты) ---

// 1. Заглушка для Logo
const Logo = () => <h1 style={{ marginBottom: '20px', color: '#333' }}>Project Logo</h1>;

// 2. Заглушка для AuthInput
// В реальном проекте этот компонент должен управлять состоянием вводом
const AuthInput = ({ title, type, isWrong, value, onChange }) => (
  <div style={{ marginBottom: '15px' }}>
    <label style={{ display: 'block', textAlign: 'left', marginBottom: '5px' }}>
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
      }}
    />
  </div>
);

// 3. Заглушка для ErrorMessage
const ErrorMessage = ({ message }) => (
  <p style={{ color: 'red', marginBottom: '15px', fontSize: '0.9em' }}>
    {message}
  </p>
);

// 4. Заглушка для Button (Стилизован в синем цвете)
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
    }}
  >
    {loading ? 'Загрузка...' : title}
  </button>
);

// --- Основной Компонент SignInPage ---

const ERROR_MESSAGES = {
  400: 'Неверный формат запроса. Проверьте введённые данные.',
  422: 'Неверный формат запроса. Проверьте введённые данные.',
  401: 'Неправильный логин или пароль.',
  404: 'Сервис авторизации недоступен.',
  500: 'Ошибка на сервере. Попробуйте позже.',
};

function SignInPage() {
  const navigate = useNavigate();

  // Состояния для полей ввода
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Состояния для ошибок валидации
  const [emailWrong, setEmailWrong] = useState(false);
  const [passwordWrong, setPasswordWrong] = useState(false);

  // Состояние для загрузки и общей ошибки
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Валидация полей
  const validateFields = () => {
    const isEmailValid = !!email.trim();
    const isPasswordValid = !!password.trim();

    setEmailWrong(!isEmailValid);
    setPasswordWrong(!isPasswordValid);

    return isEmailValid && isPasswordValid;
  };

  // Обработка отправки формы
  const handleSubmit = async (event) => {
    event.preventDefault();

    // Сброс предыдущих ошибок
    setEmailWrong(false);
    setPasswordWrong(false);
    setErrorMessage('');

    if (!validateFields()) return;

    setLoading(true);

    try {
      // Использование FormData для отправки данных (как в оригинальном Vue коде)
      const form = new FormData();
      form.append('username', email); // Обратите внимание: Vue использовал 'username' для email
      form.append('password', password);

      // Предполагая, что ваш axios настроен для baseURL. Если нет, используйте полный URL.
      const response = await axios.post('/api/auth/login', form, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      // Успешный вход
      const accessToken = response.data.access_token;
      localStorage.setItem('token', accessToken);
      
      // Настройка заголовка Authorization для всех последующих запросов
      axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      
      // Перенаправление на страницу агентов (или куда нужно, например, /agents)
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
          
          {/* Удален блок регистрации, как вы просили */}
        </form>
      </div>
    </div>
  );
}

export default SignInPage;