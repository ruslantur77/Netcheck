// components/InputField.jsx

import React from 'react';
import './InputField.css';

function InputField({ value, onChange, placeholder = 'К примеру, aeza.ru', onExecute }) {
  
  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault(); 
      if (onExecute) {
        onExecute();
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
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}

export default InputField;