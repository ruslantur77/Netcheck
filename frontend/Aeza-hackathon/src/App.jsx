// App.jsx
import React from 'react';
import { Routes, Route } from 'react-router-dom'; // Импортируем Routes и Route
import Header from './components/Header';
import './App.css';
import 'leaflet/dist/leaflet.css';

// Импортируем компоненты страниц
import HomePage from './pages/HomePage';
import SignInPage from './pages/SignInPage';
import AgentsPage from './pages/AgentsPage';

function App() {
  const userIp = '178.76.255.88';
  const userLocation = 'Russia (Rostov, Rostov-on-Don)';

  return (
    <div className="App">

      <Header
        ip={userIp}
        countryData={userLocation}
      />

      {/* Контейнер для смены контента */}
      <div className="content-area">
        <Routes>
          {/* Путь: / (Главная страница) */}
          <Route path="/" element={<HomePage />} />
          
          {/* Путь: /signin (Страница входа) */}
          <Route path="/signin" element={<SignInPage />} />
          
          {/* Путь: /agents (Страница админов) */}
          {/* Здесь вам в будущем понадобится защита маршрута (Private Route) */}
          <Route path="/agents" element={<AgentsPage />} />

          {/* Необязательно: Страница 404 */}
          <Route path="*" element={<h1>404: Страница не найдена</h1>} />
        </Routes>
      </div>
    </div>
  );
}

export default App;