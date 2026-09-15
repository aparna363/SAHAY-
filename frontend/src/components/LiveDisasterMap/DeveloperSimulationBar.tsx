import React, { useState, useEffect } from 'react';
import {
  FlaskConical,
  RotateCcw,
  Zap,
  ChevronDown,
  ChevronUp,
  CheckCircle
} from 'lucide-react';
import {
  fetchSimulationScenarios,
  setSimulationScenario,
  injectRealtimeHazard,
  type SimulationScenarioItem
} from '../../services/mapService';

interface DeveloperSimulationBarProps {
  onScenarioChange: (scenarioId: string | null) => void;
  activeScenarioId: string | null;
  district?: string;
}

export const DeveloperSimulationBar: React.FC<DeveloperSimulationBarProps> = ({
  onScenarioChange,
  activeScenarioId,
  district = 'Thrissur'
}) => {
  const [scenarios, setScenarios] = useState<SimulationScenarioItem[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    loadScenarios();
  }, []);

  const loadScenarios = async () => {
    const res = await fetchSimulationScenarios();
    if (res.success && res.scenarios) {
      setScenarios(res.scenarios);
    }
  };

  const handleSelectScenario = async (scenarioId: string) => {
    setLoading(true);
    setStatusMessage(null);
    try {
      const res = await setSimulationScenario(scenarioId);
      if (res && res.success) {
        onScenarioChange(scenarioId);
        setStatusMessage(`Active Scenario: ${scenarioId}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetSimulation = async () => {
    setLoading(true);
    try {
      await setSimulationScenario(null);
      onScenarioChange(null);
      setStatusMessage('Restored to Live Production Database Data');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInjectRealtimeHazard = async () => {
    setLoading(true);
    try {
      const res = await injectRealtimeHazard(district);
      if (res && res.success) {
        onScenarioChange('REALTIME_HAZARD_INJECTION');
        setStatusMessage('⚡ Real-time flash flood road hazard broadcast! Route invalidated.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 text-white rounded-2xl p-2.5 sm:p-3 shadow-xl border border-slate-800 text-xs transition-all">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
            <FlaskConical className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold text-emerald-400 tracking-wider uppercase">
                DEV TEST SUITE
              </span>
              {activeScenarioId ? (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[10px] border border-amber-500/30">
                  SIMULATION: {activeScenarioId}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] border border-emerald-500/30">
                  LIVE DATABASE MODE
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              Test normal route vs safe route scenarios without altering production database
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleInjectRealtimeHazard}
            disabled={loading}
            className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            title="Inject real-time flash flood on active route"
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden sm:inline">Inject Hazard</span>
          </button>

          {activeScenarioId && (
            <button
              onClick={handleResetSimulation}
              disabled={loading}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
              title="Reset simulation to real data"
            >
              <RotateCcw className="w-3 h-3 text-slate-400" />
              <span>Reset</span>
            </button>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors cursor-pointer border border-slate-700"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="mt-2 px-2.5 py-1 bg-slate-800/80 rounded-lg text-[10px] text-amber-300 font-mono flex items-center gap-1.5 border border-slate-700">
          <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Expanded Scenario Grid */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-slate-800 space-y-2">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Select Controlled Disaster Scenario:
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {(scenarios.length > 0 ? scenarios.map(s => ({
              id: s.id,
              label: s.title,
              desc: s.description
            })) : [
              { id: 'NORMAL_CONDITIONS', label: '1. Normal Conditions', desc: 'Clear roads, low risk' },
              { id: 'FLOOD_ZONE_CROSSING', label: '2. Flood Crossing', desc: 'Inundation on normal path' },
              { id: 'LANDSLIDE_ZONE_CROSSING', label: '3. Landslide Crossing', desc: 'Slope failure on road' },
              { id: 'BLOCKED_ROAD', label: '4. Blocked Road', desc: 'Strict road rejection' },
              { id: 'HIGH_SEVERITY_INCIDENT', label: '5. Critical Incident', desc: 'Emergency site' },
              { id: 'MULTIPLE_HAZARDS', label: '6. Multiple Hazards', desc: 'Flood + Blockage + Inc' },
              { id: 'NO_SAFE_ROUTE', label: '7. No Safe Route', desc: 'All corridors critical' },
              { id: 'DESTINATION_IN_HAZARD_ZONE', label: '8. Dest in Hazard', desc: 'Shelter in flood' },
              { id: 'SHELTER_UNAVAILABLE', label: '9. Shelter Full', desc: '100% occupied' },
              { id: 'REALTIME_HAZARD_INJECTION', label: '10. Realtime Alert', desc: 'Route invalidated' }
            ]).map(sc => (
              <button
                key={sc.id}
                onClick={() => handleSelectScenario(sc.id)}
                disabled={loading}
                className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                  activeScenarioId === sc.id
                    ? 'bg-emerald-600/30 border-emerald-500 text-white font-black ring-1 ring-emerald-500'
                    : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="font-bold text-[11px] truncate">{sc.label}</div>
                <div className="text-[9px] text-slate-400 truncate mt-0.5">{sc.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
