// components/MainContainer.jsx

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import InputField from './InputField';
import NavButtons from './NavButtons';
import MapComponent from './MapComponent';
import InfoBlock from './InfoBlock';
import './MainContainer.css';
import { createCheck, getCheckResult } from '../utils/api'; // 💡 Реальные API-функции

const DUMMY_DATA = {
    center: [47.2357, 39.712],
    countryData: '-',
    ipAddress: '178.76.255.88',
    dnsAddresses: Array(1).fill('77.52.38.64')
};


const DUMMY_INFO_DATA = [
    { label: 'Host Name', value: '' },
    { label: 'IP Address', value: DUMMY_DATA.ipAddress },
    { label: 'Country', value: '-' },
    { label: 'Region', value: '-' },
    { label: 'Timezone', value: '-' },
];


const CHECK_TYPE_MAP = {
    'Ping': 'PING',
    'HTTP': 'HTTP',
    'TCP port': 'TCP_CONNECT',
    'UDP port': 'UDP port', 
    'DNS': 'DNS',
};
const DEFAULT_PORT_MAP = {
    'HTTP': 80,
    'TCP port': 443, 
    
};


const POLLING_INTERVAL = 1500; 
const MAX_POLLING_DURATION = 30000; 

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


const SERVER_ERROR_DATA = [{ label: 'Ошибка', value: 'Не удалось получить данные от сервера.' }];

function MainContainer({ userIp, userLocation, userFullData, isLoading }) {
    const [target, setTarget] = useState('ya.ru');
    const [activeTab, setActiveTab] = useState('Info');

    const [checkResults, setCheckResults] = useState({}); 
    const [checkLoading, setCheckLoading] = useState(false);
    const [currentTaskId, setCurrentTaskId] = useState(null);
    const [checkStartTime, setCheckStartTime] = useState(null);

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

    const currentInfoData = useMemo(() => createInfoData(userFullData, isLoading), [userFullData, isLoading]);


    const pollCheckResult = useCallback(async (taskId, newTab, checkType, host, port, startTime) => {
        try {
            const result = await getCheckResult(taskId, checkType, host, port);

            if (result.isPending === false) {
                setCheckResults(prev => ({ ...prev, [newTab]: result }));
                setCheckLoading(false);
                setCurrentTaskId(null); 
                return; 
            }

            setCheckResults(prev => ({ 
                ...prev, 
                [newTab]: { 
                    title: newTab.toUpperCase(), 
                    data: [{ label: 'Статус', value: 'Ожидаем результат от агентов...' }] 
                } 
            }));

        
            if (Date.now() - startTime > MAX_POLLING_DURATION) {
                throw new Error('Превышено максимальное время ожидания ответа.');
            }

            setTimeout(() => {
                pollCheckResult(taskId, newTab, checkType, host, port, startTime);
            }, POLLING_INTERVAL);

        } catch (error) {
            console.error('Ошибка при выполнении опроса проверки:', error);
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
    }, []); 


    const startCheck = useCallback(async (newTab) => {
        const checkType = CHECK_TYPE_MAP[newTab];
        if (!checkType) return;

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

            const task = await createCheck(target, checkType, port);
            
            const taskId = task.request_id;
            const startTime = Date.now();
            
            setCurrentTaskId(taskId);
            setCheckStartTime(startTime); 

            pollCheckResult(taskId, newTab, checkType, target, port, startTime);

        } catch (error) {
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


    const handleTabChange = useCallback((newTab) => {
        setActiveTab(newTab);

        if (newTab !== 'Info' && CHECK_TYPE_MAP[newTab] && !checkResults[newTab]) {
            startCheck(newTab);
        }
        if (newTab !== 'Info' && CHECK_TYPE_MAP[newTab] && !checkResults[newTab]) {
            startCheck(newTab);
        }
    }, [startCheck, checkResults]);


    const handleExecute = useCallback(() => {
        if (checkLoading) return;

        if (activeTab === 'Info') {

            handleTabChange('Ping');
        } else {
            startCheck(activeTab);
        }
    }, [activeTab, startCheck, handleTabChange, checkLoading]);


    const getActiveTabData = useCallback((activeTab) => {
        if (activeTab === 'Info') {
            return { title: 'INFO (Ваш IP)', data: currentInfoData };
        }

        if (checkLoading && activeTab !== 'Info') {
            if (checkResults[activeTab]) {
                return checkResults[activeTab]; 
            }
            return { title: activeTab.toUpperCase(), data: [{ label: 'Статус', value: 'Выполняется проверка...' }] };
        }

        if (checkResults[activeTab]) {
            return checkResults[activeTab];
        }

        switch (activeTab) {
            case 'UDP port':
                return { title: 'UDP SCAN (Не реализован)', data: [{ label: 'Статус', value: 'Тип проверки не поддерживается' }] };
            default:
                return { title: activeTab.toUpperCase(), data: [{ label: 'Data', value: 'Нажмите для запуска проверки' }] };
        }
    }, [activeTab, checkLoading, checkResults, currentInfoData]);

    const tabData = getActiveTabData(activeTab);
    const isMultipleBlocks = Array.isArray(tabData);

    const renderBlocks = isMultipleBlocks ? tabData : [tabData];


    return (
        <div className="main-container">

            <p className="label-text">Введите имя узла или IP адрес:</p>
            <InputField
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="Введите узел или IP адрес"
                onExecute={handleExecute} 
            />

            <p className="label-text buttons-label">Информация для вашего IP (Info) или целевого узла (остальные):</p>
            <NavButtons
                activeTab={activeTab}
                onTabChange={handleTabChange}
                disabled={checkLoading}
            />
            <div className="content-map-layout">

                <MapComponent
                    center={currentIpData.center}
                    countryData={currentIpData.countryData}
                    ipAddress={currentIpData.ipAddress}
                    dnsAddresses={currentIpData.dnsAddresses}
                />

                <div className="info-blocks-wrapper">
                    {renderBlocks.map((block, index) => (
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