import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Language } from '../translations';

export type SystemTheme = 'light' | 'dark' | 'system';
export type AccentColor = 'green' | 'blue' | 'purple';
export type SidebarState = 'expanded' | 'collapsed' | 'compact';
export type DefaultMapType = 'street' | 'satellite' | 'terrain';

export interface SystemSettings {
  // Appearance
  theme: SystemTheme;
  accentColor: AccentColor;
  sidebar: SidebarState;
  animations: boolean;

  // Notifications
  emergencyAlerts: boolean;
  weatherAlerts: boolean;
  reliefUpdates: boolean;
  notificationSound: boolean;

  // Language
  language: Language;

  // Accessibility
  highContrast: boolean;
  largeText: boolean;
  reducedMotion: boolean;

  // Location & Map
  autoDetectLocation: boolean;
  shareLocationInSos: boolean;
  defaultMap: DefaultMapType;
}

export const DEFAULT_SETTINGS: SystemSettings = {
  theme: 'dark',
  accentColor: 'green',
  sidebar: 'expanded',
  animations: true,

  emergencyAlerts: true,
  weatherAlerts: true,
  reliefUpdates: true,
  notificationSound: true,

  language: 'en',

  highContrast: false,
  largeText: false,
  reducedMotion: false,

  autoDetectLocation: true,
  shareLocationInSos: true,
  defaultMap: 'street',
};

interface SettingsContextType {
  settings: SystemSettings;
  updateSettings: (newSettings: Partial<SystemSettings>) => void;
  saveSettings: (newSettings?: Partial<SystemSettings>) => void;
  resetSettings: () => void;
  isSettingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
  playAlertSound: () => void;
}

const SETTINGS_STORAGE_KEY = 'sahay_system_settings';

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// Web Audio API emergency/alert chime synthesizer
function playNotificationChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Chime tone 1 (587.33 Hz - D5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Chime tone 2 (880 Hz - A5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.12);
    gain2.gain.setValueAtTime(0.22, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.6);
  } catch (err) {
    console.debug('Audio chime play blocked or unsupported:', err);
  }
}

export const SettingsProvider: React.FC<{
  children: React.ReactNode;
  onLanguageChange?: (lang: Language) => void;
}> = ({ children, onLanguageChange }) => {
  const [settings, setSettings] = useState<SystemSettings>(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.error('Error loading settings from localStorage:', e);
    }
    return DEFAULT_SETTINGS;
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Apply settings to document root
  useEffect(() => {
    const root = document.documentElement;

    // 1. Theme application (Light, Dark, System Default)
    const applyTheme = (isDark: boolean) => {
      if (isDark) {
        root.classList.add('dark');
        root.setAttribute('data-theme', 'dark');
      } else {
        root.classList.remove('dark');
        root.setAttribute('data-theme', 'light');
      }
    };

    if (settings.theme === 'dark') {
      applyTheme(true);
    } else if (settings.theme === 'light') {
      applyTheme(false);
    } else {
      // System default
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      applyTheme(systemPrefersDark);
    }

    // 2. Accent Color
    root.setAttribute('data-accent', settings.accentColor);
    if (settings.accentColor === 'green') {
      root.style.setProperty('--primary-brand', '#059669');
      root.style.setProperty('--primary-medium', '#047857');
      root.style.setProperty('--primary-dark', '#043e2e');
      root.style.setProperty('--primary-subtle', '#ecfdf5');
      root.style.setProperty('--accent-ring', '#10b981');
    } else if (settings.accentColor === 'blue') {
      root.style.setProperty('--primary-brand', '#2563eb');
      root.style.setProperty('--primary-medium', '#1d4ed8');
      root.style.setProperty('--primary-dark', '#1e3a8a');
      root.style.setProperty('--primary-subtle', '#eff6ff');
      root.style.setProperty('--accent-ring', '#3b82f6');
    } else if (settings.accentColor === 'purple') {
      root.style.setProperty('--primary-brand', '#7c3aed');
      root.style.setProperty('--primary-medium', '#6d28d9');
      root.style.setProperty('--primary-dark', '#4c1d95');
      root.style.setProperty('--primary-subtle', '#f5f3ff');
      root.style.setProperty('--accent-ring', '#8b5cf6');
    }

    // 3. Accessibility & Animation Attributes
    root.setAttribute('data-high-contrast', String(settings.highContrast));
    root.setAttribute('data-large-text', String(settings.largeText));
    root.setAttribute('data-reduced-motion', String(settings.reducedMotion || !settings.animations));
    root.setAttribute('data-animations', String(settings.animations));

    // 4. Sidebar State
    root.setAttribute('data-sidebar', settings.sidebar);
  }, [settings]);

  // Keep system theme synced if user selected 'system'
  useEffect(() => {
    if (settings.theme !== 'system') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const root = document.documentElement;
      if (e.matches) {
        root.classList.add('dark');
        root.setAttribute('data-theme', 'dark');
      } else {
        root.classList.remove('dark');
        root.setAttribute('data-theme', 'light');
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [settings.theme]);

  const updateSettings = (newPartial: Partial<SystemSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newPartial };
      if (newPartial.language) {
        localStorage.setItem('sahay_lang', newPartial.language);
        if (onLanguageChange) onLanguageChange(newPartial.language);
      }
      return updated;
    });
  };

  const saveSettings = (newPartial?: Partial<SystemSettings>) => {
    setSettings((prev) => {
      const merged = newPartial ? { ...prev, ...newPartial } : prev;
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(merged));
        if (merged.language) {
          localStorage.setItem('sahay_lang', merged.language);
        }
      } catch (e) {
        console.error('Error saving settings to localStorage:', e);
      }
      if (merged.language && onLanguageChange) {
        onLanguageChange(merged.language);
      }
      return merged;
    });
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
      localStorage.setItem('sahay_lang', DEFAULT_SETTINGS.language);
    } catch (e) {
      console.error('Error resetting settings in localStorage:', e);
    }
    if (onLanguageChange) {
      onLanguageChange(DEFAULT_SETTINGS.language);
    }
  };

  const playAlertSound = () => {
    if (settings.notificationSound) {
      playNotificationChime();
    }
  };

  const openSettings = () => setIsSettingsOpen(true);
  const closeSettings = () => setIsSettingsOpen(false);

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSettings,
        saveSettings,
        resetSettings,
        isSettingsOpen,
        openSettings,
        closeSettings,
        playAlertSound,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSystemSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSystemSettings must be used within a SettingsProvider');
  }
  return context;
};
