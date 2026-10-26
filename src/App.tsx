import React, { useEffect, useState } from 'react';
import {
  ALL_STUDIO_AGENTS,
  generateStudioSprintReport,
  getStudioSummaryMetrics,
} from './studio/studioEngine';
import { AgentSpec, DepartmentId, StudioSprintReport } from './studio/types';
import { StudioCommandView } from './components/StudioCommandView';
import { AgentRosterView } from './components/AgentRosterView';
import { OrchestratorsView } from './components/OrchestratorsView';
import { CloudGamePlayerView } from './components/CloudGamePlayerView';
import { ExternalLink, Gamepad2 } from 'lucide-react';

type ActiveTab = 'command' | 'roster' | 'orchestrators' | 'play';

export default function App() {
  const isStandalonePlayTab =
    typeof window !== 'undefined' &&
    (new URLSearchParams(window.location.search).get('play') === 'true' ||
      window.location.pathname === '/play');

  const [activeTab, setActiveTab] = useState<ActiveTab>(
    isStandalonePlayTab ? 'play' : 'command'
  );
  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentId | 'all'>('all');
  const [selectedAgent, setSelectedAgent] = useState<AgentSpec>(ALL_STUDIO_AGENTS[0]);

  const [sprintReport, setSprintReport] = useState<StudioSprintReport>(() =>
    generateStudioSprintReport()
  );
  const [studioHeadAnalysis, setStudioHeadAnalysis] = useState<string>(
    'Studio Head Marcus Vance (NL-001, gemini-4-argon) and Creative Director Elena Rostova (NL-002) are ready to execute your Founder Directive across all 12 Team Orchestrators and 150 specialist agents. Dispatch your prompt above to watch live agent execution logs, interject at any point to steer any department or agent in a new direction, store the compiled IoStore pakchunks on the cloud, and launch the playable game in a new browser tab.'
  );
  const [cloudStorageProvider, setCloudStorageProvider] = useState<string>(
    'Novice Cloud Edge NVMe Cluster (US-East / Global WebRTC CDN — Auto-Provisioned)'
  );
  const [founderSteeringHistory, setFounderSteeringHistory] = useState<string[]>([]);

  useEffect(() => {
    try {
      const savedSteer = localStorage.getItem('novice_labs_steering_history');
      if (savedSteer) {
        const parsed = JSON.parse(savedSteer);
        if (Array.isArray(parsed)) setFounderSteeringHistory(parsed);
      }
      const savedStorage = localStorage.getItem('novice_labs_cloud_storage');
      if (savedStorage) setCloudStorageProvider(savedStorage);
    } catch {
      // Ignore storage access restrictions
    }
  }, []);

  const handleAddFounderSteering = (note: string) => {
    setFounderSteeringHistory((prev) => {
      const next = [...prev, note];
      try {
        localStorage.setItem('novice_labs_steering_history', JSON.stringify(next));
      } catch {
        // Ignore storage error
      }
      return next;
    });
  };

  const handleSelectCloudStorage = (provider: string) => {
    setCloudStorageProvider(provider);
    try {
      localStorage.setItem('novice_labs_cloud_storage', provider);
    } catch {
      // Ignore storage error
    }
  };

  const summary = getStudioSummaryMetrics();

  // If opened in a new browser tab via /?play=true, launch directly into the full-viewport playable game with zero steps required!
  if (isStandalonePlayTab && activeTab === 'play') {
    return (
      <CloudGamePlayerView
        projectTitle={sprintReport.projectTitle}
        cloudStorageProvider={cloudStorageProvider}
        founderSteeringHistory={founderSteeringHistory}
        onExitToStudio={() => {
          window.history.replaceState({}, '', '/');
          setActiveTab('command');
        }}
      />
    );
  }

  const handleSelectAgentAndJump = (agent: AgentSpec) => {
    setSelectedAgent(agent);
    setActiveTab('roster');
  };

  const handleSelectDepartmentAndJump = (deptId: DepartmentId) => {
    setSelectedDepartment(deptId);
    const firstInDept = ALL_STUDIO_AGENTS.find((a) => a.departmentId === deptId);
    if (firstInDept) {
      setSelectedAgent(firstInDept);
    }
    setActiveTab('roster');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0F17] text-[#F1F5F9]">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="flex items-center justify-between gap-8 px-6 py-4 border-b border-slate-800 bg-[#0B0F17]/95 sticky top-0 z-30">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('command');
          }}
          className="text-lg font-bold tracking-tight text-slate-100 font-display whitespace-nowrap shrink-0"
        >
          Novice Labs
        </a>

        {/* Zone 2: Concise single-line navigation links */}
        <nav
          aria-label="Primary Navigation"
          className="flex items-center gap-6 text-sm font-medium text-slate-300 overflow-x-auto"
        >
          <button
            type="button"
            onClick={() => setActiveTab('command')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 ${
              activeTab === 'command'
                ? 'text-amber-400 border-b-2 border-amber-400 font-semibold'
                : ''
            }`}
          >
            Studio Command & Live Logs
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('roster')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 ${
              activeTab === 'roster'
                ? 'text-amber-400 border-b-2 border-amber-400 font-semibold'
                : ''
            }`}
          >
            150-Agent Roster
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('orchestrators')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 ${
              activeTab === 'orchestrators'
                ? 'text-amber-400 border-b-2 border-amber-400 font-semibold'
                : ''
            }`}
          >
            Team Orchestrators
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('play')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 ${
              activeTab === 'play'
                ? 'text-emerald-400 border-b-2 border-emerald-400 font-semibold'
                : ''
            }`}
          >
            Cloud Game Runtime
          </button>
        </nav>

        {/* Zone 3: 1 primary action — Instant Launch in New Browser Tab */}
        <div className="flex items-center shrink-0">
          <a
            href="/?play=true"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            <span>Launch Game in New Tab</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </header>

      {/* Studio Metrics Strip (Tabular Numerals) */}
      <div className="border-b border-slate-800/80 bg-[#0E1420] px-6 py-3">
        <div className="max-w-[1400px] mx-auto grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <div className="text-slate-400">Active AAA Studio Headcount</div>
            <div className="font-mono font-bold text-base text-slate-100 tabular-nums mt-0.5">
              {summary.totalAgents} / 150 Agents ({summary.avgUtilization}% Utilized)
            </div>
          </div>
          <div>
            <div className="text-slate-400">Hierarchical Governance & Live Steering</div>
            <div className="font-mono font-bold text-base text-slate-100 tabular-nums mt-0.5">
              NL-001 → {summary.teamOrchestrators} Teams → Founder Override Active
            </div>
          </div>
          <div>
            <div className="text-slate-400">Multi-Model Array (Zero Cost-Cutting)</div>
            <div className="font-mono font-bold text-base text-amber-300 tabular-nums mt-0.5">
              {summary.modelDistribution['gemini-4-argon']} Argon ·{' '}
              {summary.modelDistribution['lyria-3-pro-preview'] +
                summary.modelDistribution['lyria-3-clip-preview']}{' '}
              Lyria · {summary.modelDistribution['gemini-3.8-flash']} Flash
            </div>
          </div>
          <div>
            <div className="text-slate-400">Cloud Storage & Instant Browser Stream</div>
            <div className="font-mono font-bold text-base text-emerald-400 tabular-nums mt-0.5 truncate">
              {cloudStorageProvider.split('(')[0].trim()}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-6 py-8">
        {activeTab === 'command' && (
          <StudioCommandView
            sprintReport={sprintReport}
            onUpdateSprintReport={setSprintReport}
            studioHeadAnalysis={studioHeadAnalysis}
            onUpdateStudioHeadAnalysis={setStudioHeadAnalysis}
            cloudStorageProvider={cloudStorageProvider}
            onSelectCloudStorageProvider={handleSelectCloudStorage}
            founderSteeringHistory={founderSteeringHistory}
            onAddFounderSteering={handleAddFounderSteering}
            onSelectAgent={handleSelectAgentAndJump}
            onNavigateToRosterDept={handleSelectDepartmentAndJump}
            onLaunchGameInline={() => setActiveTab('play')}
          />
        )}

        {activeTab === 'roster' && (
          <AgentRosterView
            selectedDepartment={selectedDepartment}
            onSelectDepartment={setSelectedDepartment}
            selectedAgent={selectedAgent}
            onSelectAgent={setSelectedAgent}
          />
        )}

        {activeTab === 'orchestrators' && (
          <OrchestratorsView
            onSelectAgent={handleSelectAgentAndJump}
            onSelectDepartmentRoster={handleSelectDepartmentAndJump}
          />
        )}

        {activeTab === 'play' && (
          <CloudGamePlayerView
            projectTitle={sprintReport.projectTitle}
            cloudStorageProvider={cloudStorageProvider}
            founderSteeringHistory={founderSteeringHistory}
            onExitToStudio={() => setActiveTab('command')}
          />
        )}
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-800/80 px-6 py-4 text-xs text-slate-400">
        <div className="max-w-[1400px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <div>
            Novice Labs — 150-Agent Autonomous AAA Game Studio Architecture · 12 Departments
          </div>
          <div className="font-mono">
            Models: gemini-4-argon · lyria-3-pro-preview · lyria-3-clip-preview · gemini-3.8-flash-tts · gemini-nano-banana-2.1 · gemini-3.8-flash
          </div>
        </div>
      </footer>
    </div>
  );
}
