import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Send,
  Mic,
  RotateCcw,
  Search,
  Home,
  HeartHandshake,
  MapPin,
  Radio,
  Loader2,
  Sparkles
} from 'lucide-react';
import { useLocation } from '../../context/LocationContext';
import {
  sendCopilotMessage,
  fetchRiskAssessment,
  fetchNearbyShelters,
  type NearestShelter,
  type RiskAssessmentData
} from '../../services/aiService';
import { AIChatBubble, type ChatMessage } from './AIChatBubble';
import { CopilotRiskModal } from './CopilotRiskModal';
import { CopilotShelterModal } from './CopilotShelterModal';
import { CopilotSOSConfirmModal } from './CopilotSOSConfirmModal';

interface AIDisasterCopilotProps {
  user?: any;
  onNavigateToMap?: () => void;
  onNavigateToRelief?: (subView?: string) => void;
  onOpenContacts?: () => void;
  initialQuery?: string;
}

export const AIDisasterCopilot: React.FC<AIDisasterCopilotProps> = ({
  user,
  onNavigateToMap,
  onNavigateToRelief,
  onOpenContacts,
  initialQuery
}) => {
  const { location } = useLocation();

  // Language state: 'en' | 'ml'
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'ml'>('en');

  // Chat message state
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const userName = (user?.name || 'Citizen').split(' ')[0];
    return [
      {
        id: 'msg_welcome',
        sender: 'assistant',
        text: `Namaskaram ${userName}! I am **SAHAY AI Disaster Copilot**.\n\nI can help you with disaster alerts, safety guidance, nearby shelters, emergency assistance, risk information, and relief services.\n\nHow can I help you today?`,
        time: 'Just now',
        intent: 'GREETING',
        disasterType: 'NONE',
        severity: 'NONE',
        showShelterButton: false,
        language: 'en'
      }
    ];
  });

  const [inputQuery, setInputQuery] = useState(initialQuery || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Modals state
  const [isRiskModalOpen, setIsRiskModalOpen] = useState(false);
  const [riskData, setRiskData] = useState<RiskAssessmentData | null>(null);
  const [loadingRisk, setLoadingRisk] = useState(false);

  const [isShelterModalOpen, setIsShelterModalOpen] = useState(false);
  const [nearbyShelters, setNearbyShelters] = useState<NearestShelter[]>([]);
  const [loadingShelters, setLoadingShelters] = useState(false);

  const [isSOSModalOpen, setIsSOSModalOpen] = useState(false);
  const [activeSOSType, setActiveSOSType] = useState('Critical Emergency');
  const [activeSOSSeverity, setActiveSOSSeverity] = useState('CRITICAL');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-scroll chat to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSubmitting]);

  // Handle Initial Query if passed
  useEffect(() => {
    if (initialQuery && initialQuery.trim()) {
      handleSendMessage(initialQuery);
    }
  }, []);

  // Quick Action Scenarios
  const quickAssistanceOptions = [
    { label: '🌊 Flood', query: 'Water is entering my house. What should I do now?' },
    { label: '⛰️ Landslide', query: 'There is a landslide warning in my area. Is it safe to stay?' },
    { label: '🌧️ Heavy Rain', query: 'What precautions should I take during this heavy rainfall alert?' },
    { label: '🔥 Fire', query: 'There is a fire in my building. What is the emergency evacuation protocol?' },
    { label: '🏚️ Building Damage', query: 'My house structure has cracks and is damaged. Where should I go?' },
    { label: '🚑 Medical Emergency', query: 'Someone is severely injured and needs immediate medical assistance.' }
  ];

  // Primary Send Message Handler
  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || inputQuery).trim();
    if (!textToSend || isSubmitting) return;

    setApiError(null);
    setInputQuery('');

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setIsSubmitting(true);

    const lat = location?.latitude || 9.5916;
    const lng = location?.longitude || 76.5222;

    try {
      const response = await sendCopilotMessage({
        message: textToSend,
        latitude: lat,
        longitude: lng,
        language: selectedLanguage
      });

      const assistantMessage: ChatMessage = {
        id: `asst_${Date.now()}`,
        sender: 'assistant',
        text: response.message,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        intent: response.intent,
        disasterType: response.disasterType,
        severity: response.severity,
        requiresContext: response.requiresContext,
        requiresSOS: response.requiresSOS,
        nearestShelter: response.nearestShelter,
        nearestHospital: response.nearestHospital,
        showShelterButton: response.showShelterButton,
        showSOSButton: response.showSOSButton,
        showReliefButton: response.showReliefButton,
        originalQuery: response.originalQuery,
        correctedQuery: response.correctedQuery,
        corrections: response.corrections,
        correctionConfidence: response.correctionConfidence,
        language: response.language || selectedLanguage
      };

      setMessages(prev => [...prev, assistantMessage]);

      // If critical SOS is strongly indicated, automatically prime the SOS trigger
      if (response.requiresSOS) {
        setActiveSOSType(response.disasterType);
        setActiveSOSSeverity(response.severity);
      }
    } catch (err: any) {
      console.error('AI Copilot error:', err);
      setApiError(err.message || 'Unable to connect to SAHAY AI right now.');

      const fallbackMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        sender: 'assistant',
        text: `⚠️ **Unable to connect to SAHAY AI network right now.**\n\nOfficial state and district emergency services remain on 24x7 standby:\n\n• **Emergency Services (ERSS):** 112\n• **District Disaster Control Room:** 1077\n• **Ambulance (EMS):** 108\n• **Fire & Rescue:** 101\n\nYou can still access registered shelters, report incidents, or broadcast an emergency SOS using the buttons below.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        showSOSButton: true,
        showShelterButton: true
      };
      setMessages(prev => [...prev, fallbackMsg]);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Speech-To-Text Voice Input Handler
  const handleToggleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Voice speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = selectedLanguage === 'ml' ? 'ml-IN' : 'en-IN';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputQuery(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error('Voice input start error:', e);
      setIsListening(false);
    }
  };

  // Check My Risk Action Trigger
  const handleCheckMyRisk = async () => {
    setIsRiskModalOpen(true);
    setLoadingRisk(true);
    try {
      const lat = location?.latitude || 9.5916;
      const lng = location?.longitude || 76.5222;
      const res = await fetchRiskAssessment({ latitude: lat, longitude: lng });
      if (res && res.riskAssessment) {
        setRiskData(res.riskAssessment);
      }
    } catch (e) {
      console.warn('Risk assessment error:', e);
    } finally {
      setLoadingRisk(false);
    }
  };

  // Find Safe Shelter Action Trigger
  const handleFindShelter = async () => {
    setIsShelterModalOpen(true);
    setLoadingShelters(true);
    try {
      const lat = location?.latitude || 9.5916;
      const lng = location?.longitude || 76.5222;
      const shelters = await fetchNearbyShelters({ lat, lng });
      setNearbyShelters(shelters);
    } catch (e) {
      console.warn('Shelter fetch error:', e);
    } finally {
      setLoadingShelters(false);
    }
  };

  // Danger SOS Action Trigger
  const handleOpenDangerSOS = (type = 'EMERGENCY', severity = 'CRITICAL') => {
    setActiveSOSType(type);
    setActiveSOSSeverity(severity);
    setIsSOSModalOpen(true);
  };

  // Clear Chat History
  const handleResetChat = () => {
    const userName = (user?.name || 'Citizen').split(' ')[0];
    setMessages([
      {
        id: 'msg_welcome_new',
        sender: 'assistant',
        text: `Namaskaram ${userName}! I have refreshed your session. How can I assist with your emergency queries or disaster safety guidance?`,
        time: 'Just now',
        disasterType: 'GENERAL_DISASTER_QUERY',
        severity: 'LOW',
        showShelterButton: true,
        language: selectedLanguage
      }
    ]);
  };

  const districtName = location?.district || user?.district || 'Wayanad';
  const locationDisplay = location?.placeName || `${districtName} District`;

  return (
    <div className="space-y-6 animate-fadeIn max-w-5xl mx-auto pb-10">
      {/* 1. Header Banner */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#0B4D3B] to-[#0E8F66] text-white flex items-center justify-center shadow-md shrink-0">
            <Bot className="w-8 h-8 animate-pulse" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                🤖 SAHAY AI Disaster Copilot
              </h1>
              <span className="bg-emerald-100 text-[#0B4D3B] text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-200">
                Context-Aware
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium flex items-center gap-2">
              <span>Your intelligent emergency companion</span>
              <span>&bull;</span>
              <span className="flex items-center gap-1 text-[#0E8F66] font-bold">
                <MapPin className="w-3.5 h-3.5" />
                {locationDisplay}
              </span>
            </p>
          </div>
        </div>

        {/* Language Selector & Reset Session */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setSelectedLanguage('en')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                selectedLanguage === 'en' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              English
            </button>
            <button
              onClick={() => setSelectedLanguage('ml')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                selectedLanguage === 'ml' ? 'bg-[#0E8F66] text-white shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              മലയാളം
            </button>
          </div>

          <button
            onClick={handleResetChat}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors"
            title="Start New Conversation"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Quick Assistance Chips Bar */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>Quick Emergency Assistance</span>
          </span>
          <span className="text-[11px] text-slate-400">Click any topic for immediate guidance</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {quickAssistanceOptions.map((opt, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(opt.query)}
              className="px-3 py-2 rounded-2xl bg-slate-50 hover:bg-[#EAF8F3] hover:text-[#0B4D3B] hover:border-emerald-300 border border-slate-200/80 text-slate-800 text-xs font-bold transition-all text-left truncate active:scale-95 shadow-2xs"
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Main Chat Container */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs flex flex-col h-[520px] overflow-hidden">
        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar bg-[#F8FAFC]/50">
          {messages.map(msg => (
            <AIChatBubble
              key={msg.id}
              message={msg}
              onOpenSOSModal={handleOpenDangerSOS}
              onOpenShelterModal={handleFindShelter}
              onNavigateToMap={onNavigateToMap}
              onNavigateToRelief={onNavigateToRelief}
            />
          ))}

          {isSubmitting && (
            <div className="flex justify-start animate-fadeIn">
              <div className="bg-white border border-slate-200 p-4 rounded-3xl rounded-bl-xs shadow-xs text-xs text-slate-500 flex items-center gap-3">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                <span>Checking PostGIS hazard layers & analyzing situation...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 4. Action Buttons Toolbar */}
        <div className="p-3 bg-slate-50/80 border-t border-slate-200/70 flex flex-wrap items-center gap-2">
          <button
            onClick={handleCheckMyRisk}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-emerald-50 text-slate-800 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs active:scale-95"
          >
            <Search className="w-3.5 h-3.5 text-emerald-600" />
            <span>🔍 Check My Risk</span>
          </button>

          <button
            onClick={handleFindShelter}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-emerald-50 text-slate-800 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs active:scale-95"
          >
            <Home className="w-3.5 h-3.5 text-emerald-600" />
            <span>📍 Find Safe Shelter</span>
          </button>

          <button
            onClick={() => handleOpenDangerSOS()}
            className="px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-black transition-all flex items-center gap-1.5 shadow-2xs active:scale-95 animate-pulse"
          >
            <Radio className="w-3.5 h-3.5 text-red-600" />
            <span>🚨 I'm in Danger</span>
          </button>

          <button
            onClick={() => onNavigateToRelief?.('landing')}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-emerald-50 text-slate-800 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs active:scale-95"
          >
            <HeartHandshake className="w-3.5 h-3.5 text-emerald-600" />
            <span>🧾 Relief Assistance</span>
          </button>
        </div>

        {/* 5. Input Field & Mic Voice Bar */}
        <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
          {/* Voice Input Button */}
          <button
            onClick={handleToggleVoiceInput}
            className={`p-3 rounded-2xl transition-all flex items-center justify-center shrink-0 ${
              isListening
                ? 'bg-red-600 text-white animate-pulse shadow-md'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
            title={isListening ? 'Listening... Click to stop' : 'Click to Speak (Speech to Text)'}
          >
            {isListening ? <Mic className="w-5 h-5 text-white animate-bounce" /> : <Mic className="w-5 h-5" />}
          </button>

          <input
            type="text"
            value={inputQuery}
            onChange={e => setInputQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
            placeholder={
              isListening
                ? 'Listening to your voice... Speak now...'
                : selectedLanguage === 'ml'
                  ? 'നിങ്ങളുടെ ചോദ്യം ഇവിടെ ടൈപ്പ് ചെയ്യുക (ഉദാ: വെള്ളം കയറുന്നു)...'
                  : 'Type your emergency or question here (e.g., "Water is entering my house")...'
            }
            className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0E8F66]/30 focus:border-[#0E8F66]"
          />

          <button
            onClick={() => handleSendMessage()}
            disabled={!inputQuery.trim() || isSubmitting}
            className="bg-[#0E8F66] hover:bg-[#0B4D3B] disabled:opacity-50 text-white p-3 rounded-2xl shadow-xs transition-all flex items-center justify-center shrink-0 active:scale-95"
            title="Send Query"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 6. Emergency Fallback Status Banner if AI network down */}
      {apiError && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs space-y-2">
          <p className="font-bold text-amber-900">
            ⚠️ Unable to reach SAHAY AI server right now. Essential disaster capabilities remain fully functional:
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onOpenContacts}
              className="px-3 py-1.5 rounded-xl bg-white border border-amber-200 text-amber-900 font-bold"
            >
              🚨 Emergency Contacts
            </button>
            <button
              onClick={handleFindShelter}
              className="px-3 py-1.5 rounded-xl bg-white border border-amber-200 text-amber-900 font-bold"
            >
              📍 Find Shelter
            </button>
            <button
              onClick={onNavigateToMap}
              className="px-3 py-1.5 rounded-xl bg-white border border-amber-200 text-amber-900 font-bold"
            >
              🗺️ Live Disaster Map
            </button>
            <button
              onClick={() => handleOpenDangerSOS()}
              className="px-3 py-1.5 rounded-xl bg-red-600 text-white font-bold"
            >
              🚨 SOS
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <CopilotRiskModal
        isOpen={isRiskModalOpen}
        onClose={() => setIsRiskModalOpen(false)}
        locationName={locationDisplay}
        riskData={riskData}
        loading={loadingRisk}
        onFindShelter={() => {
          setIsRiskModalOpen(false);
          handleFindShelter();
        }}
      />

      <CopilotShelterModal
        isOpen={isShelterModalOpen}
        onClose={() => setIsShelterModalOpen(false)}
        shelters={nearbyShelters}
        loading={loadingShelters}
        onViewOnMap={() => {
          setIsShelterModalOpen(false);
          onNavigateToMap?.();
        }}
      />

      <CopilotSOSConfirmModal
        isOpen={isSOSModalOpen}
        onClose={() => setIsSOSModalOpen(false)}
        latitude={location?.latitude || null}
        longitude={location?.longitude || null}
        locationName={locationDisplay}
        disasterType={activeSOSType}
        severity={activeSOSSeverity}
      />
    </div>
  );
};
