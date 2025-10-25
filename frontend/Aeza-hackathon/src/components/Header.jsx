import React from 'react';
import './Header.css';

/**
 * Компонент шапки, отображающий IP-адрес и местоположение пользователя.
 * @param {string} ip - IP-адрес
 * @param {string} countryData - Данные о стране и городе
 */
function Header({ ip, countryData }) {
  return (
    <header className="header">
      <div className="header__content">
        {/* Блок с IP-адресом */}
        <p className="header__text">
          IP: 
          <span className="header__ip-box">
            {ip}
          </span>
        </p>
        
        {/* Блок с данными о стране */}
        <p className="header__text header__country">
          Country: {countryData}
        </p>
      </div>
    </header>
  );
}

export default Header;