// components/InputField.jsx

import React from 'react';
import './InputField.css';

// 💡 Принимаем новую функцию onExecute
function InputField({ value, onChange, placeholder = 'К примеру, aeza.ru', onExecute }) {
  
  const handleKeyDown = (event) => {
    // 💡 Если нажата клавиша Enter
    if (event.key === 'Enter') {
      event.preventDefault(); // Предотвращаем стандартное поведение (например, отправку формы)
      if (onExecute) {
        onExecute(); // Вызываем переданную функцию
      }
    }
  };

  return (
    <div className="input-wrapper">
      <input 
        type="text" 
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="main-input" 
        onKeyDown={handleKeyDown} // 💡 Добавляем обработчик
      />
    </div>
  );
}

export default InputField;