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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        
        const ipResponse = await axios.get('https://api.ipify.org?format=json');
        const ip = ipResponse.data.ip;
        setUserIp(ip);
        const locationResponse = await axios.get(`http://ip-api.com/json/${ip}?fields=status,message,country,regionName,city,query`);
        
        if (locationResponse.data.status === 'success') {
          const locationData = locationResponse.data;
          const locationString = `${locationData.country} (${locationData.regionName}, ${locationData.city})`;
          setUserLocation(locationString);
        } else {
          throw new Error(locationResponse.data.message);
        }

      } catch (error) {
        console.error('Ошибка при получении данных:', error);
        setUserIp('Не удалось определить');
        setUserLocation('Не удалось определить');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, []);


  const fetchAllInOne = async () => {
    try {
      const response = await axios.get('http://ip-api.com/json/?fields=status,message,country,regionName,city,query');
      if (response.data.status === 'success') {
        const data = response.data;
        setUserIp(data.query);
        setUserLocation(`${data.country} (${data.regionName}, ${data.city})`);
      }
    } catch (error) {
      console.error('Ошибка при получении данных:', error);
    }
  };

  return (
    <div className="App">
      <Header
        ip={isLoading ? 'Загрузка...' : userIp}
        countryData={isLoading ? 'Загрузка...' : userLocation}
      />

      <div className="content-area">
        <Routes>
          <Route path="/" element={<HomePage />} />
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