import React from 'react';
import { useLocation } from '../context/LocationContext';
import { LiveDisasterMap } from '../components/LiveDisasterMap';

export const LiveMapPage: React.FC = () => {
  const { location } = useLocation();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fadeIn">
      {/* Live Disaster Map Component */}
      <LiveDisasterMap
        userDistrict={location?.district || 'Wayanad'}
      />
    </div>
  );
};
