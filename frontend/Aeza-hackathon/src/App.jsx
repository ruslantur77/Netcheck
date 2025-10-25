// App.jsx
import React from 'react';
import { Routes, Route } from 'react-router-dom'; 
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