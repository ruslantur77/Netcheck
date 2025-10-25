// src/App.jsx

import React from 'react';
import Header from './components/Header'; // Импортируем компонент
import './App.css'; // Общие стили приложения (если есть)

function App() {
  // 1. Предположим, что эти данные вы получили от сервера
  const userIp = '178.76.255.88';
  const userLocation = 'Russia (Rostov, Rostov-on-Don)';
  
  // 2. Вставляем компонент Header
  return (
    <div className="App">
      <Header 
        ip={userIp} 
        countryData={userLocation} 
      />
      
      <main>
        {/* Здесь будет остальной контент вашего сайта */}
        <h1>Добро пожаловать на Hackathon Ping Service!</h1>
        {/* ... */}
      </main>
    </div>
  );
}

export default App;
