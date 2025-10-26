// App.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Routes, Route } from 'react-router-dom'; 
import Header from './components/Header';
import './App.css';
import 'leaflet/dist/leaflet.css';


import HomePage from './pages/HomePage';
import SignInPage from './pages/SignInPage';
import AgentsPage from './pages/AgentsPage';

function App() {
  const [userIp, setUserIp] = useState('');
  const [userLocation, setUserLocation] = useState('');
  const [userFullData, setUserFullData] = useState(null); // 💡 НОВОЕ СОСТОЯНИЕ: для полных данных (lat, lon, timezone)
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        
        // 💡 Оптимизированный запрос: получаем IP, геолокацию, координаты (lat/lon) и таймзону за один раз
        const response = await axios.get('http://ip-api.com/json/?fields=status,message,country,regionName,city,query,lat,lon,timezone');
        
        if (response.data.status === 'success') {
          const locationData = response.data;
          const ip = locationData.query;
          const locationString = `${locationData.country} (${locationData.regionName}, ${locationData.city})`;
          
          setUserIp(ip);
          setUserLocation(locationString);
          setUserFullData(locationData); // Сохраняем полные данные для MainContainer
        } else {
          // Если геолокация не удалась, получаем хотя бы IP через ipify
          const ipResponse = await axios.get('https://api.ipify.org?format=json');
          setUserIp(ipResponse.data.ip);
          setUserLocation('Не удалось определить геолокацию');
          setUserFullData(null);
        }

      } catch (error) {
        console.error('Ошибка при получении данных:', error);
        setUserIp('Не удалось определить');
        setUserLocation('Не удалось определить');
        setUserFullData(null);
      } finally {
        setIsLoading(false);
      }
    };

    // 💡 Удалена дублирующая логика fetchAllInOne
    fetchUserData();
  }, []);

  return (
    <div className="App">
      <Header
        ip={isLoading ? 'Загрузка...' : userIp}
        countryData={isLoading ? 'Загрузка...' : userLocation}
      />

      <div className="content-area">
        <Routes>
          <Route 
            path="/" 
            element={
              <HomePage 
                userIp={userIp} 
                userLocation={userLocation} 
                userFullData={userFullData} // 💡 Передаем полные данные
                isLoading={isLoading} // 💡 Передаем статус загрузки
              />
            } 
          />
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/agents" element={<AgentsPage />} />
          <Route path="*" element={
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <h1 style={{ color: 'black' }}>404: Страница не найдена</h1>
              <button 
                onClick={() => window.location.href = '/'}
                style={{
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '24px'
                }}
              >
                Вернуться на главную
              </button>
            </div>
          } />
        </Routes>
      </div>
    </div>
  );
}

export default App;