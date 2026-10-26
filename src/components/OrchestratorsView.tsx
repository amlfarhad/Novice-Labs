import React from 'react';
import { STUDIO_DEPARTMENTS, STUDIO_MODEL_ARRAY } from '../studio/departments';
import { ALL_STUDIO_AGENTS, getStudioSummaryMetrics } from '../studio/studioEngine';
import { AgentSpec, DepartmentId } from '../studio/types';

interface OrchestratorsViewProps {
  onSelectAgent: (agent: AgentSpec) => void;
  onSelectDepartmentRoster: (deptId: DepartmentId) => void;
}

export const OrchestratorsView: React.FC<OrchestratorsViewProps> = ({
  onSelectAgent,
  onSelectDepartmentRoster,
}) => {
  const summary = getStudioSummaryMetrics();

  return (
    <div className="space-y-8">
      {/* Multi-Model Array & Zero Cost-Cutting Policy Section */}
      <section
        aria-labelledby="model-array-heading"
        className="border border-slate-800 bg-[#0F1623] rounded-xl p-6 space-y-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="text-xs font-mono text-amber-400">
              UNIFIED GEMINI_API_KEY · MULTI-MODEL ARRAY & ZERO COST-CUTTING GOVERNANCE
            </div>
            <h1
              id="model-array-heading"
              className="text-2xl font-bold text-slate-100 mt-1 font-display"
            >
              Team Orchestrator Model Routing Array (150 Agents)
            </h1>
          </div>
          <div className="text-xs font-mono text-slate-300 tabular-nums">
            <span>12 Team Orchestrators</span>
            <span aria-hidden="true"> · </span>
            <span>6 Specialized Models</span>
            <span aria-hidden="true"> · </span>
            <span>150 / 150 Allocated</span>
          </div>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed">
          Every department in Novice Labs is governed by a dedicated <strong>Team Orchestrator</strong> that assigns models from the studio’s Model Array strictly by capability requirement—<strong>never downgrading to Flash for cost</strong>. Flagship{' '}
          <code className="font-mono text-amber-300">gemini-4-argon</code> powers 129 deep-reasoning, design, narrative, and engineering agents;{' '}
          <code className="font-mono text-amber-300">lyria-3-pro-preview</code> and{' '}
          <code className="font-mono text-amber-300">lyria-3-clip-preview</code> power musical score and acoustic stingers; and{' '}
          <code className="font-mono text-amber-300">gemini-3.8-flash</code> is restricted strictly to 9 sub-second speed-critical agents.
        </p>

        <div className="overflow-x-auto border border-slate-800 rounded-lg bg-slate-950">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-xs font-mono text-slate-400">
                <th className="py-3 px-4">Model ID</th>
                <th className="py-3 px-4">Modality</th>
                <th className="py-3 px-4 text-right">Agents Assigned</th>
                <th className="py-3 px-4">Team Orchestrator Allocation Policy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-xs">
              {STUDIO_MODEL_ARRAY.map((model) => {
                const count = summary.modelDistribution[model.id] || 0;
                return (
                  <tr key={model.id} className="hover:bg-slate-900/60">
                    <td className="py-3 px-4 font-mono font-semibold text-amber-300 whitespace-nowrap">
                      {model.id}
                    </td>
                    <td className="py-3 px-4 text-slate-200 whitespace-nowrap">
                      {model.modality}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums text-slate-100 whitespace-nowrap">
                      {count} / 150
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      <div>{model.orchestratorPolicy}</div>
                      <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                        {model.costPolicyNote}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 12 Department Team Orchestrators Matrix */}
      <section aria-labelledby="twelve-orchestrators-heading" className="space-y-4">
        <div>
          <div className="text-xs font-mono text-amber-400">
            DEPARTMENT LEADERSHIP · 12 TEAM ORCHESTRATORS
          </div>
          <h2
            id="twelve-orchestrators-heading"
            className="text-xl font-bold text-slate-100 mt-1 font-display"
          >
            12 Department Team Orchestrators & Headcount Verification (Total = 150)
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {STUDIO_DEPARTMENTS.map((dept) => {
            const leadAgent = ALL_STUDIO_AGENTS.find((a) => a.id === dept.leadAgentId)!;
            const deptAgents = ALL_STUDIO_AGENTS.filter((a) => a.departmentId === dept.id);
            return (
              <div
                key={dept.id}
                className="border border-slate-800 bg-[#0F1623] rounded-xl p-5 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                    <span className="text-amber-400 font-semibold">
                      DEPT {String(dept.index).padStart(2, '0')} · {dept.orchestratorCodename}
                    </span>
                    <span className="tabular-nums text-emerald-400">
                      {deptAgents.length} / {dept.targetHeadcount} Agents
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-100 font-display">
                    {dept.name}
                  </h3>

                  <div className="text-xs text-slate-300">
                    <strong>Team Orchestrator:</strong> {leadAgent.name} (
                    <code className="font-mono text-amber-300">{leadAgent.id}</code>) ·{' '}
                    <span className="text-slate-400">{leadAgent.role}</span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{dept.mandate}</p>

                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1 text-xs">
                    <div className="font-mono text-[11px] text-amber-300">
                      Allowed Model Array: {dept.allowedModelArray.join(' · ')}
                    </div>
                    <div className="text-slate-400 leading-relaxed">
                      {dept.orchestratorRoutingRule}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => onSelectAgent(leadAgent)}
                    className="text-xs font-medium text-slate-200 hover:text-amber-300 cursor-pointer"
                  >
                    Inspect Orchestrator ({leadAgent.id})
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectDepartmentRoster(dept.id)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-md transition-colors cursor-pointer"
                  >
                    View All {dept.targetHeadcount} Agents
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
