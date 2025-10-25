// components/InputField.jsx

import React from 'react';
import './InputField.css';

function InputField({ value, onChange, placeholder = 'К примеру, aeza.ru' }) {
  return (
    <div className="input-wrapper">
      <input 
        type="text" 
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="main-input" 
      />
    </div>
  );
}

export default InputField;