// components/MapComponent.jsx (Финальная рабочая версия с Leaflet)

import React from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet'; 
import './MapComponent.css'; 

const DUMMY_CENTER = [47.2357, 39.712]; 
const DUMMY_IP_ADDRESS = '178.76.255.88';


const customMarkerIcon = new L.DivIcon({
    className: 'leaflet-blue-marker', 
    iconSize: [16, 16],
    iconAnchor: [8, 8], 
    popupAnchor: [0, -8],
});

function ChangeView({ center }) {
  const map = useMap();
  map.setView(center, map.getZoom()); 
  return null;
}


function MapComponent({ center, countryData, dnsAddresses, ipAddress }) {
    
    const mapCenter = center || DUMMY_CENTER;
    const displayIPAddress = ipAddress || DUMMY_IP_ADDRESS;
    const displayDNSAddresses = dnsAddresses && dnsAddresses.length > 0 ? dnsAddresses : Array(0).fill('77.52.38.64');

    return (
        <div className="map-wrapper">
            
            {/* 1. КОНТЕЙНЕР КАРТЫ LEAFLET */}
            <MapContainer
                center={mapCenter}
                zoom={3} // Начальный зум (обзор мира)
                scrollWheelZoom={false}
                className="simplemaps-map-canvas" // Используем старый класс для стилей
            >
                {/* Компонент для центрирования карты при изменении center */}
                <ChangeView center={mapCenter} />

                {/* Слой тайлов (Синий фон имитируем стилями) */}
                <TileLayer
                    // Используем стандартные тайлы OpenStreetMap
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
                />
                
                {/* Красный маркер в заданной точке */}
                <Marker 
                    position={mapCenter} 
                    icon={customMarkerIcon} 
                    title={countryData || "IP Location"}
                />

            </MapContainer>
            
            {/* --- Блоки оверлеев (для верстки) --- */}
            
            {/* 1. IP в левом верхнем углу */}
            <div className="map-overlay-info map-overlay-info--ip">
                IP: <span className="ip-highlight">{displayIPAddress}</span>
            </div>
            
            {/* 2. Country (правый верхний угол) */}
            <div className="map-overlay-info map-overlay-info--country">
                Country: {countryData}
            </div>
            
            {/* 3. DNS (слева по центру) */}
            <div className="map-overlay-info map-overlay-info--dns">
                {displayDNSAddresses.map((addr, index) => (
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