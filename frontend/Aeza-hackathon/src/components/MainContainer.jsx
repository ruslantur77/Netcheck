// components/MainContainer.jsx

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import InputField from './InputField';
import NavButtons from './NavButtons';
import MapComponent from './MapComponent';
import InfoBlock from './InfoBlock';
import './MainContainer.css';
import { createCheck, getCheckResult } from '../utils/api'; // 💡 Импортируем моковые функции API

// --- DUMMY_DATA (Fallback) ---
const DUMMY_DATA = {
    center: [47.2357, 39.712],
    countryData: 'Russia (Rostov, Rostov-on-Don)',
    ipAddress: '178.76.255.88',
    dnsAddresses: Array(7).fill('77.52.38.64')
};

// Вспомогательные данные для InfoBlock при ошибке/загрузке
const DUMMY_INFO_DATA = [
    { label: 'Host Name', value: '' },
    { label: 'IP Address', value: DUMMY_DATA.ipAddress },
    { label: 'Country', value: 'Russia' },
    { label: 'Region', value: 'Rostov-on-Don' },
    { label: 'Timezone', value: 'Europe/Moscow' },
];

// 💡 ПЕРЕМЕННЫЕ: Маппинг в API-типы и стандартный порт
const CHECK_TYPE_MAP = {
    'Ping': 'PING',
    'HTTP': 'HTTP',
    'TCP port': 'TCP_CONNECT',
    'UDP port': 'UDP port', // UDP не реализован в моке
    'DNS': 'DNS',
};
const DEFAULT_PORT_MAP = {
    'HTTP': 80,
    'TCP port': 443, // Обычно проверяют 443 или 80
    // Остальные не требуют порта или используют его для фильтрации
};

// Вспомогательная функция для генерации данных вкладки "Info"
const createInfoData = (fullData, isLoading) => {
    if (isLoading) {
        return DUMMY_INFO_DATA.map(item => ({ ...item, value: 'Загрузка...' }));
    }
    if (fullData) {
        return [
            { label: 'Host Name', value: '' },
            { label: 'IP Address', value: fullData.query },
            { label: 'Country', value: fullData.country },
            { label: 'Region', value: fullData.regionName + (fullData.city ? `, ${fullData.city}` : '') },
            { label: 'Timezone', value: fullData.timezone || 'N/A' },
        ];
    }
    return DUMMY_INFO_DATA;
};

function MainContainer({ userIp, userLocation, userFullData, isLoading }) {
    const [target, setTarget] = useState('ya.ru');
    const [activeTab, setActiveTab] = useState('Info');

    // 💡 СОСТОЯНИЯ ДЛЯ РЕЗУЛЬТАТОВ ПРОВЕРКИ
    const [checkResults, setCheckResults] = useState({}); // Хранит результаты по типу проверки
    const [checkLoading, setCheckLoading] = useState(false);
    const [currentTaskId, setCurrentTaskId] = useState(null);

    // 💡 useMemo для данных карты
    const currentIpData = useMemo(() => {
        if (!isLoading && userFullData) {
            return {
                center: [userFullData.lat, userFullData.lon],
                countryData: userLocation,
                ipAddress: userIp,
                dnsAddresses: DUMMY_DATA.dnsAddresses,
            };
        }
        return DUMMY_DATA;
    }, [isLoading, userFullData, userIp, userLocation]);

    // 💡 useMemo для данных вкладки Info
    const currentInfoData = useMemo(() => createInfoData(userFullData, isLoading), [userFullData, isLoading]);


    // --- ОСНОВНАЯ ЛОГИКА ПРОВЕРКИ (POST + GET Polling) ---

    const startCheck = useCallback(async (newTab) => {
        const checkType = CHECK_TYPE_MAP[newTab];
        if (!checkType) return;

        setCheckLoading(true);
        setCheckResults(prev => ({ ...prev, [newTab]: { title: newTab, data: [{ label: 'Статус', value: 'Запускаем задачу...' }] } }));
        setCurrentTaskId(null);

        try {
            const port = DEFAULT_PORT_MAP[newTab] || 0;

            // 1. POST /api/v1/check (Создание задачи)
            const task = await createCheck(target, checkType, port);
            setCurrentTaskId(task.request_id);
            setCheckResults(prev => ({ ...prev, [newTab]: { title: newTab, data: [{ label: 'Статус', value: `Задача ${task.request_id} создана. Ожидаем результат...` }] } }));

            // 2. Имитация GET /api/v1/check/{task_id} (Опрос)
            const result = await getCheckResult(task.request_id, checkType, target, port);

            // 3. Сохранение результата
            setCheckResults(prev => ({ ...prev, [newTab]: result }));

        } catch (error) {
            console.error('Ошибка при выполнении проверки:', error);
            setCheckResults(prev => ({ ...prev, [newTab]: { title: newTab, data: [{ label: 'Ошибка', value: `Не удалось выполнить проверку: ${error.message}` }] } }));
        } finally {
            setCheckLoading(false);
            setCurrentTaskId(null);
        }
    }, [target]);


    // --- ОБРАБОТЧИК СМЕНЫ ВКЛАДКИ ---
    const handleTabChange = useCallback((newTab) => {
        setActiveTab(newTab);

        // Если вкладка не "Info" (т.е. требует API-вызова), запускаем проверку
        if (newTab !== 'Info' && CHECK_TYPE_MAP[newTab]) {
            startCheck(newTab);
        }
    }, [startCheck]);


    // 💡 НОВАЯ ФУНКЦИЯ: Обработка нажатия Enter в поле ввода
    const handleExecute = useCallback(() => {
        // Если пользователь нажимает Enter на вкладке 'Info', переключаемся на 'Ping' и запускаем его
        if (activeTab === 'Info') {
            handleTabChange('Ping');
        } else {
            // Иначе перезапускаем текущую активную проверку
            startCheck(activeTab);
        }
    }, [activeTab, startCheck, handleTabChange]);


    // --- ФУНКЦИЯ ДЛЯ ОТОБРАЖЕНИЯ ДАННЫХ В КЛЕТКАХ ---
    const getActiveTabData = useCallback((activeTab) => {
        // 1. Вкладка "Info" - данные пользователя
        if (activeTab === 'Info') {
            return { title: 'INFO (Ваш IP)', data: currentInfoData };
        }

        // 2. Вкладка "Загрузка" - статус проверки
        if (checkLoading && activeTab !== 'Info') {
            return { title: activeTab.toUpperCase(), data: [{ label: 'Статус', value: 'Выполняется проверка...' }] };
        }

        // 3. Вкладка "Результат" - готовые данные
        if (checkResults[activeTab]) {
            return checkResults[activeTab];
        }

        // 4. Моковые данные (для UDP и как резерв)
        switch (activeTab) {
            case 'UDP port':
                return { title: 'UDP SCAN (МОК)', data: [{ label: 'Port 53', value: 'Open/Filtered' }] };
            default:
                // Если нет ни результата, ни загрузки, показываем пустой мок
                return { title: activeTab.toUpperCase(), data: [{ label: 'Data', value: 'Нажмите для запуска проверки' }] };
        }
    }, [activeTab, checkLoading, checkResults, currentInfoData]);

    const tabData = getActiveTabData(activeTab);
    const isMultipleBlocks = Array.isArray(tabData);

    // Обработка случая, когда результат проверки Ping разбит на несколько блоков
    const renderBlocks = isMultipleBlocks ? tabData : [tabData];


    return (
        <div className="main-container">

            <p className="label-text">Введите имя узла или IP адрес:</p>
            <InputField
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="Введите узел или IP адрес"
                onExecute={handleExecute} // 💡 Интеграция обработчика Enter
            />

            <p className="label-text buttons-label">Информация для вашего IP (Info) или целевого узла (остальные):</p>
            <NavButtons
                activeTab={activeTab}
                onTabChange={handleTabChange}
            />
            <div className="content-map-layout">

                <MapComponent
                    center={currentIpData.center}
                    countryData={currentIpData.countryData}
                    ipAddress={currentIpData.ipAddress}
                    dnsAddresses={currentIpData.dnsAddresses}
                />

                <div className="info-blocks-wrapper">
                    {/* 💡 Отображаем результат проверки */}
                    {renderBlocks.map((block, index) => (
                        <InfoBlock key={index} title={block.title} data={block.data} />
                    ))}
                </div>

            </div>

        </div>
    );
}

export default MainContainer;