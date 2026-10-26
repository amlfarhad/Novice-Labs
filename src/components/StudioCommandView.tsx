import React, { useState } from 'react';
import {
  ALL_STUDIO_AGENTS,
  STUDIO_PRESET_BRIEFS,
} from '../studio/studioEngine';
import { STUDIO_DEPARTMENTS } from '../studio/departments';
import {
  AgentSpec,
  DepartmentId,
  StudioSprintReport,
} from '../studio/types';
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Cpu,
  Layers,
  Play,
  Sliders,
  Terminal,
  Users,
} from 'lucide-react';

interface StudioCommandViewProps {
  sprintReport: StudioSprintReport;
  studioHeadAnalysis: string;
  executionMode: string;
  isRunningPrompt: boolean;
  onDispatchPrompt: (params: {
    projectTitle: string;
    genre: string;
    setting: string;
    founderPrompt: string;
  }) => Promise<void>;
  onSelectAgent: (agent: AgentSpec) => void;
  onNavigateToRosterDept: (deptId: DepartmentId) => void;
}

export const StudioCommandView: React.FC<StudioCommandViewProps> = ({
  sprintReport,
  studioHeadAnalysis,
  executionMode,
  isRunningPrompt,
  onDispatchPrompt,
  onSelectAgent,
  onNavigateToRosterDept,
}) => {
  const defaultPreset = STUDIO_PRESET_BRIEFS[0];
  const [projectTitle, setProjectTitle] = useState(defaultPreset.title);
  const [genre, setGenre] = useState(defaultPreset.genre);
  const [setting, setSetting] = useState(defaultPreset.setting);
  const [founderPrompt, setFounderPrompt] = useState(defaultPreset.promptText);
  const [promptError, setPromptError] = useState<string | null>(null);
  const [expandedDeptId, setExpandedDeptId] = useState<DepartmentId>('executive-production');
  const [showAllEmployeesForDept, setShowAllEmployeesForDept] = useState<Record<string, boolean>>({
    'executive-production': true,
  });

  const handleLoadPreset = (presetId: string) => {
    const found = STUDIO_PRESET_BRIEFS.find((p) => p.id === presetId);
    if (!found) return;
    setProjectTitle(found.title);
    setGenre(found.genre);
    setSetting(found.setting);
    setFounderPrompt(found.promptText);
    setPromptError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectTitle.trim() || !founderPrompt.trim()) {
      setPromptError('Both a Project Title and a Studio Prompt Directive are required before dispatching to NL-001.');
      return;
    }
    setPromptError(null);
    await onDispatchPrompt({
      projectTitle: projectTitle.trim(),
      genre: genre.trim(),
      setting: setting.trim(),
      founderPrompt: founderPrompt.trim(),
    });
  };

  const toggleEmployeeList = (deptId: string) => {
    setShowAllEmployeesForDept((prev) => ({
      ...prev,
      [deptId]: !prev[deptId],
    }));
  };

  return (
    <div className="space-y-8">
      {/* Top Studio Command & Prompting Console */}
      <section
        aria-labelledby="studio-command-heading"
        className="border border-slate-800 bg-[#0F1623] rounded-xl p-6"
      >
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 pb-6 border-b border-slate-800/80">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
              <span>HIERARCHICAL STUDIO COMMAND</span>
              <span aria-hidden="true">·</span>
              <span>NL-001 STUDIO HEAD</span>
              <span aria-hidden="true">·</span>
              <span>12 TEAM ORCHESTRATORS</span>
              <span aria-hidden="true">·</span>
              <span>150 SPECIALIST AGENTS</span>
            </div>
            <h1
              id="studio-command-heading"
              className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100 font-display"
            >
              Prompt the 150-Agent Novice Labs Game Studio
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Submit your game vision below. Studio Head <strong>Marcus Vance (NL-001)</strong> receives your directive on{' '}
              <code className="font-mono text-amber-300">gemini-4-argon</code>, decomposes the architecture into{' '}
              <strong>12 Department Project Charters</strong>, and each Team Orchestrator delegates concrete employee orders across all{' '}
              <strong className="font-mono tabular-nums">150</strong> agents using our Multi-Model Array (<code className="font-mono text-amber-300">gemini-4-argon</code>,{' '}
              <code className="font-mono text-amber-300">lyria-3-pro-preview</code>, <code className="font-mono text-amber-300">lyria-3-clip-preview</code>,{' '}
              <code className="font-mono text-amber-300">gemini-3.8-flash-tts</code>, <code className="font-mono text-amber-300">gemini-3.8-flash</code>).
            </p>
          </div>

          {/* Preset Selector */}
          <div className="flex flex-col gap-2 shrink-0">
            <span className="text-xs text-slate-400 font-medium">Load Studio Directive Preset</span>
            <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
              {STUDIO_PRESET_BRIEFS.map((preset) => {
                const isSelected = projectTitle === preset.title;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleLoadPreset(preset.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 font-semibold'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {preset.id === 'batman-long-halloween'
                      ? 'Batman: The Long Halloween'
                      : 'Project Aethelgard RPG'}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Prompt Form */}
        <form onSubmit={handleSubmit} className="pt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="studio-project-title"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                Project Title
              </label>
              <input
                id="studio-project-title"
                type="text"
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-amber-400"
                placeholder="e.g. Batman: The Long Halloween"
              />
            </div>
            <div>
              <label
                htmlFor="studio-project-genre"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                Genre & Playable Scope
              </label>
              <input
                id="studio-project-genre"
                type="text"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-amber-400"
                placeholder="e.g. Noir Detective Action (Batman Sole Playable)"
              />
            </div>
            <div>
              <label
                htmlFor="studio-project-setting"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                World Setting & Runtime Target
              </label>
              <input
                id="studio-project-setting"
                type="text"
                value={setting}
                onChange={(e) => setSetting(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-amber-400"
                placeholder="e.g. Gothic Gotham City · Cloud-Streamed Native AAA"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="studio-founder-prompt"
              className="block text-xs font-medium text-slate-300 mb-1.5"
            >
              Founder Directive to Studio Head (NL-001 Marcus Vance)
            </label>
            <textarea
              id="studio-founder-prompt"
              rows={4}
              value={founderPrompt}
              onChange={(e) => setFounderPrompt(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-100 leading-relaxed focus:outline-none focus:border-amber-400"
              placeholder="Describe the plot, playable character constraints, cutscene style, 3D model sourcing rules, and cloud streaming target..."
            />
          </div>

          {promptError && (
            <div
              role="alert"
              className="p-3 rounded-lg bg-red-950/60 border border-red-800/80 text-xs text-red-200"
            >
              {promptError}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <div className="text-xs text-slate-400 font-mono tabular-nums">
              <span>Routing Policy: Zero Cost-Cutting</span>
              <span aria-hidden="true"> · </span>
              <span>129× gemini-4-argon</span>
              <span aria-hidden="true"> · </span>
              <span>7× Google Lyria</span>
              <span aria-hidden="true"> · </span>
              <span>4× Nano Banana 2.1</span>
              <span aria-hidden="true"> · </span>
              <span>1× Flash TTS</span>
              <span aria-hidden="true"> · </span>
              <span>9× 3.8 Flash (Speed-Only)</span>
            </div>

            <button
              type="submit"
              disabled={isRunningPrompt}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {isRunningPrompt
                ? 'Dispatching Across 12 Teams & 150 Agents...'
                : 'Dispatch Directive to Studio Head (NL-001)'}
            </button>
          </div>
        </form>
      </section>

      {/* Level 1: Studio Head (NL-001) Architectural Approach & Executive Breakdown */}
      <section
        aria-labelledby="level-1-studio-head"
        className="border border-slate-800 bg-[#0F1623] rounded-xl p-6 space-y-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div>
            <div className="text-xs font-mono text-amber-400">
              LEVEL 1 HIERARCHY · STUDIO HEAD EXECUTIVE APPROACH (NL-001 MARCUS VANCE · gemini-4-argon)
            </div>
            <h2
              id="level-1-studio-head"
              className="text-xl font-bold text-slate-100 mt-1 font-display"
            >
              How Novice Labs Executes: {sprintReport.projectTitle}
            </h2>
          </div>
          <div className="text-xs font-mono text-slate-400 tabular-nums">
            <span>Mode: {executionMode}</span>
            <span aria-hidden="true"> · </span>
            <span>Deployed: {sprintReport.totalAgentsDeployed} / 150 Agents</span>
          </div>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed">{studioHeadAnalysis}</p>

        {/* 4-Pillar Architectural Breakdown for Batman: The Long Halloween */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="p-4 rounded-lg bg-slate-950/90 border border-slate-800/90 space-y-2">
            <div className="text-xs font-mono text-amber-300">
              01. NOIR DETECTIVE FORENSICS & ARKHAM-SUCCESSOR GAMEPLAY · TEAMS 02, 03 & 10
            </div>
            <h3 className="text-sm font-semibold text-slate-100">
              Deep Crime-Scene Deduction + Next-Gen Batman: Arkham Freeflow v4 & Traversal
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Only <strong>Batman</strong> is playable across all 13 monthly Holiday chapters (100% separate from the Arkhamverse). Combines deep noir detective forensics (3D `.22` Holiday ballistics reconstruction, blood-spatter trigonometry, Calendar Man Arkham consultations, and a living Caseboard) with a <strong>true spiritual successor to Batman: Arkham gameplay</strong>—featuring 120Hz Freeflow v4 rhythmic combat, inverted gargoyle Predator stealth, and Grapnel-Boost-to-Cape-Glide kinetic traversal (<code className="font-mono">NL-012</code>, <code className="font-mono">NL-015</code>, <code className="font-mono">NL-116</code>).
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-950/90 border border-slate-800/90 space-y-2">
            <div className="text-xs font-mono text-amber-300">
              02. COLLECTOR-GRADE 3D CAST TRANSLATION & SOURCED BATMAN RIG · TEAMS 04 & 05
            </div>
            <h3 className="text-sm font-semibold text-slate-100">
              92k-Tri Internet-Sourced Batman + Jaw-Dropping 85k-Tri Tim Sale Custom Sculpted Cast
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              3D Scout <strong>Maya Lin-Vance (NL-059)</strong> sources an acclaimed 92k-triangle hero Batman 3D model from vetted repositories (zero AI mesh slop). To eliminate any visual gap between the sourced Batman and custom cast, <strong>Camille Laurent (NL-039)</strong> and her 12-agent character team translate Tim Sale’s iconic silhouettes (Harvey Dent/Two-Face, Carmine Falcone, Catwoman, Gordon, Calendar Man, Joker, Solomon Grundy) into <strong>jaw-dropping 82k–88k triangle collector-grade 3D character models</strong> with sub-millimeter pore, wool, and leather micro-normal maps (<code className="font-mono">NL-040</code>, <code className="font-mono">NL-042</code>, <code className="font-mono">NL-045</code>).
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-950/90 border border-slate-800/90 space-y-2">
            <div className="text-xs font-mono text-amber-300">
              03. CEL-SHADED GRAPHIC NOVEL LOOKDEV & 2.5D PANEL CUTSCENES · TEAMS 05, 06 & 07
            </div>
            <h3 className="text-sm font-semibold text-slate-100">
              Unified Cel-Shaded Chiaroscuro BRDF + Flipping 2.5D Comic-Panel Cutscenes
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Every asset—both the sourced Batman model and the custom Tim Sale cast—is unified through a custom <strong>Stylized Comic-Book / Cel-Shaded Chiaroscuro & Dynamic Sumi-Ink Shader</strong> (<code className="font-mono">NL-057</code>, <code className="font-mono">NL-074</code>, <code className="font-mono">NL-104</code>) with view-dependent ink outlines, stepped chiaroscuro shadow bands, and screen-space cross-hatching. Cutscenes (<code className="font-mono">NL-073</code>, <code className="font-mono">NL-090</code>) use <strong>2.5D multi-plane parallax motion graphics of authentic comic panels</strong> flipping, stacking, and camera-trucking into live gameplay.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-950/90 border border-slate-800/90 space-y-2">
            <div className="text-xs font-mono text-amber-300">
              04. CLOUD-CACHED NATIVE AAA BROWSER STREAMING (ZERO THREE.JS) · TEAMS 08 & 09
            </div>
            <h3 className="text-sm font-semibold text-slate-100">
              92% Pre-Warmed Cloud IoStore Cache + WebRTC Native C++20/Vulkan Stream
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Bypasses browser WebGL/Three.js completely. <strong>Dr. Viktor Kestrel (NL-103)</strong> and <strong>Hanna Lindqvist (NL-109)</strong> package the build into signed PC/Console IoStore containers (<code className="font-mono">.ucas/.utoc</code>) with <strong>92% of assets pre-warmed in Cloud GPU NVMe RAM pools</strong>, streaming 1440p/4K 60fps video to the browser via <strong>WebRTC NVENC/AV1</strong> (<code className="font-mono">NL-124</code>) with a <strong>Google Lyria 3 Pro</strong> noir jazz score (<code className="font-mono">NL-091</code>).
            </p>
          </div>
        </div>
      </section>

      {/* Level 2 & Level 3: 12 Team Orchestrators -> 150 Individual Employee Assignments */}
      <section aria-labelledby="level-2-teams-heading" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-mono text-amber-400">
              LEVEL 2 & LEVEL 3 HIERARCHY · 12 TEAM ORCHESTRATORS → 150 SPECIALIST EMPLOYEES
            </div>
            <h2
              id="level-2-teams-heading"
              className="text-xl font-bold text-slate-100 mt-1 font-display"
            >
              Department Project Charters & Employee Task Delegation (150 / 150 Active)
            </h2>
          </div>
          <span className="text-xs text-slate-400">
            Click any Department Charter to inspect how its Team Orchestrator splits tasks across its employees
          </span>
        </div>

        <div className="space-y-3">
          {sprintReport.departments.map((deptOut, idx) => {
            const deptSpec = STUDIO_DEPARTMENTS.find((d) => d.id === deptOut.departmentId)!;
            const isExpanded = expandedDeptId === deptOut.departmentId;
            const showAllEmployees = Boolean(showAllEmployeesForDept[deptOut.departmentId]);
            const displayedContributions = showAllEmployees
              ? deptOut.agentContributions
              : deptOut.agentContributions.slice(0, 6);

            return (
              <div
                key={deptOut.departmentId}
                className="border border-slate-800 bg-[#0F1623] rounded-xl overflow-hidden"
              >
                {/* Department Header Button */}
                <button
                  type="button"
                  onClick={() =>
                    setExpandedDeptId(
                      isExpanded ? ('none' as any) : deptOut.departmentId
                    )
                  }
                  aria-expanded={isExpanded}
                  className="w-full flex flex-col md:flex-row md:items-center justify-between gap-3 px-5 py-4 text-left hover:bg-slate-900/60 transition-colors cursor-pointer"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-400">
                      <span className="text-amber-400 font-semibold">
                        TEAM {String(idx + 1).padStart(2, '0')}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>ORCHESTRATOR: {deptOut.leadAgentId}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">{deptOut.agentCount} AGENTS</span>
                      <span aria-hidden="true">·</span>
                      <span>MODELS: {deptOut.orchestratorModelSummary}</span>
                    </div>
                    <div className="text-base font-bold text-slate-100 font-display">
                      {deptOut.departmentName} — {deptOut.concreteArtifactTitle}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-mono text-emerald-400 tabular-nums">
                      {deptOut.agentCount}/{deptOut.agentCount} Assigned
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </button>

                {/* Expanded Department Charter + Employee Task Breakdown */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-2 border-t border-slate-800/80 space-y-5">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                      {/* Left 5 cols: Team Orchestrator Charter & Spec */}
                      <div className="lg:col-span-5 space-y-3">
                        <div className="text-xs font-mono text-slate-400">
                          TEAM ORCHESTRATOR DIRECTIVE ({deptSpec.orchestratorCodename} · {deptOut.leadAgentRole})
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {deptOut.executiveSummary}
                        </p>
                        <div className="text-xs text-slate-400">
                          <strong className="text-slate-200">Model Routing Rule:</strong>{' '}
                          {deptSpec.orchestratorRoutingRule}
                        </div>
                        <pre className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 whitespace-pre-wrap leading-relaxed overflow-x-auto">
                          {deptOut.concreteArtifactContent}
                        </pre>
                        <button
                          type="button"
                          onClick={() => onNavigateToRosterDept(deptOut.departmentId)}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 cursor-pointer"
                        >
                          <span>Filter 150-Agent Roster to {deptSpec.shortName}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Right 7 cols: Individual Employee Task Table */}
                      <div className="lg:col-span-7 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono text-slate-400">
                            LEVEL 3 · INDIVIDUAL EMPLOYEE TASK DELEGATION ({deptOut.agentContributions.length} EMPLOYEES)
                          </span>
                          {deptOut.agentContributions.length > 6 && (
                            <button
                              type="button"
                              onClick={() => toggleEmployeeList(deptOut.departmentId)}
                              className="text-xs font-medium text-amber-400 hover:text-amber-300 cursor-pointer"
                            >
                              {showAllEmployees
                                ? 'Show Compact (6)'
                                : `Show All ${deptOut.agentContributions.length} Department Employees`}
                            </button>
                          )}
                        </div>

                        <div className="overflow-x-auto border border-slate-800 rounded-lg bg-slate-950">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-slate-800 text-[11px] font-mono text-slate-400">
                                <th className="py-2.5 px-3">ID & Employee</th>
                                <th className="py-2.5 px-3">Assigned Model</th>
                                <th className="py-2.5 px-3">Deliverable Artifact</th>
                                <th className="py-2.5 px-3 text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60 text-xs">
                              {displayedContributions.map((emp) => {
                                const fullAgent = ALL_STUDIO_AGENTS.find(
                                  (a) => a.id === emp.agentId
                                )!;
                                return (
                                  <tr
                                    key={emp.agentId}
                                    className="hover:bg-slate-900/70 transition-colors"
                                  >
                                    <td className="py-2.5 px-3">
                                      <div className="font-mono font-semibold text-amber-300">
                                        {emp.agentId} · {emp.name}
                                      </div>
                                      <div className="text-slate-400 text-[11px]">{emp.role}</div>
                                    </td>
                                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-200 whitespace-nowrap">
                                      {emp.assignedModel}
                                    </td>
                                    <td className="py-2.5 px-3 text-slate-300">
                                      <div>{emp.outputArtifact}</div>
                                      <div className="text-[11px] text-slate-400 truncate max-w-xs">
                                        {emp.assignedAction}
                                      </div>
                                    </td>
                                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                      <button
                                        type="button"
                                        onClick={() => onSelectAgent(fullAgent)}
                                        className="px-2.5 py-1 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded transition-colors cursor-pointer"
                                      >
                                        Inspect & Prompt
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 3D Model Scouting & Cloud Pakchunk Pipeline Table (NL-059 & NL-110) */}
      <section
        aria-labelledby="threed-scout-heading"
        className="border border-slate-800 bg-[#0F1623] rounded-xl p-6 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-mono text-amber-400">
              3D ASSET SCOUTING & CLOUD PAKCHUNK CACHING PIPELINE · NL-059 & NL-110
            </div>
            <h2
              id="threed-scout-heading"
              className="text-lg font-bold text-slate-100 mt-1 font-display"
            >
              Sourced Batman 3D Model, Tim Sale Character Builds & Cloud IoStore Manifest
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-400 tabular-nums">
            6 Core Asset Packages · Pre-Warmed in Cloud NVMe RAM
          </span>
        </div>

        <div className="overflow-x-auto border border-slate-800 rounded-lg bg-slate-950">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-xs font-mono text-slate-400">
                <th className="py-3 px-4">Asset ID & Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Owners</th>
                <th className="py-3 px-4 text-right">Poly Budget</th>
                <th className="py-3 px-4">Cloud Runtime Format & Search Spec</th>
                <th className="py-3 px-4">State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-xs">
              {sprintReport.threeDAssetQueue.map((asset) => (
                <tr key={asset.assetId} className="hover:bg-slate-900/60">
                  <td className="py-3 px-4">
                    <div className="font-mono font-semibold text-slate-100">
                      {asset.assetId}
                    </div>
                    <div className="text-slate-300 font-medium">{asset.assetName}</div>
                  </td>
                  <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                    {asset.category}
                  </td>
                  <td className="py-3 px-4 font-mono text-amber-300 whitespace-nowrap">
                    {asset.assignedScoutAgentId} → {asset.assignedTechArtistId}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-200 whitespace-nowrap">
                    {asset.targetTriangleBudget.toLocaleString()} tris (LOD0–{asset.lodLevels - 1})
                  </td>
                  <td className="py-3 px-4 text-slate-300">
                    <div>{asset.formatSpec}</div>
                    <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                      Queries: {asset.searchKeywords.join(' · ')}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono text-emerald-400 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {asset.pipelineStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
