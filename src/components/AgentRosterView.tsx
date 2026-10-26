import React, { useMemo, useState } from 'react';
import { ALL_STUDIO_AGENTS, filterAgents } from '../studio/studioEngine';
import { STUDIO_DEPARTMENTS, STUDIO_MODEL_ARRAY } from '../studio/departments';
import { AgentSpec, DepartmentId, StudioModelId } from '../studio/types';
import { Search, Terminal, UserCheck } from 'lucide-react';

interface AgentRosterViewProps {
  selectedDepartment: DepartmentId | 'all';
  onSelectDepartment: (dept: DepartmentId | 'all') => void;
  selectedAgent: AgentSpec;
  onSelectAgent: (agent: AgentSpec) => void;
}

export const AgentRosterView: React.FC<AgentRosterViewProps> = ({
  selectedDepartment,
  onSelectDepartment,
  selectedAgent,
  onSelectAgent,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModel, setSelectedModel] = useState<StudioModelId | 'all'>('all');
  const [onlyOrchestrators, setOnlyOrchestrators] = useState(false);

  // Live Agent Tasking state
  const [taskInput, setTaskInput] = useState(
    'Generate your concrete technical specification and employee deliverable for Batman: The Long Halloween (Cloud-Streamed AAA).'
  );
  const [modelOverride, setModelOverride] = useState<StudioModelId | ''>('');
  const [isConsulting, setIsConsulting] = useState(false);
  const [consultResult, setConsultResult] = useState<{
    agentId: string;
    modelUsed: string;
    mode: string;
    output: string;
    audioDataUrl?: string;
    imageDataUrl?: string;
  } | null>(null);
  const [consultError, setConsultError] = useState<string | null>(null);

  const filteredAgents = useMemo(() => {
    return filterAgents({
      departmentId: selectedDepartment,
      modelId: selectedModel,
      onlyOrchestrators,
      search: searchQuery,
    });
  }, [selectedDepartment, selectedModel, onlyOrchestrators, searchQuery]);

  const handleRunAgentTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskInput.trim()) {
      setConsultError('Please enter a task directive for this agent.');
      return;
    }
    setConsultError(null);
    setIsConsulting(true);
    try {
      const response = await fetch('/api/studio/consult-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: selectedAgent.id,
          taskPrompt: taskInput.trim(),
          modelOverride: modelOverride || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setConsultError(data.error || 'Failed to consult agent.');
      } else {
        setConsultResult(data);
      }
    } catch (err: any) {
      setConsultError(err?.message || 'Network error while consulting agent.');
    } finally {
      setIsConsulting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <section
        aria-label="Roster Filters"
        className="border border-slate-800 bg-[#0F1623] rounded-xl p-5 space-y-4"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-mono text-amber-400">
              COMPLETE AAA STUDIO ROSTER · 150 AUTONOMOUS SPECIALISTS
            </div>
            <h1 className="text-xl font-bold text-slate-100 mt-0.5 font-display">
              150-Agent Directory, Identities & Multi-Model Execution
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                aria-label="Search 150 agents by ID, name, role, or specialty"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ID (NL-059), role, skill..."
                className="pl-9 pr-3.5 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-amber-400 w-64"
              />
            </div>

            <select
              aria-label="Filter by Assigned Model"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value as StudioModelId | 'all')}
              className="px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono focus:outline-none focus:border-amber-400"
            >
              <option value="all">All Models in Array (150)</option>
              {STUDIO_MODEL_ARRAY.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.id}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setOnlyOrchestrators((prev) => !prev)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                onlyOrchestrators
                  ? 'bg-amber-400 text-slate-950 border-amber-400 font-semibold'
                  : 'bg-slate-950 text-slate-300 border-slate-800 hover:text-white'
              }`}
            >
              12 Team Orchestrators Only
            </button>
          </div>
        </div>

        {/* 12 Department Segmented Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800/80">
          <button
            type="button"
            onClick={() => onSelectDepartment('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              selectedDepartment === 'all'
                ? 'bg-amber-400 text-slate-950 font-semibold'
                : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800/80'
            }`}
          >
            All Departments (150)
          </button>
          {STUDIO_DEPARTMENTS.map((dept) => {
            const isActive = selectedDepartment === dept.id;
            return (
              <button
                key={dept.id}
                type="button"
                onClick={() => onSelectDepartment(dept.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-amber-400 text-slate-950 font-semibold'
                    : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800/80'
                }`}
              >
                {String(dept.index).padStart(2, '0')}. {dept.shortName} ({dept.targetHeadcount})
              </button>
            );
          })}
        </div>
      </section>

      {/* Main Two-Column Split: Left Roster Table + Right Agent Identity & Live Tasking Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Columns: High-Density 150-Agent Table */}
        <div className="lg:col-span-7 border border-slate-800 bg-[#0F1623] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-mono text-slate-300 tabular-nums">
              Showing {filteredAgents.length} of {ALL_STUDIO_AGENTS.length} Studio Agents
            </span>
            <span className="text-xs text-slate-400">
              Click any agent row to inspect identity & run tasks
            </span>
          </div>

          <div className="max-h-[760px] overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-950 border-b border-slate-800 z-10">
                <tr className="text-[11px] font-mono text-slate-400">
                  <th className="py-2.5 px-3">ID & Codename</th>
                  <th className="py-2.5 px-3">Name & Role</th>
                  <th className="py-2.5 px-3">Department</th>
                  <th className="py-2.5 px-3">Assigned Model</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {filteredAgents.map((agent) => {
                  const isSelected = selectedAgent.id === agent.id;
                  return (
                    <tr
                      key={agent.id}
                      onClick={() => {
                        onSelectAgent(agent);
                        setModelOverride('');
                      }}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-amber-500/15 text-white'
                          : 'hover:bg-slate-900/80 text-slate-200'
                      }`}
                    >
                      <td className="py-2.5 px-3 font-mono whitespace-nowrap">
                        <div className="font-semibold text-amber-300">
                          {agent.id}
                          {agent.isTeamOrchestrator ? ' · ORCH' : ''}
                        </div>
                        <div className="text-[10px] text-slate-400">{agent.codeName}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-100">{agent.name}</div>
                        <div className="text-slate-400 text-[11px]">{agent.role}</div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 text-[11px]">
                        <div>{agent.departmentName}</div>
                        <div className="font-mono text-[10px] text-slate-400">
                          Orch: {agent.teamOrchestratorId}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-200 whitespace-nowrap">
                        {agent.assignedModel}
                      </td>
                    </tr>
                  );
                })}
                {filteredAgents.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-sm text-slate-400">
                      No agents match the active filter criteria.{' '}
                      <button
                        type="button"
                        onClick={() => {
                          onSelectDepartment('all');
                          setSelectedModel('all');
                          setOnlyOrchestrators(false);
                          setSearchQuery('');
                        }}
                        className="text-amber-400 underline ml-1 cursor-pointer"
                      >
                        Reset filters
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 5 Columns: Selected Agent Identity Inspector & Live Task Runner */}
        <aside
          aria-label="Selected Agent Identity Inspector"
          className="lg:col-span-5 border border-slate-800 bg-[#0F1623] rounded-xl p-5 space-y-5"
        >
          <div className="border-b border-slate-800 pb-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono text-amber-400">
              <span>
                {selectedAgent.id} · {selectedAgent.codeName}
              </span>
              <span>
                {selectedAgent.isTeamOrchestrator
                  ? 'DEPARTMENT TEAM ORCHESTRATOR'
                  : `REPORTS TO ${selectedAgent.teamOrchestratorId}`}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-100 font-display">
              {selectedAgent.name} — {selectedAgent.role}
            </h2>
            <div className="text-xs text-slate-400">
              <span>{selectedAgent.departmentName}</span>
              <span aria-hidden="true"> · </span>
              <span>{selectedAgent.tier}</span>
              <span aria-hidden="true"> · </span>
              <span className="font-mono tabular-nums">
                Utilization: {selectedAgent.utilizationRate}%
              </span>
            </div>
          </div>

          {/* Explicit Agent Identity Mandate */}
          <div className="space-y-1.5">
            <div className="text-xs font-mono text-slate-400">
              AGENT IDENTITY & SELF-AWARENESS MANDATE
            </div>
            <p className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 leading-relaxed">
              “{selectedAgent.identityMandate}”
            </p>
          </div>

          {/* Team Orchestrator Model Assignment Box */}
          <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">ORCHESTRATOR ASSIGNED MODEL:</span>
              <span className="text-amber-300 font-semibold">{selectedAgent.assignedModel}</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {selectedAgent.modelSelectionReason}
            </p>
          </div>

          {/* Deliverables, Inputs & Collaborators */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
              <div className="font-mono text-slate-400 text-[11px]">INPUTS CONSUMED</div>
              <ul className="space-y-1 text-slate-300">
                {selectedAgent.inputsConsumed.map((inp) => (
                  <li key={inp}>• {inp}</li>
                ))}
              </ul>
            </div>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
              <div className="font-mono text-slate-400 text-[11px]">DELIVERABLES PRODUCED</div>
              <ul className="space-y-1 text-slate-200 font-medium">
                {selectedAgent.deliverablesProduced.map((del) => (
                  <li key={del}>• {del}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="text-xs text-slate-400 font-mono">
            <span>Collaborates With: {selectedAgent.collaboratesWith.join(', ')}</span>
            <span aria-hidden="true"> · </span>
            <span>Repo File: {selectedAgent.repoFilePath}</span>
          </div>

          {/* Live Agent Consultation & Model Array Execution Form */}
          <form
            onSubmit={handleRunAgentTask}
            className="pt-4 border-t border-slate-800 space-y-3"
          >
            <div className="flex items-center justify-between">
              <label
                htmlFor="agent-task-directive"
                className="text-xs font-semibold text-slate-200"
              >
                Task {selectedAgent.name} ({selectedAgent.id}) Directly
              </label>
              <select
                aria-label="Override execution model from array"
                value={modelOverride}
                onChange={(e) => setModelOverride(e.target.value as StudioModelId | '')}
                className="px-2.5 py-1 text-[11px] font-mono bg-slate-950 border border-slate-800 rounded text-slate-200"
              >
                <option value="">
                  Default ({selectedAgent.assignedModel})
                </option>
                {STUDIO_MODEL_ARRAY.map((m) => (
                  <option key={m.id} value={m.id}>
                    Override: {m.id}
                  </option>
                ))}
              </select>
            </div>

            <textarea
              id="agent-task-directive"
              rows={3}
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-amber-400"
              placeholder="Enter task for this specialist..."
            />

            {consultError && (
              <div role="alert" className="text-xs text-red-300">
                {consultError}
              </div>
            )}

            <button
              type="submit"
              disabled={isConsulting}
              className="w-full py-2 px-4 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
            >
              {isConsulting
                ? `Executing on ${modelOverride || selectedAgent.assignedModel}...`
                : `Execute Task as ${selectedAgent.id} (${modelOverride || selectedAgent.assignedModel})`}
            </button>
          </form>

          {consultResult && (
            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-[11px] font-mono text-amber-300">
                <span>OUTPUT FROM {consultResult.agentId}</span>
                <span>
                  {consultResult.modelUsed} · {consultResult.mode}
                </span>
              </div>
              {consultResult.audioDataUrl && (
                <div className="space-y-1">
                  <div className="text-[11px] font-mono text-emerald-400">
                    Generated Audio Stream ({consultResult.modelUsed}):
                  </div>
                  <audio controls src={consultResult.audioDataUrl} className="w-full h-8" />
                </div>
              )}
              {consultResult.imageDataUrl && (
                <div className="space-y-1">
                  <img
                    src={consultResult.imageDataUrl}
                    alt={`Generated concept lookdev by ${consultResult.agentId}`}
                    referrerPolicy="no-referrer"
                    className="w-full rounded border border-slate-800"
                  />
                </div>
              )}
              <pre className="text-xs font-mono text-slate-200 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                {consultResult.output}
              </pre>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};
