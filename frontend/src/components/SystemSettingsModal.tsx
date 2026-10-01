import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  X,
  Sun,
  Moon,
  Laptop,
  Check,
  RotateCcw,
  Volume2,
  Sliders,
  Bell,
  Globe,
  Eye,
  MapPin,
} from 'lucide-react';
import { useSystemSettings, type SystemSettings, type SystemTheme, type AccentColor, type SidebarState, type DefaultMapType } from '../context/SettingsContext';
import type { Language } from '../translations';

interface SystemSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isInline?: boolean; // For rendering embedded in a page
}

export const SystemSettingsModal: React.FC<SystemSettingsModalProps> = ({
  isOpen,
  onClose,
  isInline = false,
}) => {
  const { settings, updateSettings, saveSettings, resetSettings, playAlertSound } = useSystemSettings();

  // Local draft state for editing before clicking "Save Changes"
  const [draft, setDraft] = useState<SystemSettings>(settings);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Sync draft whenever settings change or modal opens
  useEffect(() => {
    if (isOpen || isInline) {
      setDraft(settings);
      setDirty(false);
      setSavedSuccess(false);
    }
  }, [isOpen, isInline, settings]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen || isInline) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isInline, onClose]);

  if (!isOpen && !isInline) return null;

  const updateDraft = (patch: Partial<SystemSettings>) => {
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      // Apply immediately to DOM & app state so the user sees live feedback
      updateSettings(patch);
      return next;
    });
    setDirty(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveSettings(draft);
    setSavedSuccess(true);
    setDirty(false);
    if (draft.notificationSound) {
      playAlertSound();
    }
    setTimeout(() => {
      setSavedSuccess(false);
      if (!isInline) {
        onClose();
      }
    }, 1400);
  };

  const handleReset = () => {
    resetSettings();
    setSavedSuccess(true);
    setDirty(false);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleTestSound = () => {
    playAlertSound();
  };

  // Accent color helper styles
  const getAccentBgClass = () => {
    switch (draft.accentColor) {
      case 'blue':
        return 'bg-blue-600 hover:bg-blue-700 text-white';
      case 'purple':
        return 'bg-purple-600 hover:bg-purple-700 text-white';
      case 'green':
      default:
        return 'bg-emerald-600 hover:bg-emerald-700 text-white';
    }
  };

  const getAccentBorderClass = () => {
    switch (draft.accentColor) {
      case 'blue':
        return 'border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400';
      case 'purple':
        return 'border-purple-500 text-purple-600 bg-purple-50 dark:bg-purple-950/40 dark:text-purple-400';
      case 'green':
      default:
        return 'border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400';
    }
  };

  const content = (
    <div className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 transition-colors duration-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white px-6 py-5 flex items-center justify-between border-b border-slate-700/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-amber-400 shadow-inner">
            <SettingsIcon className="w-5 h-5 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black tracking-tight text-white">System Settings</h2>
              <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-md">
                SAHAY Core
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium">
              Configure appearance, alerts, language, accessibility & map preferences
            </p>
          </div>
        </div>

        {!isInline && (
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition-all cursor-pointer"
            title="Close Settings (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Success Notification Banner */}
      {savedSuccess && (
        <div className="m-5 mb-0 p-3.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-2xl text-xs font-bold flex items-center justify-between animate-fadeIn shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center">
              <Check className="w-4 h-4 stroke-[3]" />
            </div>
            <span>System settings updated and saved successfully!</span>
          </div>
          <span className="text-[10px] uppercase font-mono tracking-widest text-emerald-600 dark:text-emerald-400">
            Active
          </span>
        </div>
      )}

      {/* Body Form */}
      <form onSubmit={handleSave} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
        {/* ========================================================================= */}
        {/* SECTION 1: Appearance */}
        {/* ========================================================================= */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
            <Sliders className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
              Appearance
            </h3>
          </div>

          {/* Theme Radio Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              Theme
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'light' as SystemTheme, label: 'Light', icon: Sun, desc: 'Clean white' },
                { id: 'dark' as SystemTheme, label: 'Dark', icon: Moon, desc: 'Night mode' },
                { id: 'system' as SystemTheme, label: 'System Default', icon: Laptop, desc: 'Auto sync' },
              ].map((item) => {
                const isSelected = draft.theme === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => updateDraft({ theme: item.id })}
                    className={`flex flex-col items-start p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? `${getAccentBorderClass()} border-2 shadow-sm font-bold`
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected
                              ? 'border-emerald-500 dark:border-emerald-400 bg-white dark:bg-slate-900'
                              : 'border-slate-400 dark:border-slate-500'
                          }`}
                        >
                          {isSelected && (
                            <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                          )}
                        </span>
                        <span className="text-xs font-bold">{item.label}</span>
                      </div>
                      <Icon className="w-3.5 h-3.5 opacity-70" />
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium pl-6">
                      {item.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Accent Color Radio Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              Accent Color
            </label>
            <div className="flex flex-wrap items-center gap-3">
              {[
                { id: 'green' as AccentColor, label: 'Green', color: 'bg-emerald-500', hex: '#059669' },
                { id: 'blue' as AccentColor, label: 'Blue', color: 'bg-blue-600', hex: '#2563eb' },
                { id: 'purple' as AccentColor, label: 'Purple', color: 'bg-purple-600', hex: '#7c3aed' },
              ].map((item) => {
                const isSelected = draft.accentColor === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => updateDraft({ accentColor: item.id })}
                    className={`flex items-center gap-2.5 px-3.5 py-2 rounded-2xl border text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'border-slate-900 dark:border-white bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-extrabold shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 hover:bg-slate-50 text-slate-700 dark:text-slate-300 font-medium'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        isSelected ? 'border-slate-800 dark:border-white' : 'border-slate-300'
                      }`}
                    >
                      {isSelected ? (
                        <span className={`w-2 h-2 rounded-full ${item.color}`} />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />
                      )}
                    </span>
                    <span className={`w-3.5 h-3.5 rounded-full ${item.color} shadow-xs`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interface: Sidebar & Animations */}
          <div className="space-y-2.5 pt-1">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              Interface
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Sidebar Selector */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Sidebar</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Navigation drawer state</span>
                </div>
                <select
                  value={draft.sidebar}
                  onChange={(e) => updateDraft({ sidebar: e.target.value as SidebarState })}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="expanded">Expanded ▼</option>
                  <option value="collapsed">Collapsed ▼</option>
                  <option value="compact">Compact ▼</option>
                </select>
              </div>

              {/* Animations Toggle */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Animations</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Motion effects & pulses</span>
                </div>
                <button
                  type="button"
                  onClick={() => updateDraft({ animations: !draft.animations })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                    draft.animations
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${draft.animations ? 'bg-white' : 'bg-slate-400'}`} />
                  <span>{draft.animations ? '● ON' : '○ OFF'}</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 2: 🔔 Notifications */}
        {/* ========================================================================= */}
        <section className="space-y-3 pt-2">
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
            <Bell className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <span>🔔 Notifications</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Emergency Alerts */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200 block">Emergency Alerts</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Critical evacuation & SOS notices</span>
              </div>
              <button
                type="button"
                onClick={() => updateDraft({ emergencyAlerts: !draft.emergencyAlerts })}
                className={`px-3 py-1.5 rounded-xl font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  draft.emergencyAlerts
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${draft.emergencyAlerts ? 'bg-white' : 'bg-slate-400'}`} />
                <span>{draft.emergencyAlerts ? '● ON' : '○ OFF'}</span>
              </button>
            </div>

            {/* Weather Alerts */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200 block">Weather Alerts</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">IMD rainfall & flood warnings</span>
              </div>
              <button
                type="button"
                onClick={() => updateDraft({ weatherAlerts: !draft.weatherAlerts })}
                className={`px-3 py-1.5 rounded-xl font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  draft.weatherAlerts
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${draft.weatherAlerts ? 'bg-white' : 'bg-slate-400'}`} />
                <span>{draft.weatherAlerts ? '● ON' : '○ OFF'}</span>
              </button>
            </div>

            {/* Relief Updates */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200 block">Relief Updates</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Shelter beds & ration dispatch</span>
              </div>
              <button
                type="button"
                onClick={() => updateDraft({ reliefUpdates: !draft.reliefUpdates })}
                className={`px-3 py-1.5 rounded-xl font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  draft.reliefUpdates
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${draft.reliefUpdates ? 'bg-white' : 'bg-slate-400'}`} />
                <span>{draft.reliefUpdates ? '● ON' : '○ OFF'}</span>
              </button>
            </div>

            {/* Notification Sound */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-800 dark:text-slate-200">Notification Sound</span>
                  {draft.notificationSound && (
                    <button
                      type="button"
                      onClick={handleTestSound}
                      title="Play test audio chime"
                      className="p-1 rounded-md text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950 transition-colors"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Audio chimes for new alerts</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const nextVal = !draft.notificationSound;
                  updateDraft({ notificationSound: nextVal });
                  if (nextVal) playAlertSound();
                }}
                className={`px-3 py-1.5 rounded-xl font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  draft.notificationSound
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${draft.notificationSound ? 'bg-white' : 'bg-slate-400'}`} />
                <span>{draft.notificationSound ? '● ON' : '○ OFF'}</span>
              </button>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 3: 🌐 Language */}
        {/* ========================================================================= */}
        <section className="space-y-3 pt-2">
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
            <Globe className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <span>🌐 Language</span>
            </h3>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Default Portal Language</span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Primary display language for dashboards, alerts, and navigation
              </p>
            </div>
            <select
              value={draft.language}
              onChange={(e) => updateDraft({ language: e.target.value as Language })}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer min-w-[160px]"
            >
              <option value="en">English [▼]</option>
              <option value="ml">മലയാളം (Malayalam) [▼]</option>
              <option value="hi">हिन्दी (Hindi) [▼]</option>
            </select>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 4: ♿ Accessibility */}
        {/* ========================================================================= */}
        <section className="space-y-3 pt-2">
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
            <Eye className="w-4 h-4 text-purple-500" />
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <span>♿ Accessibility</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {/* High Contrast */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col justify-between gap-2">
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200 block">High Contrast</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Enhanced edge separation</span>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => updateDraft({ highContrast: !draft.highContrast })}
                  className={`px-3 py-1.5 rounded-xl font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                    draft.highContrast
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${draft.highContrast ? 'bg-white' : 'bg-slate-400'}`} />
                  <span>{draft.highContrast ? '● ON' : '○ OFF'}</span>
                </button>
              </div>
            </div>

            {/* Large Text */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col justify-between gap-2">
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200 block">Large Text</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Scale base font size to 112%</span>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => updateDraft({ largeText: !draft.largeText })}
                  className={`px-3 py-1.5 rounded-xl font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                    draft.largeText
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${draft.largeText ? 'bg-white' : 'bg-slate-400'}`} />
                  <span>{draft.largeText ? '● ON' : '○ OFF'}</span>
                </button>
              </div>
            </div>

            {/* Reduced Motion */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col justify-between gap-2">
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200 block">Reduced Motion</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Disable background tickers</span>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => updateDraft({ reducedMotion: !draft.reducedMotion })}
                  className={`px-3 py-1.5 rounded-xl font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                    draft.reducedMotion
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${draft.reducedMotion ? 'bg-white' : 'bg-slate-400'}`} />
                  <span>{draft.reducedMotion ? '● ON' : '○ OFF'}</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 5: 📍 Location & Map */}
        {/* ========================================================================= */}
        <section className="space-y-3 pt-2">
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
            <MapPin className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <span>📍 Location & Map</span>
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            {/* Auto Detect Location */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200 block">Auto Detect Location</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Request browser GPS on portal visit</span>
              </div>
              <button
                type="button"
                onClick={() => updateDraft({ autoDetectLocation: !draft.autoDetectLocation })}
                className={`px-3 py-1.5 rounded-xl font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  draft.autoDetectLocation
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${draft.autoDetectLocation ? 'bg-white' : 'bg-slate-400'}`} />
                <span>{draft.autoDetectLocation ? '● ON' : '○ OFF'}</span>
              </button>
            </div>

            {/* Share Location in SOS */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200 block">Share Location in SOS</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Attach precise GPS coords to emergency triggers</span>
              </div>
              <button
                type="button"
                onClick={() => updateDraft({ shareLocationInSos: !draft.shareLocationInSos })}
                className={`px-3 py-1.5 rounded-xl font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  draft.shareLocationInSos
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${draft.shareLocationInSos ? 'bg-white' : 'bg-slate-400'}`} />
                <span>{draft.shareLocationInSos ? '● ON' : '○ OFF'}</span>
              </button>
            </div>

            {/* Default Map Style */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200 block">Default Map</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Base tile layer for live disaster maps</span>
              </div>
              <select
                value={draft.defaultMap}
                onChange={(e) => updateDraft({ defaultMap: e.target.value as DefaultMapType })}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer min-w-[140px]"
              >
                <option value="street">Street ▼</option>
                <option value="satellite">Satellite ▼</option>
                <option value="terrain">Terrain ▼</option>
              </select>
            </div>
          </div>
        </section>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-all cursor-pointer"
            title="Reset all settings to default values"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            type="submit"
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-lg transition-all flex items-center gap-2 cursor-pointer ${getAccentBgClass()} ${
              dirty ? 'animate-pulse' : ''
            }`}
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Save Changes</span>
          </button>
        </div>
      </form>
    </div>
  );

  if (isInline) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl">{content}</div>
    </div>
  );
};
