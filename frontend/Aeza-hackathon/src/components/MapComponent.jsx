// components/MapComponent.jsx

import React, { useEffect } from 'react';
import './MapComponent.css';

const MAP_CONTAINER_ID = "simplemaps-container"; 
const DUMMY_CENTER = [47.2357, 39.712]; // Ростов-на-Дону

// --- 1. ФУНКЦИЯ ИНИЦИАЛИЗАЦИИ И СТИЛИЗАЦИИ ---
const applyMapSettings = (center, countryData) => {
    // Проверяем, что движок (worldmap.js) и данные (mapdata.js) загружены
    if (window.simplemaps_worldmap && window.simplemaps_worldmap_mapdata) {
        
        const mapData = window.simplemaps_worldmap_mapdata;
        
        // --- 1. ПЕРЕОПРЕДЕЛЕНИЕ СИНЕЙ ТЕМЫ ---
        mapData.main_settings.background_color = "#E6F0FF"; // Светло-голубой фон
        mapData.main_settings.border_color = "#A4C6FF";     // Голубые границы
        mapData.main_settings.state_color = "#A4C6FF";      // Основной цвет стран
        mapData.main_settings.state_hover_color = "#3399FF"; // Цвет при наведении
        
        // --- 2. УДАЛЕНИЕ МЕТКИ ФРАНЦИИ И ДОБАВЛЕНИЕ НОВОГО МАРКЕРА ---
        mapData.main_settings.markers_on = true;
        
        // ПЕРЕЗАПИСЫВАЕМ ОБЪЕКТ МАРКЕРОВ, чтобы удалить все существующие (например, Францию)
        mapData.markers = {
            0: { // ID 0 для нашего единственного маркера
                name: countryData || "IP Location",
                lat: center[0],
                lng: center[1],
                color: "red", // Яркий красный цвет для контраста
                shape: "circle", 
                size: 15 // Увеличим размер для лучшей видимости
            }
        };

        // 3. Инициализация карты
        window.simplemaps_worldmap.draw(MAP_CONTAINER_ID);
    } else {
         console.error("SimpleMaps engine or data not loaded yet.");
    }
};

// --- 2. ОСНОВНОЙ КОМПОНЕНТ ---
function MapComponent({ center, countryData, dnsAddresses, ipAddress }) {
    
    // Используем заглушку, если данные не переданы (чтобы избежать ошибок SimpleMaps)
    const mapCenter = center || DUMMY_CENTER;

    useEffect(() => {
        
        // --- ЗАГРУЗКА СКРИПТОВ В ПРАВИЛЬНОМ ПОРЯДКЕ (Движок -> Данные) ---
        
        // 1. Загрузка движка карты (worldmap.js)
        const engineScript = document.createElement('script');
        engineScript.src = '/worldmap.js'; 
        engineScript.async = false; // Важно: блокирует, чтобы обеспечить порядок

        engineScript.onload = () => {
            // 2. После загрузки движка, загружаем данные (mapdata.js)
            const dataScript = document.createElement('script');
            dataScript.src = '/mapdata.js';
            dataScript.async = false;
            
            // 3. После загрузки данных, применяем настройки и рисуем карту
            dataScript.onload = () => {
                applyMapSettings(mapCenter, countryData);
            };
            document.body.appendChild(dataScript);
        };

        document.body.appendChild(engineScript);

        // Очистка
        return () => {
            document.body.removeChild(engineScript);
            // Дополнительная очистка, если mapdata.js был загружен
            const dataScript = document.querySelector(`script[src="/mapdata.js"]`);
            if (dataScript) {
                document.body.removeChild(dataScript);
            }
        };
    }, [mapCenter, countryData]);


    return (
        <div className="map-wrapper">
            
            {/* Контейнер, куда SimpleMaps будет рисовать карту */}
            <div 
                id={MAP_CONTAINER_ID} 
                className="simplemaps-map-canvas"
            >
                {/* Карта будет встроена здесь */}
            </div>
            
            {/* --- Блоки оверлеев (для макета) --- */}
            
            {/* 1. IP в левом верхнем углу (как на макете) */}
            <div className="map-overlay-info map-overlay-info--ip">
                IP: <span className="ip-highlight">{ipAddress}</span>
            </div>
            
            {/* 2. Country (правый верхний угол) */}
            <div className="map-overlay-info map-overlay-info--country">
                Country: {countryData}
            </div>
            
            {/* 3. DNS (слева по центру) */}
            <div className="map-overlay-info map-overlay-info--dns">
                {dnsAddresses.map((addr, index) => (
                    <div key={index} className="dns-entry">
                        <span className="dns-label">IP addresses</span>
                        <span className="dns-value">{addr}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default MapComponent;