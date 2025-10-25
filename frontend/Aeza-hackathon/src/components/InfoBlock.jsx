// components/InfoBlock.jsx

import React from 'react';
import './InfoBlock.css';

/**
 * Компонент для отображения одного информационного блока
 * @param {string} title - Заголовок блока (например, "INFO" или "PING STATUS")
 * @param {Array<Object>} data - Массив объектов { label: string, value: string }
 */
function InfoBlock({ title, data }) {
  return (
    <div className="info-block">
      <h3 className="info-block__title">{title}</h3>
      <div className="info-block__content">
        {data.map((item, index) => (
          <div key={index} className="info-block__entry">
            <span className="info-block__label">{item.label}</span>
            <span className="info-block__value">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default InfoBlock;