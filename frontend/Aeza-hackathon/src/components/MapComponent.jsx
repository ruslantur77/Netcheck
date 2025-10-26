// components/MapComponent.jsx 

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
            
            <MapContainer
                center={mapCenter}
                zoom={3}
                scrollWheelZoom={false}
                className="simplemaps-map-canvas" 
            >
                <ChangeView center={mapCenter} />

                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
                />
                
                <Marker 
                    position={mapCenter} 
                    icon={customMarkerIcon} 
                    title={countryData || "IP Location"}
                />

            </MapContainer>
            
            
            <div className="map-overlay-info map-overlay-info--ip">
                IP: <span className="ip-highlight">{displayIPAddress}</span>
            </div>
            
            <div className="map-overlay-info map-overlay-info--country">
                Country: {countryData}
            </div>
            
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