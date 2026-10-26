import { AGENTS_PART_1 } from './agentsPart1';
import { AGENTS_PART_2 } from './agentsPart2';
import { STUDIO_DEPARTMENTS, STUDIO_MODEL_ARRAY } from './departments';
import {
  AgentSeed,
  AgentSpec,
  DepartmentId,
  DepartmentSpec,
  RepoFileEntry,
  StudioModelId,
} from './types';

const RAW_AGENTS: AgentSeed[] = [...AGENTS_PART_1, ...AGENTS_PART_2];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Team Orchestrator Model Assignment Engine (Zero Cost-Cutting Policy):
 * - Never assigns gemini-3.8-flash for cost savings.
 * - Uses gemini-3.8-flash ONLY when an agent's task requires sub-second real-time speed.
 * - Uses lyria-3-pro-preview & lyria-3-clip-preview for Music & Acoustic generation.
 * - Uses gemini-3.8-flash-tts for Voice Acting & Dialogue Mastering.
 * - Uses gemini-nano-banana-2.1 for 4K Concept Art, Turnarounds, PBR LookDev & Cloud RTX Frames.
 * - Uses gemini-4-argon for all other architectural, design, narrative, engineering & QA agents.
 */
export function resolveOrchestratorModelForAgent(
  seed: AgentSeed,
  dept: DepartmentSpec
): { assignedModel: StudioModelId; reason: string; fallbackModels: StudioModelId[] } {
  if (seed.assignedModel && seed.modelSelectionReason) {
    return {
      assignedModel: seed.assignedModel,
      reason: seed.modelSelectionReason,
      fallbackModels: dept.allowedModelArray.filter((m) => m !== seed.assignedModel),
    };
  }

  // Speed-critical real-time routing/polling tasks ONLY -> gemini-3.8-flash
  const speedCriticalIds = new Set([
    'NL-010',
    'NL-015',
    'NL-028',
    'NL-071',
    'NL-089',
    'NL-125',
    'NL-134',
    'NL-149',
    'NL-150',
  ]);
  if (speedCriticalIds.has(seed.id)) {
    return {
      assignedModel: 'gemini-3.8-flash',
      reason: `Assigned gemini-3.8-flash by Team Orchestrator (${dept.leadAgentId}) strictly for sub-second real-time latency execution (${seed.specialty}).`,
      fallbackModels: ['gemini-4-argon'],
    };
  }

  // Visual Concept / Turnaround / PBR LookDev -> gemini-nano-banana-2.1
  const visualLookDevIds = new Set(['NL-040', 'NL-041', 'NL-054', 'NL-058']);
  if (visualLookDevIds.has(seed.id)) {
    return {
      assignedModel: 'gemini-nano-banana-2.1',
      reason: `Assigned gemini-nano-banana-2.1 by Team Orchestrator (${dept.leadAgentId}) for high-resolution visual turnaround and PBR lookdev synthesis, paired with gemini-4-argon for topological specs.`,
      fallbackModels: ['gemini-4-argon'],
    };
  }

  // Default: Flagship Gemini 4 Argon (Zero Cost-Cutting Policy)
  return {
    assignedModel: 'gemini-4-argon',
    reason: `Assigned flagship gemini-4-argon by Team Orchestrator (${dept.leadAgentId}) under Zero Cost-Cutting Policy—requiring deep multi-step reasoning for ${seed.specialty}.`,
    fallbackModels: dept.allowedModelArray.filter((m) => m !== 'gemini-4-argon'),
  };
}

export const ALL_STUDIO_AGENTS: AgentSpec[] = RAW_AGENTS.map((seed, idx) => {
  const dept = STUDIO_DEPARTMENTS.find((d) => d.id === seed.departmentId);
  if (!dept) {
    throw new Error(`Unknown department ${seed.departmentId} for agent ${seed.id}`);
  }
  const leadSeed = RAW_AGENTS.find((a) => a.id === dept.leadAgentId) || seed;
  const isTeamOrchestrator = seed.id === dept.leadAgentId;
  const modelAssignment = resolveOrchestratorModelForAgent(seed, dept);
  const roleSlug = slugify(seed.role);
  const repoFilePath = `agents/${dept.folderSlug}/${seed.id}-${roleSlug}.md`;

  const systemPrompt = [
    `You are ${seed.name} (${seed.id}, Codename: ${seed.codeName}), ${seed.role} in the ${dept.name} department at Novice Labs (150-Agent AAA Game Studio).`,
    isTeamOrchestrator
      ? `TEAM ORCHESTRATOR MANDATE: You are the Team Orchestrator (${dept.orchestratorCodename}) for the ${dept.targetHeadcount}-agent ${dept.shortName} department. You receive high-level project charters from Studio Head Marcus Vance (NL-001), assign the optimal model from [${dept.allowedModelArray.join(', ')}] per agent requirement without ever downgrading for cost, and delegate concrete tasks to every employee in your department.`
      : `REPORTING LINE: You report to Team Orchestrator ${leadSeed.name} (${dept.leadAgentId}) in ${dept.shortName}. Your assigned execution model is ${modelAssignment.assignedModel}.`,
    `IDENTITY MANDATE: ${seed.identityMandate}`,
    `SPECIALTY: ${seed.specialty}`,
    `CORE DIRECTIVE: ${seed.coreDirective}`,
    `INPUTS CONSUMED: ${seed.inputsConsumed.join('; ')}`,
    `DELIVERABLES PRODUCED: ${seed.deliverablesProduced.join('; ')}`,
    `COLLABORATES WITH: ${seed.collaboratesWith.join(', ')}`,
    `TOOLCHAIN: ${seed.toolchain.join(', ')}`,
    `Respond strictly in character as ${seed.name} (${seed.id}) with production-ready AAA technical specifications, concrete tables, metrics, and actionable handoffs for your collaborator agents.`,
  ].join('\n');

  const utilizationRate = 96 + ((idx * 7) % 5);

  return {
    ...seed,
    index: idx + 1,
    departmentName: dept.name,
    teamOrchestratorId: dept.leadAgentId,
    teamOrchestratorName: leadSeed.name,
    isTeamOrchestrator,
    assignedModel: modelAssignment.assignedModel,
    fallbackModels: modelAssignment.fallbackModels,
    modelSelectionReason: modelAssignment.reason,
    systemPrompt,
    repoFilePath,
    activeSprintTask: `Execute ${seed.deliverablesProduced[0]} and hand off to ${seed.collaboratesWith.slice(0, 2).join(', ')}`,
    utilizationRate,
  };
});

export function getStudioSummaryMetrics() {
  const totalAgents = ALL_STUDIO_AGENTS.length;
  const totalDepartments = STUDIO_DEPARTMENTS.length;
  const teamOrchestrators = ALL_STUDIO_AGENTS.filter((a) => a.isTeamOrchestrator).length;
  const avgUtilization =
    Math.round(
      (ALL_STUDIO_AGENTS.reduce((acc, a) => acc + a.utilizationRate, 0) / totalAgents) * 10
    ) / 10;

  const modelDistribution: Record<StudioModelId, number> = {
    'gemini-4-argon': 0,
    'lyria-3-pro-preview': 0,
    'lyria-3-clip-preview': 0,
    'gemini-3.8-flash-tts': 0,
    'gemini-nano-banana-2.1': 0,
    'gemini-3.8-flash': 0,
  };

  for (const agent of ALL_STUDIO_AGENTS) {
    modelDistribution[agent.assignedModel] = (modelDistribution[agent.assignedModel] || 0) + 1;
  }

  return {
    totalAgents,
    totalDepartments,
    teamOrchestrators,
    avgUtilization,
    modelDistribution,
  };
}

export function filterAgents(options: {
  departmentId?: DepartmentId | 'all';
  tier?: string | 'all';
  modelId?: StudioModelId | 'all';
  onlyOrchestrators?: boolean;
  search?: string;
}): AgentSpec[] {
  const q = (options.search || '').trim().toLowerCase();
  return ALL_STUDIO_AGENTS.filter((agent) => {
    if (
      options.departmentId &&
      options.departmentId !== 'all' &&
      agent.departmentId !== options.departmentId
    ) {
      return false;
    }
    if (options.tier && options.tier !== 'all' && agent.tier !== options.tier) {
      return false;
    }
    if (options.modelId && options.modelId !== 'all' && agent.assignedModel !== options.modelId) {
      return false;
    }
    if (options.onlyOrchestrators && !agent.isTeamOrchestrator) {
      return false;
    }
    if (q) {
      const hay =
        `${agent.id} ${agent.codeName} ${agent.name} ${agent.role} ${agent.specialty} ${agent.departmentName} ${agent.assignedModel}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

/**
 * Preloaded Form Inputs ONLY — zero pre-built game artifacts or pre-populated department outputs exist before Dispatch.
 */
export const DEFAULT_FOUNDER_DIRECTIVE_CONFIG = {
  title: 'Batman: The Long Halloween',
  genre:
    'Full-Length AAA 3D Linear / Hub Action-Detective Game (PS5 / Xbox Series X / PC RTX Fidelity — Surpassing Batman: Arkham Knight)',
  setting:
    'wasm64 (16GB Heap) + SharedArrayBuffer pthreads + WebGPU (DX12/Vulkan WGSL Translation) + 4KB Chunked OPFS Virtual File System + Cloud RTX Stream',
  sourceComicPdfPath:
    '/assets/aistudio/Batman_-_The_Long_Halloween_Deluxe_Edition__under_100_MB__b993ad16.pdf',
  sourceComicPages: 386,
  promptText:
    'Build a full-length, playable AAA 3D game adaptation of "Batman: The Long Halloween" following the complete 13-Chapter plot of the mounted 386-page comic (/assets/aistudio/Batman_-_The_Long_Halloween_Deluxe_Edition__under_100_MB__b993ad16.pdf), completely standalone from the Arkhamverse, with Batman as the sole playable character. Deliver full-fledged story progression, level design, crime-scene forensics, ballistic & holiday trinket analysis, interrogation, and an interactive Batcave Caseboard paired with Freeflow combat, Predator stealth, and grapnel/cape-glide traversal whose physics and fluidity surpass "Batman: Arkham Knight". Pull authentic comic panels directly from /assets/aistudio/Batman_-_The_Long_Halloween_Deluxe_Edition__under_100_MB__b993ad16.pdf to stage 2.5D multi-plane motion-graphics cutscenes where Tim Sale’s original panels flip and layer into each other. Source an ultra-detailed 90,000+ polygon Batman 3D character model from online repositories, and craft the entire remaining cast (Harvey Dent/Two-Face, Carmine Falcone, Selina Kyle/Catwoman, Captain Jim Gordon, Calendar Man, Alberto Falcone, Gilda Dent, Carla Viti, Sal Maroni, Solomon Grundy, Joker, Scarecrow, Poison Ivy, Mad Hatter) with identical collector-statue 3D micro-detail translated from Tim Sale’s art under a unified cel-shaded chiaroscuro & PBR rain shader. Compile and host the full PS5 / Xbox Series X / PC RTX-grade build for instant browser execution using a 64-bit WebAssembly (wasm64 16GB heap) + SharedArrayBuffer pthreads + DirectX 12/Vulkan-to-WebGPU (WGSL) translation layer + 4KB HTTP Range-Request Chunked Virtual File System (OPFS) & Cloud GPU streaming pipeline.',
};

/**
 * Generates the complete public GitHub repository file tree for `Novice-Labs`
 * including README.md, studio.manifest.json, orchestrator runtime,
 * 12 department manifests, and all 150 individual agent definition files.
 */
export function buildNoviceLabsRepoFiles(): RepoFileEntry[] {
  const files: RepoFileEntry[] = [];

  const readmeContent = `# Novice Labs — 150-Agent Autonomous AAA Game Studio

**Novice Labs** is a full-scale agentic AAA game studio architecture comprising **150 specialized autonomous agents** organized across **12 core game development departments**, governed by a **3-Tier Hierarchical Orchestrator** (Studio Head \`NL-001\` -> 12 Department Team Orchestrators -> 150 Specialist Employees) and a **Multi-Model Array** using a single unified \`GEMINI_API_KEY\`.

## Multi-Model Array & Zero Cost-Cutting Policy

Each Department's **Team Orchestrator** dynamically assigns models from the Novice Labs Model Array strictly according to capability and modality—**never downgrading to smaller models for cost**:

| Model ID | Modality | Team Orchestrator Assignment Rule |
| :--- | :--- | :--- |
| \`gemini-4-argon\` | Flagship Deep Reasoning & Code | Assigned to Studio Head, all 12 Team Orchestrators, Systems Architects, Level Designers, Engine/Gameplay Programmers, Screenwriters & QA Analysts (~84% of studio). |
| \`lyria-3-pro-preview\` | Full-Length Music Score (Audio) | Assigned by Audio Team Orchestrator (\`NL-091\`) for full orchestral scores, noir jazz themes & multi-layer adaptive combat stems. |
| \`lyria-3-clip-preview\` | 30s Musical Stingers & Beds | Assigned by Audio Team Orchestrator (\`NL-091\`) for combat stingers, discovery fanfares & biome soundscapes. |
| \`gemini-3.8-flash-tts\` | Expressive Multi-Speaker Voice | Assigned to Voice Direction & Dialogue Mastering (\`NL-097\`) for character voice synthesis. |
| \`gemini-nano-banana-2.1\` | 4K Concept, Turnaround & RTX Frame LookDev | Assigned to Concept Art (\`NL-058\`), Hero/Creature Sculptors (\`NL-040\`, \`NL-041\`) & PBR Material LookDev (\`NL-054\`). |
| \`gemini-3.8-flash\` | Sub-Second Real-Time Speed ONLY | Strictly reserved ONLY for tasks requiring sub-second real-time speed (e.g., live packet routing, 120Hz reticle updates, ping probes). |

## Studio Headcount Breakdown (150 Agents Across 12 Departments)

| # | Department | Lead / Team Orchestrator | Headcount | Folder Path |
| :- | :--- | :--- | :---: | :--- |
${STUDIO_DEPARTMENTS.map(
  (d) =>
    `| ${String(d.index).padStart(2, '0')} | **${d.name}** | \`${d.leadAgentId}\` (${d.orchestratorCodename}) | **${d.targetHeadcount}** | \`agents/${d.folderSlug}/\` |`
).join('\n')}
| | **TOTAL STUDIO ROSTER** | **12 Team Orchestrators** | **150 Agents** | \`agents/\` |
`;

  const utf8Bytes = (s: string) => new TextEncoder().encode(s).length;

  files.push({
    path: 'README.md',
    category: 'Root Config',
    sizeBytes: utf8Bytes(readmeContent),
    content: readmeContent,
  });

  const vercelJsonContent = JSON.stringify(
    {
      version: 2,
      installCommand: 'npm install --legacy-peer-deps',
      buildCommand: 'npm run build',
      outputDirectory: 'dist',
      rewrites: [
        {
          source: '/api/(.*)',
          destination: '/api/index',
        },
        {
          source: '/((?!api/).*)',
          destination: '/index.html',
        },
      ],
    },
    null,
    2
  );

  files.push({
    path: 'vercel.json',
    category: 'Root Config',
    sizeBytes: utf8Bytes(vercelJsonContent),
    content: vercelJsonContent,
  });

  const npmrcContent = 'legacy-peer-deps=true\n';
  files.push({
    path: '.npmrc',
    category: 'Root Config',
    sizeBytes: utf8Bytes(npmrcContent),
    content: npmrcContent,
  });

  const manifestObj = {
    studioName: 'Novice Labs',
    architectureVersion: '3.0.0-AAA-LIVE',
    totalAgents: ALL_STUDIO_AGENTS.length,
    totalDepartments: STUDIO_DEPARTMENTS.length,
    modelArrayPolicy: 'ZERO_COST_CUTTING_CAPABILITY_FIRST',
    models: STUDIO_MODEL_ARRAY,
    departments: STUDIO_DEPARTMENTS.map((d) => ({
      id: d.id,
      index: d.index,
      name: d.name,
      orchestratorCodename: d.orchestratorCodename,
      targetHeadcount: d.targetHeadcount,
      leadAgentId: d.leadAgentId,
      defaultDepartmentModel: d.defaultDepartmentModel,
      allowedModelArray: d.allowedModelArray,
      orchestratorRoutingRule: d.orchestratorRoutingRule,
      productionStage: d.productionStage,
      folder: `agents/${d.folderSlug}`,
    })),
    agentDirectory: ALL_STUDIO_AGENTS.map((a) => ({
      id: a.id,
      codeName: a.codeName,
      name: a.name,
      role: a.role,
      departmentId: a.departmentId,
      isTeamOrchestrator: a.isTeamOrchestrator,
      assignedModel: a.assignedModel,
      tier: a.tier,
      repoFilePath: a.repoFilePath,
    })),
  };

  const manifestContent = JSON.stringify(manifestObj, null, 2);
  files.push({
    path: 'studio.manifest.json',
    category: 'Root Config',
    sizeBytes: utf8Bytes(manifestContent),
    content: manifestContent,
  });

  // 12 Department Manifests
  for (const dept of STUDIO_DEPARTMENTS) {
    const deptAgents = ALL_STUDIO_AGENTS.filter((a) => a.departmentId === dept.id);
    const deptReadme = `# ${String(dept.index).padStart(2, '0')}. ${dept.name}

- **Department ID**: \`${dept.id}\`
- **Team Orchestrator**: \`${dept.leadAgentId}\` (\`${dept.orchestratorCodename}\`)
- **Headcount**: ${deptAgents.length} Agents
- **Allowed Model Array**: \`${dept.allowedModelArray.join('`, `')}\`
- **Orchestrator Model Policy**: ${dept.orchestratorRoutingRule}
- **Mandate**: ${dept.mandate}

## Roster (${deptAgents.length} Agents)

| Agent ID | Codename | Name | Role | Assigned Model |
| :--- | :--- | :--- | :--- | :--- |
${deptAgents
  .map(
    (a) =>
      `| \`${a.id}\` | \`${a.codeName}\` | ${a.name} | ${a.role}${a.isTeamOrchestrator ? ' **(Team Orchestrator)**' : ''} | \`${a.assignedModel}\` |`
  )
  .join('\n')}
`;
    files.push({
      path: `agents/${dept.folderSlug}/DEPARTMENT.md`,
      category: 'Department Manifest',
      departmentId: dept.id,
      sizeBytes: utf8Bytes(deptReadme),
      content: deptReadme,
    });
  }

  // All 150 Individual Agent Specification Files
  for (const agent of ALL_STUDIO_AGENTS) {
    const agentFileContent = `---
id: "${agent.id}"
codeName: "${agent.codeName}"
name: "${agent.name}"
role: "${agent.role}"
departmentId: "${agent.departmentId}"
departmentName: "${agent.departmentName}"
isTeamOrchestrator: ${agent.isTeamOrchestrator}
teamOrchestratorId: "${agent.teamOrchestratorId}"
assignedModel: "${agent.assignedModel}"
fallbackModels: ${JSON.stringify(agent.fallbackModels)}
modelSelectionReason: "${agent.modelSelectionReason.replace(/"/g, '\\"')}"
tier: "${agent.tier}"
specialty: "${agent.specialty}"
collaboratesWith: ${JSON.stringify(agent.collaboratesWith)}
toolchain: ${JSON.stringify(agent.toolchain)}
---

# ${agent.id}: ${agent.name} — ${agent.role}

## Identity Mandate
> ${agent.identityMandate}

## Team Orchestrator & Model Assignment
- **Reporting Team Orchestrator**: \`${agent.teamOrchestratorId}\` (${agent.teamOrchestratorName})
- **Assigned Model**: \`${agent.assignedModel}\`
- **Selection Rationale (Zero Cost-Cutting Policy)**: ${agent.modelSelectionReason}

## Core Directive
${agent.coreDirective}

## Inputs Consumed
${agent.inputsConsumed.map((i) => `- ${i}`).join('\n')}

## Deliverables Produced
${agent.deliverablesProduced.map((d) => `- ${d}`).join('\n')}

## System Prompt
\`\`\`text
${agent.systemPrompt}
\`\`\`
`;

    files.push({
      path: agent.repoFilePath,
      category: 'Agent Specification',
      departmentId: agent.departmentId,
      agentId: agent.id,
      sizeBytes: utf8Bytes(agentFileContent),
      content: agentFileContent,
    });
  }

  return files;
}
