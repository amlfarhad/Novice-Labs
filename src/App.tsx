import React, { useState } from 'react';
import {
  ALL_STUDIO_AGENTS,
  generateStudioSprintReport,
  getStudioSummaryMetrics,
} from './studio/studioEngine';
import { AgentSpec, DepartmentId, StudioSprintReport } from './studio/types';
import { StudioCommandView } from './components/StudioCommandView';
import { AgentRosterView } from './components/AgentRosterView';
import { OrchestratorsView } from './components/OrchestratorsView';
import { GitHubRepoView } from './components/GitHubRepoView';

type ActiveTab = 'command' | 'roster' | 'orchestrators' | 'github';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('github');
  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentId | 'all'>('all');
  const [selectedAgent, setSelectedAgent] = useState<AgentSpec>(ALL_STUDIO_AGENTS[0]);

  const [sprintReport, setSprintReport] = useState<StudioSprintReport>(() =>
    generateStudioSprintReport()
  );
  const [studioHeadAnalysis, setStudioHeadAnalysis] = useState<string>(
    'Studio Head Marcus Vance (NL-001, gemini-4-argon) and Creative Director Elena Rostova (NL-002) decomposed your updated Founder Directive across all 12 Team Orchestrators and 150 specialist agents: (1) Deep Noir Detective Direction + True Batman: Arkham Successor Gameplay — 100% faithful to "Batman: The Long Halloween" canon with Batman as sole playable hero, fusing multi-layer Holiday crime-scene forensics and Caseboard deduction with next-gen Arkham Freeflow v4 combat, Fear Predator stealth, and Grapnel-Boost-to-Cape-Glide traversal; (2) Collector-Grade 3D Character Translation — NL-059 sources an ultra-detailed 92k-triangle Batman rig from top 3D repositories while Character Art (NL-039..NL-050) translates Tim Sale’s panels like master Prime-1 statue sculptors into 84k+ triangle rigs with sub-millimeter pore, wool-pinstripe, and leather-stitch normal maps so there is zero quality gap between sourced and custom characters; (3) Jaw-Dropping Cel-Shaded Graphic Novel Cohesion — every character and Gotham street shares our Hybrid PBR + Stepped Chiaroscuro Cel-Shader with dynamic sumi-ink contours, paired with 2.5D flipping comic-panel cutscenes (zero AI video slop); and (4) Cloud-Cached Native AAA Browser Streaming (Zero Three.js) — 92% pre-warmed NVMe pakchunk cache streamed at 4K 60fps via WebRTC.'
  );
  const [executionMode, setExecutionMode] = useState<string>('Hierarchy Active (NL-001 -> 12 Teams -> 150 Agents)');
  const [isRunningPrompt, setIsRunningPrompt] = useState<boolean>(false);

  const summary = getStudioSummaryMetrics();

  const handleDispatchPrompt = async (params: {
    projectTitle: string;
    genre: string;
    setting: string;
    founderPrompt: string;
  }) => {
    setIsRunningPrompt(true);
    try {
      const response = await fetch('/api/studio/prompt-studio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await response.json();
      if (data.report) {
        setSprintReport(data.report);
      }
      if (data.studioHeadAnalysis) {
        setStudioHeadAnalysis(data.studioHeadAnalysis);
      }
      if (data.mode) {
        setExecutionMode(data.mode);
      }
    } catch {
      const fallback = generateStudioSprintReport(
        params.projectTitle,
        params.genre,
        params.setting
      );
      setSprintReport(fallback);
    } finally {
      setIsRunningPrompt(false);
    }
  };

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

        {/* Zone 2: 4 concise single-line text navigation links */}
        <nav aria-label="Primary Navigation" className="flex items-center gap-6 text-sm font-medium text-slate-300 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('command')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 ${
              activeTab === 'command'
                ? 'text-amber-400 border-b-2 border-amber-400 font-semibold'
                : ''
            }`}
          >
            Studio Command
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
            onClick={() => setActiveTab('github')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 ${
              activeTab === 'github'
                ? 'text-amber-400 border-b-2 border-amber-400 font-semibold'
                : ''
            }`}
          >
            GitHub Repo
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('github')}
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Publish Public Repo
          </button>
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
            <div className="text-slate-400">Hierarchical Governance</div>
            <div className="font-mono font-bold text-base text-slate-100 tabular-nums mt-0.5">
              1 Studio Head → {summary.teamOrchestrators} Team Orchestrators
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
            <div className="text-slate-400">Repository & Deployment Target</div>
            <div className="font-mono font-bold text-base text-emerald-400 tabular-nums mt-0.5">
              Novice-Labs (Public GitHub · 188 Files · Vercel Ready)
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-6 py-8">
        {activeTab === 'command' && (
          <StudioCommandView
            sprintReport={sprintReport}
            studioHeadAnalysis={studioHeadAnalysis}
            executionMode={executionMode}
            isRunningPrompt={isRunningPrompt}
            onDispatchPrompt={handleDispatchPrompt}
            onSelectAgent={handleSelectAgentAndJump}
            onNavigateToRosterDept={handleSelectDepartmentAndJump}
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

        {activeTab === 'github' && <GitHubRepoView />}
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
