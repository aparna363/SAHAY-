import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, AlertTriangle, Radio, Home, HeartHandshake, MapPin, Navigation } from 'lucide-react';
import type { NearestShelter, NearestHospital } from '../../services/aiService';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  time: string;
  intent?: string;
  disasterType?: string;
  severity?: 'NONE' | 'LOW' | 'MEDIUM' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  requiresContext?: boolean;
  requiresSOS?: boolean;
  nearestShelter?: NearestShelter | null;
  nearestHospital?: NearestHospital | null;
  showShelterButton?: boolean;
  showSOSButton?: boolean;
  showReliefButton?: boolean;
  originalQuery?: string;
  correctedQuery?: string;
  corrections?: Array<{
    original: string;
    corrected: string;
    confidence: number;
    type: string;
  }>;
  correctionConfidence?: 'HIGH' | 'MEDIUM' | 'LOW';
  language?: 'en' | 'ml';
}

interface AIChatBubbleProps {
  message: ChatMessage;
  onOpenSOSModal: (disasterType?: string, severity?: string) => void;
  onOpenShelterModal: () => void;
  onNavigateToMap?: () => void;
  onNavigateToRelief?: (subView?: string) => void;
}

export const AIChatBubble: React.FC<AIChatBubbleProps> = ({
  message,
  onOpenSOSModal,
  onOpenShelterModal,
  onNavigateToMap,
  onNavigateToRelief
}) => {
  const isUser = message.sender === 'user';
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Stop speech if unmounting
  useEffect(() => {
    return () => {
      if (window.speechSynthesis && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleToggleSpeech = () => {
    if (!('speechSynthesis' in window)) {
      alert('Speech synthesis is not supported by your browser.');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    // Clean text of markdown asterisks for clear audio readout
    const cleanText = message.text
      .replace(/\*\*/g, '')
      .replace(/#/g, '')
      .replace(/•/g, '')
      .replace(/\[.*?\]/g, '');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    // Pick Malayalam voice if available and message is Malayalam, otherwise default
    if (message.language === 'ml') {
      utterance.lang = 'ml-IN';
      const voices = window.speechSynthesis.getVoices();
      const mlVoice = voices.find(v => v.lang.includes('ml') || v.lang.includes('hi') || v.lang.includes('IN'));
      if (mlVoice) utterance.voice = mlVoice;
    } else {
      utterance.lang = 'en-IN';
    }

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  if (isUser) {
    return (
      <div className="flex justify-end animate-fadeIn">
        <div className="max-w-lg bg-[#0E8F66] text-white p-4 rounded-3xl rounded-br-xs shadow-xs text-xs space-y-1">
          <p className="font-medium whitespace-pre-wrap leading-relaxed">{message.text}</p>
          <span className="text-[10px] text-emerald-200 block text-right font-medium">{message.time}</span>
        </div>
      </div>
    );
  }

  const isCritical = message.severity === 'CRITICAL' || message.requiresSOS;

  return (
    <div className="flex justify-start animate-fadeIn">
      <div className="max-w-2xl bg-white border border-slate-200/80 rounded-3xl rounded-bl-xs shadow-xs p-5 space-y-4 text-xs text-slate-800">
        {/* Top Header: Friendly "🤖 SAHAY AI Copilot" with Emergency Badge only when critical/high */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-extrabold text-[11px] text-[#0B4D3B] uppercase tracking-wider flex items-center gap-1.5">
              <span>🤖</span>
              <span>SAHAY AI Copilot</span>
            </span>

            {/* Only display friendly status for critical emergencies or high alerts */}
            {isCritical && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-red-100 text-red-700 border border-red-200 animate-pulse flex items-center gap-1">
                <span>🚨</span>
                <span>Critical Emergency</span>
              </span>
            )}
            {!isCritical && message.severity === 'HIGH' && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-orange-100 text-orange-700 border border-orange-200 flex items-center gap-1">
                <span>⚠️</span>
                <span>High Alert</span>
              </span>
            )}
          </div>

          <button
            onClick={handleToggleSpeech}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all ${
              isSpeaking
                ? 'bg-emerald-600 text-white shadow-2xs animate-pulse'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
            title={isSpeaking ? 'Stop Audio' : 'Listen to Emergency Advice'}
          >
            {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-600" />}
            <span>{isSpeaking ? 'Stop' : 'Listen'}</span>
          </button>
        </div>

        {/* Critical Danger Banner if SOS required */}
        {isCritical && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between gap-3 text-red-900">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 animate-bounce" />
              <div>
                <p className="font-black text-xs">POTENTIAL CRITICAL EMERGENCY</p>
                <p className="text-[11px] text-red-700">Immediate rescue coordination may be required.</p>
              </div>
            </div>

            <button
              onClick={() => onOpenSOSModal(message.disasterType, message.severity)}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-black px-3.5 py-2 rounded-xl shadow-xs transition-all shrink-0 flex items-center gap-1.5 animate-pulse"
            >
              <Radio className="w-3.5 h-3.5" />
              <span>SEND SOS</span>
            </button>
          </div>
        )}

        {/* Subtle Natural Correction Badge if auto-corrected */}
        {message.corrections && message.corrections.length > 0 && message.intent !== 'GREETING' && message.intent !== 'CASUAL_CONVERSATION' && message.correctedQuery && (
          <div className="text-[10px] text-emerald-800 bg-emerald-50/80 border border-emerald-200/60 rounded-xl px-2.5 py-1 inline-flex items-center gap-1.5 font-medium">
            <span>✨</span>
            <span>Interpreted query: <strong className="font-semibold text-emerald-950">"{message.correctedQuery}"</strong></span>
          </div>
        )}

        {/* Message Body Content (Preserving line breaks & bold formatting) */}
        <div className="space-y-2 leading-relaxed text-slate-800 whitespace-pre-wrap">
          {message.text}
        </div>

        {/* Inline Nearest Shelter Card if available */}
        {message.nearestShelter && (
          <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Home className="w-4 h-4 text-emerald-700 shrink-0" />
                <span className="font-black text-xs text-emerald-950">Nearest Safe Relief Shelter</span>
              </div>
              <span className="text-xs font-black font-mono text-emerald-800 bg-white px-2 py-0.5 rounded-lg border border-emerald-200">
                {message.nearestShelter.distanceKm} km
              </span>
            </div>

            <div className="text-[11px] text-slate-700">
              <p className="font-bold text-slate-900">{message.nearestShelter.name}</p>
              <p className="text-slate-500">{message.nearestShelter.address}</p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={onOpenShelterModal}
                className="px-3 py-1.5 bg-white hover:bg-emerald-100/50 border border-emerald-200 text-emerald-800 text-[11px] font-bold rounded-xl transition-colors flex items-center gap-1"
              >
                <MapPin className="w-3 h-3" />
                <span>All Nearby Camps</span>
              </button>

              <button
                onClick={onNavigateToMap}
                className="px-3 py-1.5 bg-[#0E8F66] hover:bg-[#0B4D3B] text-white text-[11px] font-bold rounded-xl transition-colors flex items-center gap-1"
              >
                <Navigation className="w-3 h-3" />
                <span>Navigate on Live Map</span>
              </button>
            </div>
          </div>
        )}

        {/* Inline Action Buttons Toolbar */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
          {message.showSOSButton && (
            <button
              onClick={() => onOpenSOSModal(message.disasterType, message.severity)}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-xs shadow-2xs flex items-center gap-1.5 transition-all"
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Trigger Emergency SOS</span>
            </button>
          )}

          {message.showShelterButton && (
            <button
              onClick={onOpenShelterModal}
              className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 rounded-xl font-bold text-xs border border-slate-200/80 flex items-center gap-1.5 transition-all"
            >
              <Home className="w-3.5 h-3.5 text-emerald-600" />
              <span>Find Safe Shelter</span>
            </button>
          )}

          {message.showReliefButton && (
            <button
              onClick={() => onNavigateToRelief?.('new_claim')}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl font-bold text-xs border border-emerald-200 flex items-center gap-1.5 transition-all"
            >
              <HeartHandshake className="w-3.5 h-3.5 text-emerald-600" />
              <span>Start Relief Application</span>
            </button>
          )}

          {message.showReliefButton && (
            <button
              onClick={() => onNavigateToRelief?.('tracking')}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs border border-slate-200 flex items-center gap-1.5 transition-all"
            >
              <span>Track My Relief Claim</span>
            </button>
          )}

          <div className="ml-auto text-[10px] text-slate-400 font-medium">
            {message.time}
          </div>
        </div>
      </div>
    </div>
  );
};
