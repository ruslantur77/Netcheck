// components/NavButtons.jsx

import React from 'react';
import './NavButtons.css';

// Список всех кнопок для удобства
const BUTTONS = [
    'Info',
    'Ping',
    'HTTP',
    'TCP port',
    'UDP port',
    'DNS'
];

/**
 * Компонент панели навигации с кнопками
 * @param {string} activeTab - Имя активной вкладки
 * @param {function} onTabChange - Функция-обработчик клика
 */
function NavButtons({ activeTab, onTabChange }) {
  return (
    <div className="button-bar">
      {BUTTONS.map((tab) => (
        <button
          key={tab}
          className={`nav-button ${activeTab === tab ? 'active' : ''}`}
          onClick={() => onTabChange(tab)}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}

export default NavButtons;