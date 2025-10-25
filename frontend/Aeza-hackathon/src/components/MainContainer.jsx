// components/MainContainer.jsx (Обновленный код)

import React, { useState } from 'react';
import InputField from './InputField';
import NavButtons from './NavButtons'; // <--- Импортируем кнопки
import './MainContainer.css';

function MainContainer() {
  const [target, setTarget] = useState('');
  // !!! Состояние для активной вкладки, по умолчанию 'Info'
  const [activeTab, setActiveTab] = useState('Info'); 

  return (
    <div className="main-container">
      
      {/* 1. Поле ввода */}
      <p className="label-text">Введите имя узла или IP адрес:</p>
      <InputField 
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        placeholder="Введите узел или IP адрес"
      />
      
      {/* 2. Кнопки навигации */}
      <p className="label-text buttons-label">Информация для вашего IP:</p>
      <NavButtons 
        activeTab={activeTab} 
        onTabChange={setActiveTab} // Передаем функцию для смены вкладки
      />
      
      {/* 3. Карта и информационные блоки (будет дальше) */}
      <div className="content-map-layout">
          {/* ... */}
      </div>
      
    </div>
  );
}

export default MainContainer;