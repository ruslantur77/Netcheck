// src/components/pages/AgentsPage.jsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
// import api from '../../utils/api'; // ⚠️ Отключаем реальный API
import { useNavigate } from 'react-router-dom';

// --- Моковые Данные (для демонстрации) ---
const MOCK_AGENTS_DATA = {
    items: [
        {
            id: 1,
            name: 'Agent-Europe-01',
            region: 'Germany (Frankfurt)',
            local_ip: '192.168.1.10',
            public_ip: '87.165.4.21',
            status: 'active', // Активен
            last_heartbeat: '2025-10-25T17:55:00Z',
            created_at: '2025-09-01T10:00:00Z',
        },
        {
            id: 2,
            name: 'Agent-USA-Dallas',
            region: 'USA (Dallas, TX)',
            local_ip: '172.16.0.5',
            public_ip: '104.28.1.12',
            status: 'inactive', // Неактивен
            last_heartbeat: '2025-10-25T16:00:00Z',
            created_at: '2025-09-15T12:30:00Z',
        },
        {
            id: 3,
            name: 'Agent-Asia-Tokyo',
            region: 'Japan (Tokyo)',
            local_ip: '10.0.0.8',
            public_ip: '133.12.3.45',
            status: 'setup', // Ожидание
            last_heartbeat: '2025-10-25T17:59:00Z',
            created_at: '2025-10-20T09:00:00Z',
        },
    ],
    // Пагинационные поля удалены
};
// ------------------------------------------

// --- Функции-заглушки для форматирования ---
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('ru-RU', { timeZoneName: 'short' });
};
// -------------------------------------------

// --- Заглушки Компонентов (без изменений, кроме удаления Pagination) ---

const Table = ({ items, columns, onAction, onItemClick }) => {
    if (!items || items.length === 0) {
        return <p style={{ textAlign: 'center', marginTop: '30px', fontFamily: 'JetBrains Mono, monospace' }}>Нет активных агентов.</p>;
    }

    return (
        <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse', 
            marginTop: '20px', 
            fontFamily: 'JetBrains Mono, monospace',
            borderRadius: '8px',
            overflow: 'hidden', 
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)' 
        }}>
            <thead>
                <tr style={{ 
                    backgroundColor: '#007bff', 
                    color: 'white', 
                    borderBottom: '2px solid #ccc' 
                }}>
                    {columns.map(col => (
                        <th key={col.fieldName} style={{ 
                            padding: '12px 10px', 
                            textAlign: 'left', 
                            fontWeight: '700' 
                        }}>{col.columnName}</th>
                    ))}
                    <th style={{ 
                        padding: '12px 10px', 
                        textAlign: 'right', 
                        fontWeight: '700' 
                    }}>Действия</th>
                </tr>
            </thead>
            <tbody>
                {items.map(item => (
                    <tr 
                        key={item.id} 
                        style={{ 
                            borderBottom: '1px solid #ddd', 
                            cursor: 'pointer',
                            transition: 'background-color 0.2s',
                            backgroundColor: 'white', 
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                        onClick={() => onItemClick(item)} 
                    >
                        {columns.map(col => (
                            <td key={col.fieldName} style={{ padding: '10px', color: '#000' }}>
                                {col.formatter ? col.formatter(item) : item[col.fieldName]}
                            </td>
                        ))}
                        <td style={{ padding: '10px', textAlign: 'right' }}>
                            <button
                                onClick={(e) => { e.stopPropagation(); onAction(item.id, 'delete'); }}
                                style={{ 
                                    backgroundColor: 'red', 
                                    color: 'white', 
                                    border: 'none', 
                                    padding: '5px 10px', 
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontFamily: 'JetBrains Mono, monospace'
                                }}
                            >
                                Удалить
                            </button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

const ErrorMessage = ({ message }) => (
    <p style={{ color: 'red', marginBottom: '15px', fontSize: '0.9em', fontFamily: 'JetBrains Mono, monospace' }}>
        {message}
    </p>
);

const Button = ({ title, onClick, disabled = false }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        style={{
            padding: '10px 20px',
            backgroundColor: '#007bff', 
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: disabled ? 'not-allowed' : 'pointer',
            fontSize: '1em',
            fontWeight: 'bold',
            marginTop: '20px',
            fontFamily: 'JetBrains Mono, monospace',
        }}
    >
        {title}
    </button>
);

// Компонент Pagination удален, так как пагинация больше не используется.

// --- КОНФИГУРАЦИЯ СТОЛБЦОВ ---
const AGENT_COLUMNS = [
    { fieldName: 'name', columnName: 'Название' },
    { fieldName: 'region', columnName: 'Геолокация' },
    { 
        fieldName: 'status', 
        columnName: 'Статус',
        formatter: (item) => {
            if (item.status === 'active') return 'Активен';
            if (item.status === 'inactive') return 'Неактивен';
            if (item.status === 'setup') return 'Первоначальная настройка';
            return 'N/A';
        }
    },
    { 
        fieldName: 'last_heartbeat', 
        columnName: 'Хартбит',
        formatter: (item) => formatDate(item.last_heartbeat)
    },
    { fieldName: 'public_ip', columnName: 'IP' },
    { 
        fieldName: 'created_at', 
        columnName: 'Дата создания',
        formatter: (item) => formatDate(item.created_at)
    },
];

function AgentsPage() {
    const navigate = useNavigate();
    
    // 💡 Упрощенное состояние: только список агентов
    const [agents, setAgents] = useState([]);
    
    const [errorMessage, setErrorMessage] = useState('');
    const [activeAgent, setActiveAgent] = useState(null); 
    
    // --- Логика Загрузки: загружаем все данные сразу (без пагинации) ---
    const loadAgents = useCallback(async () => {
        // Симулируем задержку сети
        await new Promise(resolve => setTimeout(resolve, 500)); 
        
        // Загружаем все items
        setAgents(MOCK_AGENTS_DATA.items);
        setErrorMessage('');
    }, []);

    // --- Обработчики действий (заглушки) ---

    const openCreateModal = () => {
        console.log('Кнопка "Добавить Агента" нажата. Открываем модалку...');
        setActiveAgent({}); 
    };

    const handleShowAgent = (agent) => {
        console.log('Клик по агенту:', agent);
        setActiveAgent({ ...agent }); 
    };

    const handleAgentDelete = (id) => {
        if (!window.confirm(`[МОК] Вы уверены, что хотите удалить агента ID: ${id}?`)) return;

        console.log(`[МОК] Удаляем агента ${id}...`);
        
        const updatedItems = agents.filter(item => item.id !== id);
        setAgents(updatedItems);
        
        setErrorMessage(`[МОК] Агент ${id} удален! (В консоли)`);
        setActiveAgent(null);
    };
    
    useEffect(() => {
        loadAgents();
    }, [loadAgents]); 

    return (
        <div className="agents-wrapper">
            
            <div className="agents-page">
                <h1 style={{ fontFamily: 'JetBrains Mono, monospace', color: '#000', marginTop: '4rem' }}>Управление Агентами</h1>
                
                {errorMessage && <ErrorMessage message={errorMessage} />}
                
                <Table 
                    items={agents} // Используем обновленный state
                    columns={AGENT_COLUMNS} 
                    onItemClick={handleShowAgent}
                    onAction={handleAgentDelete} 
                />
                
                <Button 
                    title="Добавить Агента" 
                    onClick={openCreateModal} 
                />
                
            </div>
        </div>
    );
}

export default AgentsPage;