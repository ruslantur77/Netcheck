// src/App.jsx

import React from 'react';
import Header from './components/Header';
import MainContainer from './components/MainContainer'; 
import './App.css'; 
import 'leaflet/dist/leaflet.css';

function App() {
  const userIp = '178.76.255.88';
  const userLocation = 'Russia (Rostov, Rostov-on-Don)';
  
  return (
    <div className="App">
      <Header 
        ip={userIp} 
        countryData={userLocation} 
      />
      
      {/* MainContainer теперь содержит всю логику контента, включая поле ввода */}
      <MainContainer /> 
      
    </div>
  );
}

export default App;