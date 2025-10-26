// components/MainContainer.jsx

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import InputField from './InputField';
import NavButtons from './NavButtons';
import MapComponent from './MapComponent';
import InfoBlock from './InfoBlock';
import './MainContainer.css';
import { createCheck, getCheckResult } from '../utils/api'; // 💡 Реальные API-функции

// --- DUMMY_DATA (Fallback) ---
const DUMMY_DATA = {
    center: [47.2357, 39.712],
    countryData: '-',
    ipAddress: '178.76.255.88',
    dnsAddresses: Array(1).fill('77.52.38.64')
};

// Вспомогательные данные для InfoBlock при ошибке/загрузке
const DUMMY_INFO_DATA = [
    { label: 'Host Name', value: '' },
    { label: 'IP Address', value: DUMMY_DATA.ipAddress },
    { label: 'Country', value: '-' },
    { label: 'Region', value: '-' },
    { label: 'Timezone', value: '-' },
];

// 💡 ПЕРЕМЕННЫЕ: Маппинг в API-типы и стандартный порт
const CHECK_TYPE_MAP = {
    'Ping': 'PING',
    'HTTP': 'HTTP',
    'TCP port': 'TCP_CONNECT',
    'UDP port': 'UDP port', // UDP не реализован в беке
    'DNS': 'DNS',
};
const DEFAULT_PORT_MAP = {
    'HTTP': 80,
    'TCP port': 443, 
    // Остальные не требуют порта или используют его для фильтрации
};

// Константы для логики Polling
const POLLING_INTERVAL = 1500; // 1.5 секунды
const MAX_POLLING_DURATION = 30000; // 30 секунд

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

// 💡 ВСПОМОГАТЕЛЬНЫЙ ОБЪЕКТ ОШИБКИ
const SERVER_ERROR_DATA = [{ label: 'Ошибка', value: 'Не удалось получить данные от сервера.' }];

function MainContainer({ userIp, userLocation, userFullData, isLoading }) {
    const [target, setTarget] = useState('ya.ru');
    const [activeTab, setActiveTab] = useState('Info');

    // 💡 СОСТОЯНИЯ ДЛЯ РЕЗУЛЬТАТОВ ПРОВЕРКИ
    const [checkResults, setCheckResults] = useState({}); // Хранит результаты по типу проверки
    const [checkLoading, setCheckLoading] = useState(false);
    const [currentTaskId, setCurrentTaskId] = useState(null);
    const [checkStartTime, setCheckStartTime] = useState(null);

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


    // --- ЛОГИКА ОПРОСА (GET Polling) ---

    // 💡 Новая вспомогательная функция для выполнения GET-запроса (один цикл опроса)
    const pollCheckResult = useCallback(async (taskId, newTab, checkType, host, port, startTime) => {
        try {
            // Выполняем запрос на получение результата
            const result = await getCheckResult(taskId, checkType, host, port);

            // 1. Успешный результат получен (isPending: false)
            if (result.isPending === false) {
                setCheckResults(prev => ({ ...prev, [newTab]: result }));
                setCheckLoading(false);
                setCurrentTaskId(null); // Очищаем ID, завершаем опрос
                return; 
            }

            // 2. Результат еще не готов (isPending: true)
            // Обновляем статус, что задача создана и ждет ответа
            setCheckResults(prev => ({ 
                ...prev, 
                [newTab]: { 
                    title: newTab.toUpperCase(), 
                    data: [{ label: 'Статус', value: 'Ожидаем результат от агентов...' }] 
                } 
            }));

            // 3. Проверка таймаута
            if (Date.now() - startTime > MAX_POLLING_DURATION) {
                throw new Error('Превышено максимальное время ожидания ответа.');
            }

            // 4. Продолжаем опрос через POLLING_INTERVAL
            setTimeout(() => {
                pollCheckResult(taskId, newTab, checkType, host, port, startTime);
            }, POLLING_INTERVAL);

        } catch (error) {
            // Ошибка API или таймаут
            console.error('Ошибка при выполнении опроса проверки:', error);
            setCheckResults(prev => ({ 
                ...prev, 
                [newTab]: { 
                    title: newTab.toUpperCase(), 
                    data: SERVER_ERROR_DATA 
                } 
            }));
            setCheckLoading(false);
            setCurrentTaskId(null); // Очищаем ID, завершаем опрос
        }
    }, []); 

    // --- ОСНОВНАЯ ЛОГИКА ПРОВЕРКИ (POST + GET Polling) ---

    const startCheck = useCallback(async (newTab) => {
        const checkType = CHECK_TYPE_MAP[newTab];
        if (!checkType) return;

        // 💡 1. Устанавливаем статус "Загрузка" и стартовый мок
        setCheckLoading(true);
        setCheckResults(prev => ({ 
            ...prev, 
            [newTab]: { 
                title: newTab.toUpperCase(), 
                data: [{ label: 'Статус', value: 'Загрузка...' }] 
            } 
        }));
        setCurrentTaskId(null);

        try {
            const port = DEFAULT_PORT_MAP[newTab] || 0;

            // 2. POST /api/v1/check (Создание задачи)
            const task = await createCheck(target, checkType, port);
            
            const taskId = task.request_id;
            const startTime = Date.now();
            
            setCurrentTaskId(taskId);
            setCheckStartTime(startTime); 

            // 3. Инициация опроса (Polling)
            pollCheckResult(taskId, newTab, checkType, target, port, startTime);

        } catch (error) {
            // 💡 Ошибка при POST-запросе (не удалось создать задачу)
            console.error('Ошибка при создании задачи:', error);
            setCheckResults(prev => ({ 
                ...prev, 
                [newTab]: { 
                    title: newTab.toUpperCase(), 
                    data: SERVER_ERROR_DATA 
                } 
            }));
            setCheckLoading(false);
            setCurrentTaskId(null);
        }
    }, [target, pollCheckResult]);


    // --- ОБРАБОТЧИК СМЕНЫ ВКЛАДКИ ---
    const handleTabChange = useCallback((newTab) => {
        setActiveTab(newTab);

        // Если вкладка не "Info" и нет текущего результата, запускаем проверку
        if (newTab !== 'Info' && CHECK_TYPE_MAP[newTab] && !checkResults[newTab]) {
            startCheck(newTab);
        }
         // Если проверка уже идет, но мы переключились на другую вкладку, инициируем ее проверку
        if (newTab !== 'Info' && CHECK_TYPE_MAP[newTab] && !checkResults[newTab]) {
            startCheck(newTab);
        }
    }, [startCheck, checkResults]);


    // 💡 ФУНКЦИЯ: Обработка нажатия Enter в поле ввода
    const handleExecute = useCallback(() => {
        // Если проверка уже идет, не делаем ничего
        if (checkLoading) return;

        // Если пользователь нажимает Enter, перезапускаем текущую проверку
        if (activeTab === 'Info') {
            // Если на Info, запускаем Ping
            handleTabChange('Ping');
        } else {
            // Иначе перезапускаем текущую активную проверку
            startCheck(activeTab);
        }
    }, [activeTab, startCheck, handleTabChange, checkLoading]);


    // --- ФУНКЦИЯ ДЛЯ ОТОБРАЖЕНИЯ ДАННЫХ В КЛЕТКАХ ---
    const getActiveTabData = useCallback((activeTab) => {
        // 1. Вкладка "Info" - данные пользователя
        if (activeTab === 'Info') {
            return { title: 'INFO (Ваш IP)', data: currentInfoData };
        }

        // 2. Вкладка "Загрузка" - статус проверки (приоритет над результатами)
        if (checkLoading && activeTab !== 'Info') {
            // Показываем актуальный статус загрузки, если он был установлен pollCheckResult
            if (checkResults[activeTab]) {
                return checkResults[activeTab]; 
            }
            return { title: activeTab.toUpperCase(), data: [{ label: 'Статус', value: 'Выполняется проверка...' }] };
        }

        // 3. Вкладка "Результат" - готовые данные
        if (checkResults[activeTab]) {
            return checkResults[activeTab];
        }

        // 4. Моковые данные (для UDP и как резерв)
        switch (activeTab) {
            case 'UDP port':
                return { title: 'UDP SCAN (Не реализован)', data: [{ label: 'Статус', value: 'Тип проверки не поддерживается' }] };
            default:
                // Если нет ни результата, ни загрузки, показываем приглашение
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
                onExecute={handleExecute} // Интеграция обработчика Enter
            />

            <p className="label-text buttons-label">Информация для вашего IP (Info) или целевого узла (остальные):</p>
            <NavButtons
                activeTab={activeTab}
                onTabChange={handleTabChange}
                disabled={checkLoading} // 💡 Отключаем кнопки во время загрузки
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
                        // Добавляем класс, чтобы показать, что это загрузка
                        <InfoBlock 
                            key={index} 
                            title={block.title} 
                            data={block.data} 
                            isLoading={checkLoading && activeTab === block.title.split(' ')[0]} 
                        />
                    ))}
                </div>

            </div>

        </div>
    );
}

export default MainContainer;