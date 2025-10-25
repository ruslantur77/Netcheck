// src/components/pages/AgentsPage.jsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
// import api from '../../utils/api'; // ⚠️ Отключаем реальный API
import { useNavigate } from 'react-router-dom';

const MOCK_AGENTS_DATA = {
    items: [
        {
            id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
            api_key: 'sk-d5X9yA2pL8qB3cR7zW4eG1tJ0hF6kM0',
            name: 'Agent-Europe-01',
            status: 'active', 
            registered_at: '2025-09-01T10:00:00Z',
        },
        {
            id: '8a2b1c4d-9e6f-47a3-b8d1-0f2c7e5a9b8c',
            api_key: 'sk-a7F0vE4uI9oP1qY5sH2jL3nM6xB8cD2',
            name: 'Agent-USA-Dallas',
            status: 'inactive', 
            registered_at: '2025-09-15T12:30:00Z',
        },
        {
            id: '5f6d7e8a-1b2c-3d4e-5f6a-7b8c9d0e1f2a',
            api_key: 'sk-zW1xC9vB5nK2mL7jH4gF0dA3sE6rT9y',
            name: 'Agent-Asia-Tokyo',
            status: 'setup', 
            registered_at: '2025-10-20T09:00:00Z',
        },
    ],
};

const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('ru-RU', { timeZoneName: 'short' });
};

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
                            <td key={col.fieldName} style={{ 
                                padding: '10px', 
                                color: '#000',
                                fontFamily: (col.fieldName === 'api_key' || col.fieldName === 'id') ? 'monospace' : 'JetBrains Mono, monospace'
                            }}>
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

const Button = ({ title, onClick, disabled = false, style: customStyle = {} }) => (
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
            ...customStyle, // Для переопределения стилей
        }}
    >
        {title}
    </button>
);


const AgentModal = ({ isOpen, onClose, onAddAgent, name, setName }) => {
    if (!isOpen) return null;

    const overlayStyle = {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        tabIndex: -1,
    };

    const contentStyle = {
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '8px',
        width: '400px',
        maxWidth: '90%',
        boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)',
        position: 'relative',
        fontFamily: 'JetBrains Mono, monospace',
    };

    const closeButtonStyle = {
        position: 'absolute',
        top: '10px',
        right: '15px',
        border: 'none',
        backgroundColor: 'transparent',
        fontSize: '1.5em',
        cursor: 'pointer',
        fontWeight: 'bold',
        color: '#333',
        lineHeight: '1',
    };

    const inputStyle = {
        width: '100%',
        padding: '10px',
        margin: '10px 0 20px 0',
        borderRadius: '4px',
        border: '1px solid #ccc',
        boxSizing: 'border-box',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '1em',
    };
    
    const addButtonStyles = {
        padding: '10px 20px',
        backgroundColor: '#007bff', 
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '1em',
        fontWeight: 'bold',
        fontFamily: 'JetBrains Mono, monospace',
        float: 'right',
        marginTop: '0', 
    };

    return (
        <div style={overlayStyle} onClick={onClose}>
            <div style={contentStyle} onClick={(e) => e.stopPropagation()}>
                <button style={closeButtonStyle} onClick={onClose}>&times;</button>
                <h2 style={{ marginTop: 0, fontSize: '1.2em', color: 'black' }}>Добавить нового Агента</h2>
                <div style={{ marginBottom: '10px' }}>
                    <label>
                    <h4 style={{ marginTop: 0, fontSize: '1.2em', color: 'black' }}> Название агента:</h4>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Например, s1tr1ing1"
                            style={inputStyle}
                        />
                    </label>
                </div>
                
                <button 
                    style={addButtonStyles} 
                    onClick={onAddAgent}
                    disabled={!name.trim()}
                >
                    Добавить
                </button>
            </div>
        </div>
    );
};


const AGENT_COLUMNS = [
    { fieldName: 'id', columnName: 'ID' },
    { fieldName: 'name', columnName: 'Название' },
    { fieldName: 'api_key', columnName: 'Ключ API' }, 
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
        fieldName: 'registered_at', 
        columnName: 'Дата регистрации',
        formatter: (item) => formatDate(item.registered_at)
    },
];

function AgentsPage() {
    const navigate = useNavigate();
    
    const [agents, setAgents] = useState([]);
    const [errorMessage, setErrorMessage] = useState('');
    const [activeAgent, setActiveAgent] = useState(null); 
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newAgentName, setNewAgentName] = useState('');
    
    const loadAgents = useCallback(async () => {
        await new Promise(resolve => setTimeout(resolve, 500)); 
        
        setAgents(MOCK_AGENTS_DATA.items);
        setErrorMessage('');
    }, []);
    
    
    const handleCloseModal = () => {
        setIsModalOpen(false);
        setNewAgentName(''); 
    };

    const openCreateModal = () => {
        setIsModalOpen(true);
        setNewAgentName(''); 
        setActiveAgent(null); 
    };

    const handleAddAgent = () => {
        if (!newAgentName.trim()) {
            setErrorMessage('Имя агента не может быть пустым.');
            return;
        }
        const newAgent = {
            id: `mock-${Date.now()}`, 
            api_key: `sk-mock-${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 5)}`,
            name: newAgentName.trim(),
            status: 'setup', 
            registered_at: new Date().toISOString(),
        };

        setAgents(prev => [newAgent, ...prev]);
        setErrorMessage(`[МОК] Агент "${newAgent.name}" успешно добавлен!`);

        handleCloseModal();
    };

    // --- Обработчики действий (прочие) ---

    const handleShowAgent = (agent) => {
        console.log('Клик по агенту:', agent);
        // В реальном проекте: открыли бы модальное окно с деталями агента
        setActiveAgent({ ...agent }); 
        setErrorMessage(`[МОК] Вы кликнули по агенту: ${agent.name}. Детали в консоли.`);
    };

    const handleAgentDelete = (id) => {
        if (!window.confirm(`[МОК] Вы уверены, что хотите удалить агента ID: ${id}?`)) return;

        console.log(`[МОК] Удаляем агента ${id}...`);
        
        const updatedItems = agents.filter(item => item.id !== id);
        setAgents(updatedItems);
        
        setErrorMessage(`[МОК] Агент ${id} удален!`);
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
                    items={agents} 
                    columns={AGENT_COLUMNS} 
                    onItemClick={handleShowAgent}
                    onAction={handleAgentDelete} 
                />
                
                <Button 
                    title="Добавить Агента" 
                    onClick={openCreateModal} 
                />
                
                <AgentModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    onAddAgent={handleAddAgent}
                    name={newAgentName}
                    setName={setNewAgentName}
                />
            </div>
        </div>
    );
}

export default AgentsPage;