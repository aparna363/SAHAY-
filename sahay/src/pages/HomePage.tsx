import React from 'react';
import { HeroSection } from '../components/HeroSection';
import { EmergencyQuickBar } from '../components/EmergencyQuickBar';
import { LiveWeatherGrid } from '../components/LiveWeatherGrid';
import { RiverDamStatus } from '../components/RiverDamStatus';
import { PreparednessGuide } from '../components/PreparednessGuide';
import type { Language } from '../translations';

interface HomePageProps {
  currentLang: Language;
  onOpenAlerts: () => void;
  onOpenContacts: () => void;
  onSelectAction: (actionId: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  currentLang,
  onOpenAlerts,
  onOpenContacts,
  onSelectAction,
}) => {
  return (
    <div className="space-y-0 animate-fadeIn">
      {/* Hero Section */}
      <HeroSection currentLang={currentLang} onOpenAlerts={onOpenAlerts} onOpenContacts={onOpenContacts} />

      {/* Emergency Quick Action Bar */}
      <EmergencyQuickBar currentLang={currentLang} onSelectAction={onSelectAction} onOpenContacts={onOpenContacts} />

      {/* Live District Weather Matrix */}
      <LiveWeatherGrid currentLang={currentLang} />

      {/* River Gauges & Dam Status */}
      <RiverDamStatus />

      {/* Preparedness & Safety Handbook */}
      <PreparednessGuide />
    </div>
  );
};
