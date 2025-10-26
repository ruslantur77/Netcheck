// components/pages/HomePage.jsx
import React from 'react';
import MainContainer from '../components/MainContainer'; 

// 💡 Принимаем пропсы
function HomePage({ userIp, userLocation, userFullData, isLoading }) { 
    return (
        <MainContainer 
            userIp={userIp}
            userLocation={userLocation}
            userFullData={userFullData}
            isLoading={isLoading}
        /> 
    );
}

export default HomePage;