// components/NavButtons.jsx

import React from 'react';
import './NavButtons.css';

const BUTTONS = [
    'Info',
    'Ping',
    'HTTP',
    'TCP port',
    'UDP port',
    'DNS'
];

/**
 * @param {string} activeTab 
 * @param {function} onTabChange 
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