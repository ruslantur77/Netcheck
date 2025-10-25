// components/MainContainer.jsx

import React, { useState } from 'react';
import InputField from './InputField';
import NavButtons from './NavButtons';
import MapComponent from './MapComponent'; 
import InfoBlock from './InfoBlock';     
import './MainContainer.css';

// --- ЗАГЛУШКИ ДАННЫХ ---
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

const getActiveTabData = (activeTab) => {
    switch(activeTab) {
        case 'Info':
            return { title: 'INFO', data: DUMMY_INFO_DATA };
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
            return { title: 'DNS RECORDS', data: [{ label: 'A Record', value: DUMMY_DATA.ipAddress }] };
        default:
            return { title: activeTab, data: [{ label: 'Data', value: `No data for ${activeTab}` }] };
    }
};

function MainContainer() {
  const [target, setTarget] = useState('ya.ru');
  const [activeTab, setActiveTab] = useState('Info');

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
            center={DUMMY_DATA.center}
            countryData={DUMMY_DATA.countryData}
            ipAddress={DUMMY_DATA.ipAddress}
            dnsAddresses={DUMMY_DATA.dnsAddresses}
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