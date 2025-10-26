// components/MainContainer.jsx

import React, { useState, useMemo, useCallback } from 'react';
import InputField from './InputField';
import NavButtons from './NavButtons';
import MapComponent from './MapComponent'; 
import InfoBlock from './InfoBlock';     
import './MainContainer.css';

// --- DUMMY_DATA (Fallback) ---
const DUMMY_DATA = {
    center: [47.2357, 39.712],
    countryData: 'Russia (Rostov, Rostov-on-Don)',
    ipAddress: '178.76.255.88',
    dnsAddresses: Array(7).fill('77.52.38.64') 
};

const DUMMY_INFO_DATA = [
    { label: 'Host Name', value: '' },
    { label: 'IP Address', value: DUMMY_DATA.ipAddress },
    { label: 'Country', value: 'Russia' },
    { label: 'Region', value: 'Rostov-on-Don' },
    { label: 'Timezone', value: 'Europe/Moscow' },
];

const DUMMY_PING_DATA = [
    { label: 'Status', value: 'Success' },
    { label: 'Sent', value: '4 packets' },
    { label: 'Received', value: '4 packets' },
    { label: 'Loss', value: '0 packets (0% loss)' },
    { label: 'Min/Avg/Max', value: '5ms/10ms/15ms' },
];

const DUMMY_HTTP_DATA = [
    { label: 'Status', value: '200 OK' },
    { label: 'Server', value: 'nginx' },
    { label: 'Response Time', value: '85 ms' },
];

// 💡 Вспомогательная функция для генерации данных вкладки "Info"
const createInfoData = (fullData, isLoading) => {
    if (isLoading) {
        return DUMMY_INFO_DATA.map(item => ({ ...item, value: 'Загрузка...' }));
    }
    // Если данные получены успешно
    if (fullData) {
        return [
            { label: 'Host Name', value: '' },
            { label: 'IP Address', value: fullData.query },
            { label: 'Country', value: fullData.country },
            { label: 'Region', value: fullData.regionName + (fullData.city ? `, ${fullData.city}` : '') },
            { label: 'Timezone', value: fullData.timezone || 'N/A' },
        ];
    }
    // Если загрузка завершена, но данные не получены (ошибка)
    return DUMMY_INFO_DATA; 
};


function MainContainer({ userIp, userLocation, userFullData, isLoading }) { // 💡 Принимаем пропсы
    const [target, setTarget] = useState('ya.ru');
    const [activeTab, setActiveTab] = useState('Info');

    // 💡 useMemo для вычисления текущих данных IP и геолокации
    const currentIpData = useMemo(() => {
        if (!isLoading && userFullData) {
            return {
                center: [userFullData.lat, userFullData.lon],
                countryData: userLocation,
                ipAddress: userIp,
                dnsAddresses: DUMMY_DATA.dnsAddresses, // DNS пока остаются моковыми
            };
        }
        return DUMMY_DATA; // Fallback на моковые данные или данные "Загрузка..."
    }, [isLoading, userFullData, userIp, userLocation]);
    
    // 💡 useMemo для вычисления данных вкладки Info
    const currentInfoData = useMemo(() => createInfoData(userFullData, isLoading), [userFullData, isLoading]);


    const getActiveTabData = useCallback((activeTab) => {
        switch(activeTab) {
            case 'Info':
                 // 💡 Используем реальные данные
                return { title: 'INFO', data: currentInfoData };
            case 'Ping':
                return [
                    { title: 'PING STATUS', data: DUMMY_PING_DATA },
                    { title: 'LATENCY CHART', data: [{ label: 'Graph', value: 'Coming soon...' }] }
                ];
            case 'HTTP':
                return { title: 'HTTP DETAILS', data: DUMMY_HTTP_DATA };
            case 'TCP port':
                return { title: 'TCP SCAN', data: [{ label: 'Port 80', value: 'Open' }, { label: 'Port 443', value: 'Open' }] };
            case 'UDP port':
                return { title: 'UDP SCAN', data: [{ label: 'Port 53', value: 'Open/Filtered' }] };
            case 'DNS':
                return { title: 'DNS RECORDS', data: [{ label: 'A Record', value: currentIpData.ipAddress }] }; // 💡 Используем реальный IP
            default:
                return { title: activeTab, data: [{ label: 'Data', value: `No data for ${activeTab}` }] };
        }
    }, [currentInfoData, currentIpData.ipAddress]); // Зависимости для пересчета tabData

    const tabData = getActiveTabData(activeTab);
    const isMultipleBlocks = Array.isArray(tabData);

    return (
        <div className="main-container">
            
            <p className="label-text">Введите имя узла или IP адрес:</p>
            <InputField 
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="Введите узел или IP адрес"
            />
            
            <p className="label-text buttons-label">Информация для вашего IP:</p>
            <NavButtons 
                activeTab={activeTab} 
                onTabChange={setActiveTab}
            />
            <div className="content-map-layout">
                
                <MapComponent 
                    // 💡 Передаем актуальные данные
                    center={currentIpData.center}
                    countryData={currentIpData.countryData}
                    ipAddress={currentIpData.ipAddress}
                    dnsAddresses={currentIpData.dnsAddresses}
                />
                
                <div className="info-blocks-wrapper">
                    {isMultipleBlocks ? (
                        tabData.map((block, index) => (
                            <InfoBlock key={index} title={block.title} data={block.data} />
                        ))
                    ) : (
                        <InfoBlock title={tabData.title} data={tabData.data} />
                    )}
                </div>
                
            </div>
            
        </div>
    );
}

export default MainContainer;