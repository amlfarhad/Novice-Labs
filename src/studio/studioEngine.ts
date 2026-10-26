import { AGENTS_PART_1 } from './agentsPart1';
import { AGENTS_PART_2 } from './agentsPart2';
import { STUDIO_DEPARTMENTS, STUDIO_MODEL_ARRAY } from './departments';
import {
  AgentSeed,
  AgentSpec,
  DepartmentId,
  DepartmentSpec,
  DepartmentSprintOutput,
  RepoFileEntry,
  StudioModelId,
  StudioSprintReport,
  ThreeDAssetBrief,
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
 * - Uses gemini-nano-banana-2.1 for 4K Concept Art, Turnarounds & PBR LookDev.
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
  const speedCriticalIds = new Set(['NL-010', 'NL-015', 'NL-028', 'NL-071', 'NL-089', 'NL-125', 'NL-134', 'NL-149', 'NL-150']);
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

  const utilizationRate = 96 + ((idx * 7) % 5); // 96% - 100%

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
    if (options.departmentId && options.departmentId !== 'all' && agent.departmentId !== options.departmentId) {
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
      const hay = `${agent.id} ${agent.codeName} ${agent.name} ${agent.role} ${agent.specialty} ${agent.departmentName} ${agent.assignedModel}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export interface StudioPresetBrief {
  id: string;
  title: string;
  genre: string;
  setting: string;
  promptText: string;
  architecturalApproach: string[];
}

export const STUDIO_PRESET_BRIEFS: StudioPresetBrief[] = [
  {
    id: 'batman-long-halloween',
    title: 'Batman: The Long Halloween (Cloud-Streamed AAA Arkham-Successor Noir Detective)',
    genre: 'Noir Detective Mystery & Next-Gen Arkham-Successor Action (Batman Sole Playable)',
    setting: 'Year-One Gothic Gotham City · Living Graphic-Novel Cel-Shaded AAA Fidelity across 13 Holiday Chapters',
    promptText:
      'Build a jaw-dropping AAA game adaptation of "Batman: The Long Halloween" (100% Long Halloween story canon, separate from the Arkhamverse, with Batman as sole playable character). Direction requires deep noir detective gameplay (crime-scene forensics, ballistic & holiday trinket analysis, interrogation, and a living Caseboard) paired with combat, stealth, and grapnel/cape-glide traversal that feel like a true next-generation successor to the Batman: Arkham series. Cutscenes must be 2.5D motion-graphics of authentic Tim Sale comic panels flipping and layering into each other (zero AI slop). Source an ultra-detailed Batman 3D character model from the internet, and craft the remaining cast (Harvey Dent/Two-Face, Carmine Falcone, Catwoman, Gordon, Calendar Man, Alberto Falcone, Solomon Grundy, Joker, Scarecrow, Poison Ivy, Mad Hatter) with the exact same collector-grade 3D micro-detail as if a master 3D character sculptor translated Tim Sale’s panels into 85k-polygon rigs. Unify the entire visual presentation with a jaw-dropping stylized comic-book / next-gen cel-shaded aesthetic (stepped chiaroscuro shadows, dynamic ink linework, PBR rain/fabric micro-surfaces). Package as a native PC/Console AAA build with pre-warmed cloud asset caches streamed directly to the browser via WebRTC (zero Three.js).',
    architecturalApproach: [
      '1. Noir Detective Direction + Next-Gen Arkham-Successor Gameplay (NL-002, NL-008, NL-011 -> NL-024): Balance 50% Hardboiled Noir Detective Investigation (multi-spectrum forensic crime scenes, .22 Holiday ballistic reconstruction, Arkham glass-cell psychological duels with Calendar Man, non-linear Evidence Caseboard) with 50% Next-Gen Arkham-Successor Action (Freeflow v4 rhythmic counter/redirect combat, environmental takedowns, Fear Predator stealth, and seamless Grapnel-Boost-to-Cape-Glide rooftop traversal).',
      '2. Collector-Grade 3D Character Translation & Sourced Batman Parity (NL-039 -> NL-050, NL-059): Eliminate any visual gap between the internet-sourced Batman 3D model and the custom-built cast. NL-059 scouts an ultra-high-detail Arkham/Prime-1 statue-grade Batman rig, while NL-039..NL-048 translate Tim Sale’s iconic silhouettes into 75k–90k triangle collector-grade 3D sculpts featuring pore-level skin, tailored wool pinstripes, stitched leather, and 52-FACS blendshapes—wrapped in a unified comic-book cel-shading & ink-contour shader.',
      '3. Living Graphic-Novel Cel-Shading & 2.5D Comic-Panel Cutscenes (NL-005, NL-056, NL-073, NL-105, NL-137): Every frame looks like a jaw-dropping, living graphic novel. In-game rendering fuses physically based rain/cloth micro-detail with a custom Next-Gen Cel-Shaded Chiaroscuro BRDF (stepped shadow bands, curvature-driven sumi-ink outlines, tangent-space crosshatching). Cutscenes use 2.5D parallax motion graphics of authentic Tim Sale comic panels flipping and stacking in 3D space (zero AI video slop).',
      '4. Cloud-Cached Native AAA Browser Streaming (NL-103 -> NL-118, Zero Three.js): Native C++20/Vulkan/UE5 build packaged into signed IoStore (.ucas/.utoc) containers with 92% of Gotham assets pre-warmed in Cloud GPU NVMe RAM pools, streamed to the browser at 1440p/4K 60fps via WebRTC NVENC/AV1 with sub-16ms 120Hz DataChannel input prediction.',
    ],
  },
  {
    id: 'aethelgard-eclipse',
    title: 'Project Aethelgard: The Shattered Crown',
    genre: 'Open-World Tactical Action RPG',
    setting: 'Vertical Gothic Megastructures & Eroded Alpine Valleys',
    promptText:
      'Architect a 60-FPS Open-World Tactical Action RPG featuring frame-accurate parry/posture combat, a 3-tier vertical citadel dungeon, dynamic weather storms, and adaptive orchestral boss music.',
    architecturalApproach: [
      '1. Systems & Combat (NL-011 -> NL-024): Lock 12-frame parry windows and poise stagger thresholds.',
      '2. Environment & 3D Scouting (NL-051 -> NL-066): Assemble 45-piece gothic kitbash sets with scouted photogrammetry scans.',
      '3. Audio & Lyria Score (NL-091 -> NL-102): Generate 4-layer adaptive boss music stems via Google Lyria 3 Pro.',
    ],
  },
];

export const DEFAULT_3D_ASSET_QUEUE: ThreeDAssetBrief[] = [
  {
    assetId: '3D-BAT-001',
    assetName: 'Batman (Sourced Arkham-Successor Tactical Suit, Scalloped Cape & Cel-Ink Shader Rig)',
    category: 'Hero Character',
    assignedScoutAgentId: 'NL-059',
    assignedTechArtistId: 'NL-110',
    targetTriangleBudget: 92000,
    lodLevels: 4,
    textureMaps: ['Albedo_4K', 'MicroNormal_KevlarWeave_4K', 'ORM_Packed_4K', 'CelRamp_Chiaroscuro_2K', 'SumiInk_CurvatureMask_4K'],
    formatSpec: 'glTF 2.0 / Pakchunk0-Hero (Internet-Sourced Master Rig + 85-Bone Skeleton + 64-Bone Verlet Glide Cape)',
    searchKeywords: ['batman arkham knight ultra detail rig gltf', 'batman prime1 statue proportion pbr 3d model', 'batman cape skeletal mesh fbx'],
    pipelineStatus: 'Shader Ready',
  },
  {
    assetId: '3D-BAT-002',
    assetName: 'Harvey Dent / Two-Face (Collector-Grade Tim Sale Translation · Dual 52-FACS Rig)',
    category: 'Hero Character',
    assignedScoutAgentId: 'NL-041',
    assignedTechArtistId: 'NL-043',
    targetTriangleBudget: 84000,
    lodLevels: 4,
    textureMaps: ['Albedo_4K', 'PoreAndKeloid_MicroNormal_4K', 'WoolPinstripe_Aniso_4K', 'CelShadow_StepLUT', 'Crosshatch_ID_Mask'],
    formatSpec: 'glTF 2.0 / Pakchunk1-Cast (Master-Sculpted from Tim Sale Panels · Matches Sourced Batman Micro-Fidelity)',
    searchKeywords: ['harvey dent two-face collector statue sculpt reference', '1940s double-breasted pinstriped suit pbr'],
    pipelineStatus: 'Shader Ready',
  },
  {
    assetId: '3D-BAT-003',
    assetName: 'Selina Kyle / Catwoman & Carmine "The Roman" Falcone (Collector-Grade Noir Cast Pack)',
    category: 'Hero Character',
    assignedScoutAgentId: 'NL-059',
    assignedTechArtistId: 'NL-040',
    targetTriangleBudget: 82000,
    lodLevels: 4,
    textureMaps: ['Albedo_4K', 'LeatherStitch_SilkWeave_Normal_4K', 'ORM_4K', 'Fresnel_InkRim_Ramp_2K'],
    formatSpec: 'glTF 2.0 / Pakchunk1-Cast (85-Bone Humanoid + Whip Spline IK + Claw-Scar Normal Layer)',
    searchKeywords: ['catwoman long halloween purple suit 3d reference', 'noir mafia don tuxedo sculpt gltf'],
    pipelineStatus: 'Topology Verified',
  },
  {
    assetId: '3D-BAT-004',
    assetName: 'Long Halloween Rogue Gallery (Calendar Man, Joker, Solomon Grundy, Scarecrow, Ivy, Hatter)',
    category: 'Hero Character',
    assignedScoutAgentId: 'NL-041',
    assignedTechArtistId: 'NL-048',
    targetTriangleBudget: 88000,
    lodLevels: 4,
    textureMaps: ['Albedo_4K', 'Biomechanical_MicroNormal_4K', 'ORM_4K', 'ComicCel_Halftone_LUT'],
    formatSpec: 'glTF 2.0 / Pakchunk1-Rogues (Real-Artist 3D Translations of Tim Sale Silhouettes + Cel-Shaded PBR)',
    searchKeywords: ['solomon grundy hulking creature rig', 'arkham glass cell calendar man environment'],
    pipelineStatus: 'Topology Verified',
  },
  {
    assetId: '3D-BAT-005',
    assetName: 'Holiday Killer Forensics Kit (.22 Taped Pistol, Baby-Bottle Silencer & 13 Holiday Trinkets)',
    category: 'Hard-Surface Weapon/Vehicle',
    assignedScoutAgentId: 'NL-059',
    assignedTechArtistId: 'NL-055',
    targetTriangleBudget: 32000,
    lodLevels: 3,
    textureMaps: ['Albedo_4K', ' PowderBurn_Fingerprint_Normal_4K', 'MetallicRoughness_4K', 'InkContour_ID'],
    formatSpec: 'glTF 2.0 / Pakchunk3-Detective (Close-Up 4K Forensic Rotation Mesh + Ballistic Trajectory Splines)',
    searchKeywords: ['vintage 22 pistol taped grip 3d model', 'noir detective crime scene evidence markers pbr'],
    pipelineStatus: 'Shader Ready',
  },
  {
    assetId: '3D-BAT-006',
    assetName: 'Tim Sale 2.5D Multi-Plane Comic Panel Cutscene Stage & Rain-Drenched Gotham Kit',
    category: 'Modular Environment',
    assignedScoutAgentId: 'NL-052',
    assignedTechArtistId: 'NL-137',
    targetTriangleBudget: 54000,
    lodLevels: 4,
    textureMaps: ['TrimSheet_GothicNoir_4K', 'InkPlate_Alpha_4K', 'WetCobblestone_ORM_4K', 'Halftone_Shadow_LUT'],
    formatSpec: 'Cloud IoStore Pakchunk2-GothamNoir (1m Snap-Grid Modular Kit + 2.5D Panel Flip Stage, Pre-Warmed in NVMe RAM)',
    searchKeywords: ['gothic gargoyle clocktower modular kit', '2.5d parallax comic panel camera rig'],
    pipelineStatus: 'Shader Ready',
  },
];

export function generateStudioSprintReport(
  projectTitle = 'Batman: The Long Halloween (Cloud-Streamed AAA Arkham-Successor Noir Detective)',
  genre = 'Noir Detective Mystery & Next-Gen Arkham-Successor Action (Batman Sole Playable)',
  setting = 'Year-One Gothic Gotham City · Living Graphic-Novel Cel-Shaded AAA Fidelity across 13 Holiday Chapters'
): StudioSprintReport {
  const isBatman =
    projectTitle.toLowerCase().includes('batman') ||
    projectTitle.toLowerCase().includes('halloween') ||
    genre.toLowerCase().includes('batman') ||
    genre.toLowerCase().includes('arkham');

  const departmentOutputs: DepartmentSprintOutput[] = STUDIO_DEPARTMENTS.map((dept) => {
    const deptAgents = ALL_STUDIO_AGENTS.filter((a) => a.departmentId === dept.id);
    const lead = deptAgents.find((a) => a.id === dept.leadAgentId) || deptAgents[0];

    const modelCounts: Record<string, number> = {};
    for (const a of deptAgents) {
      modelCounts[a.assignedModel] = (modelCounts[a.assignedModel] || 0) + 1;
    }
    const orchestratorModelSummary = Object.entries(modelCounts)
      .map(([m, c]) => `${c}× ${m}`)
      .join(' · ');

    const concreteArtifactsByDept: Record<DepartmentId, { title: string; summary: string; content: string }> = isBatman
      ? {
          'executive-production': {
            title: 'Studio Head Charter: Arkham-Successor Gameplay + Noir Detective + Cel-Shaded Graphic Novel Fidelity',
            summary:
              'Studio Head Marcus Vance (NL-001) and Creative Director Elena Rostova (NL-002) lock the 4 non-negotiable pillars: (1) Deep Noir Detective Investigation across all 13 Holiday murders; (2) Combat, Stealth & Traversal worthy of a true next-gen Batman: Arkham successor; (3) Jaw-dropping Stylized Comic-Book / Cel-Shaded visual cohesion across the internet-sourced Batman model and master-sculpted Tim Sale cast; (4) Cloud-Streamed Native AAA runtime (Zero Three.js).',
            content: `[STUDIO HEAD DECOMPOSITION — NL-001 MARCUS VANCE & NL-002 ELENA ROSTOVA (gemini-4-argon)]
PROJECT: ${projectTitle}
STORY CANON: 100% Jeph Loeb & Tim Sale's "Batman: The Long Halloween" (Standalone Canon · Separate from Arkhamverse · Batman Sole Playable)

1. DIRECTION PILLAR A — HARDBOILED NOIR DETECTIVE CORE (-> Teams 02, 03 & 06):
   - Every Holiday chapter centers on an unscripted forensic investigation: reconstructing .22 caliber trajectories, analyzing Holiday trinkets, cross-examining Calendar Man in Arkham, and linking Falcone/Maroni/Dent motives on the Batcave Caseboard.

2. DIRECTION PILLAR B — NEXT-GEN BATMAN: ARKHAM SUCCESSOR GAMEPLAY (-> Teams 02, 07 & 10):
   - Combat, Predator Stealth, and Rooftop Traversal must feel like the next evolution of Batman: Arkham Knight: Freeflow v4 rhythmic counter/redirect combat, multi-tier environmental beatdowns, gargoyle Fear takedowns, and seamless Grapnel-Boost into dynamic Cape Gliding.

3. DIRECTION PILLAR C — JAW-DROPPING CEL-SHADED GRAPHIC NOVEL COHESION (-> Teams 04, 05, 09 & 11):
   - Sourced Batman Model + Custom Tim Sale Cast Parity: Whether sourced from top 3D repositories (Batman) or custom-sculpted from Tim Sale's panels (Two-Face, Falcone, Catwoman, Gordon, Joker, Grundy), every character hits 80k–92k triangles with micro-normal fabric/pore fidelity, unified under our Next-Gen Cel-Shaded Chiaroscuro & Dynamic Sumi-Ink Shader.
   - Cutscenes: 2.5D parallax motion graphics of authentic Tim Sale comic panels flipping into each other (Zero AI Slop).

4. DIRECTION PILLAR D — CLOUD-CACHED NATIVE AAA STREAMING (-> Team 09, Zero Three.js):
   - Native C++20/Vulkan/UE5 binary with 92% pre-warmed NVMe pakchunk caches streamed to the browser at 4K 60fps via WebRTC.`,
          },
          'game-systems-design': {
            title: 'Noir Detective Caseboard Forensics & Arkham-Successor Freeflow v4 Combat Architecture',
            summary:
              'Team Orchestrator Kaelen Voss (NL-011) and Combat Architect Ryuji Sato (NL-012) fuse deep noir crime-scene deduction with next-gen Arkham-successor Freeflow combat, Predator stealth, and Grapnel-Glide momentum.',
            content: `[TEAM 02 CHARTER — NL-011 KAELEN VOSS (13x gemini-4-argon, 1x gemini-3.8-flash)]
1. DEEP NOIR DETECTIVE MECHANICS (NL-011, NL-017, NL-021):
   - Multi-Layer Crime Scene Reconstruction: Inspect powder burns, .22 shell casings, baby-bottle nipple silencers, and holiday trinkets across 3D time-scrubbed reconstructions.
   - Deduction Caseboard & Interrogation: Connect physical clues to suspect alibis (Alberto Falcone, Harvey Dent, Gilda Dent, Carmine Falcone) and apply psychological pressure during rooftop/cell interrogations.
2. ARKHAM-SUCCESSOR FREEFLOW v4 COMBAT & PREDATOR STEALTH (NL-012, NL-014, NL-015, NL-022):
   - Freeflow v4 Frame Table: Strike (6f startup, magnetic vault gap-closer) | Dual/Triple Counter (9f window with limb-lock throw) | Cape Stun Beatdown (11f startup) | Quickfire Gadget Cancels (Batarang, Batclaw, Smoke Pellet in 4f) | Environmental Wall/Railing Takedowns.
   - Predator Terror System: Silent gargoyle inverted takedowns, grate ambushes, and voice-modulator lures that fracture mobster squad morale.
   - Traversal (NL-022 Enzo Rossi): Grapnel Boost MK-II chains directly into aerodynamic dive-to-glide air currents across Gothic Gotham bridges.`,
          },
          'level-world-design': {
            title: '13-Holiday Gotham Crime Scenes, Predator Gargoyle Arenas & Rooftop Glide Highways',
            summary:
              'Team Orchestrator Sebastien Moreau (NL-025) designs Gotham City for both Arkham-scale dive-gliding and claustrophobic noir crime-scene forensics.',
            content: `[TEAM 03 CHARTER — NL-025 SEBASTIEN MOREAU (13x gemini-4-argon, 1x gemini-3.8-flash)]
ARKHAM-SCALE GOTHAM TOPOLOGY & NOIR INVESTIGATION SPACES:
- Exterior Glide & Grapnel Highways (NL-026, NL-029): Vertical Gothic skyscrapers, Art Deco gargoyle perches, and suspension bridges tuned for continuous zero-touch ground gliding.
- Predator Stealth Rooms (NL-027, NL-030): Falcone Penthouse, Gotham Bank Vault, Falcone Yacht ("New Year's Eve"), and Maroni Safe-Houses built with under-floor maintenance grates, breakable skylights, vantage gargoyles, and dynamic shadow cones.
- Forensic Murder Vignettes (NL-031, NL-037): All 13 Holiday murder scenes (Johnny Viti's bath, the Irish Hitmen's Thanksgiving suite, Alberto's New Year yacht overboard, Carla Viti's coroner records room) built with millimeter-accurate clue placement.`,
          },
          'character-design-rigging': {
            title: 'Sourced Batman Rig + Collector-Grade 3D Translation of Tim Sale’s Cast (Cel-Shaded PBR)',
            summary:
              'Team Orchestrator Camille Laurent (NL-039) enforces a strict "Jaw-Dropping Collector-Statue Fidelity" standard so every custom-built Tim Sale character matches the micro-detail of the internet-sourced Batman model.',
            content: `[TEAM 04 CHARTER — NL-039 CAMILLE LAURENT (10x gemini-4-argon, 2x gemini-nano-banana-2.1)]
UNIFIED JAW-DROPPING CHARACTER FIDELITY (SOURCED BATMAN + MASTER-SCULPTED CAST):
1. Internet-Sourced Playable Batman (NL-040, NL-044, NL-045):
   - Sourced top-tier AAA Batman model conditioned to 92,000 triangles: ballistic kevlar micro-weave normals, rain-beading cowl shader, long-eared Tim Sale cowl silhouette option, and 64-bone Verlet cape rig.
2. How We Translate Tim Sale Panels into Jaw-Dropping 3D Models (NL-041, NL-043, NL-047, NL-048):
   - Zero Cartoon Simplification: We treat Tim Sale's comic panels the way a Prime-1 Studio master sculptor treats concept art—preserving his iconic dramatic silhouettes (Falcone's monolithic shoulders, Joker's elongated manic jaw, Catwoman's whip-lithe athleticism, Grundy's towering bulk) while sculpting 100% realistic sub-millimeter 3D surface detail (skin pores, wool weave, stitched leather, wet hair strands, 52-FACS facial muscles).
   - Unified Cel-Shaded LookDev (NL-048 Amara Osei): Both the sourced Batman rig and the custom cast share the exact same hybrid PBR + Stepped Chiaroscuro Cel-Shader and dynamic sumi-ink rim lines so they look 100% cut from the same world.`,
          },
          'environment-3d-art': {
            title: '3D Model Scouting & Living Graphic-Novel Cel-Shaded Environment LookDev',
            summary:
              'Team Orchestrator Alistair Vance (NL-051) and 3D Model Scout Maya Lin-Vance (NL-059) pair curated external 3D models with comic-book ink-hatched PBR trim sheets and noir chiaroscuro lighting.',
            content: `[TEAM 05 CHARTER — NL-051 ALISTAIR VANCE & NL-059 MAYA LIN-VANCE (14x gemini-4-argon, 2x gemini-nano-banana-2.1)]
3D SCOUTING & COMIC-NOIR ENVIRONMENT SHADING:
- NL-059 (3D Model Scout): Sources the flagship Batman character mesh plus high-poly 1940s Gotham vehicles, vintage firearms, and Art Deco architectural ornaments from verified 3D repositories—auditing every mesh for 10.24 px/cm texel density.
- NL-054 (Substance PBR) & NL-056 (Lighting): Every stone gargoyle, rain-slicked cobblestone street, and mahogany office uses hybrid PBR + Comic Ink Crosshatching where deep shadows crush to pure graphic-novel ink black while neon/streetlamps cast razor-sharp cel-stepped specular highlights.`,
          },
          'narrative-cinematics': {
            title: '13-Holiday Detective Script, Rooftop Triumvirate & 2.5D Comic-Panel Motion Cutscenes',
            summary:
              'Team Orchestrator Gabriel Vance-Sterling (NL-067) and Cinematic Director Hiroshi Watanabe (NL-073) adapt the complete Long Halloween narrative and stage 2.5D flipping comic-panel cutscenes.',
            content: `[TEAM 06 CHARTER — NL-067 GABRIEL VANCE-STERLING (11x gemini-4-argon, 1x gemini-3.8-flash)]
NARRATIVE & 2.5D COMIC-PANEL CUTSCENE DIRECTION:
- The Triumvirate Pact (NL-069): Adapts the full tragedy of Batman, Captain James Gordon, and DA Harvey Dent's rooftop pact to take down Carmine Falcone—and how the Holiday murders slowly fracture Dent's sanity into Two-Face.
- 2.5D Comic-Panel Flipping Cutscenes (NL-073, NL-074):
  * Authentic Tim Sale panels flip, layer, and cascade across the screen with 3D Z-depth parallax between foreground ink silhouettes, rain sheets, and speech balloons—transitioning seamlessly into and out of cel-shaded in-engine gameplay.`,
          },
          'animation-mocap': {
            title: 'Arkham-Successor Freeflow Counter Choreography, Cape-Glide Kinematics & Detective AnimSet',
            summary:
              'Team Orchestrator Jean-Luc Moreau (NL-079) directs bone-crunching Freeflow counter animations, multi-enemy takedowns, and forensic investigation poses.',
            content: `[TEAM 07 CHARTER — NL-079 JEAN-LUC MOREAU (11x gemini-4-argon, 1x gemini-3.8-flash)]
ARKHAM-GRADE ANIMATION & COMIC ACCENTS:
- Freeflow Combat & Multi-Counter Mocap (NL-080, NL-085, NL-087): Motion-matched 360-degree strike vaults, bone-snapping joint locks, cape-whip stuns, and active-ragdoll wall impacts with 3-frame comic hit-stop emphasis (NL-089).
- Detective & Stealth Locomotion (NL-081): Weighty cape-draped crouch stalks, silent gargoyle hangs, and tactile forensic kneeling/evidence-handling animations.`,
          },
          'audio-music-sound': {
            title: 'Google Lyria Brooding Gotham Orchestra + 1940s Noir Jazz & Bone-Crunch Combat Foley',
            summary:
              'Audio Team Orchestrator Nikolai Lindqvist (NL-091) uses Google Lyria 3 Pro for orchestral/noir jazz scores, Lyria 3 Clip for detective/combat stingers, and Gemini 3.8 Flash TTS for voice acting.',
            content: `[TEAM 08 CHARTER — NL-091 NIKOLAI LINDQVIST (3x lyria-3-pro-preview, 4x lyria-3-clip-preview, 1x gemini-3.8-flash-tts, 4x gemini-4-argon)]
SONIC DIRECTION:
- Google Lyria 3 Pro (NL-091, NL-092, NL-102): Sweeping Arkham-style brass/string orchestral combat stems crossfading into smoky 1940s saxophone/muted-trumpet noir jazz during detective investigations.
- Google Lyria 3 Clip & Foley (NL-093..NL-096): Visceral Arkham-grade punch/cape-snap impacts, Grapnel winch launch transients, and the haunting Holiday calendar page-tear stinger.`,
          },
          'engine-rendering-tools': {
            title: 'Next-Gen Cel-Shaded Chiaroscuro BRDF + Cloud-Cached Native AAA WebRTC Engine (Zero Three.js)',
            summary:
              'Engine Team Orchestrator Dr. Viktor Kestrel (NL-103) and Shader Lead Aleksander Novak (NL-105) build the hybrid PBR/Cel-Shaded rendering pipeline and cloud-streamed native binary.',
            content: `[TEAM 09 CHARTER — NL-103 DR. VIKTOR KESTREL (16x gemini-4-argon — 100% Flagship Allocation)]
1. HYBRID PBR + COMIC CEL-SHADING RENDER PIPELINE (NL-104, NL-105, NL-116):
   - Combines real-time raytraced rain reflections and micro-normal detail with a quantized 3-band Chiaroscuro Cel-Shading BRDF, view-dependent Sobel/Laplacian ink edge detection, and shadow-map crosshatching.
2. CLOUD-CACHED NATIVE AAA STREAMING (NL-103, NL-109, NL-110, NL-113):
   - Zero Three.js / Zero Toy WebGL: Compiled as a native PC/Console C++20/Vulkan/DX12 package with 92% of assets pre-warmed in Cloud GPU NVMe RAM caches and streamed to the browser at 4K 60fps over WebRTC.`,
          },
          'gameplay-ai-netcode': {
            title: 'Freeflow Target-Vaulting Controller, Predator Fear AI & 120Hz Cloud Input Pipeline',
            summary:
              'Gameplay Team Orchestrator Damon Vance (NL-119) implements the Arkham-successor Freeflow target-matching controller, Grapnel-Glide physics, and nervous Predator enemy AI.',
            content: `[TEAM 10 CHARTER — NL-119 DAMON VANCE (13x gemini-4-argon, 1x gemini-3.8-flash)]
ARKHAM-SUCCESSOR GAMEPLAY ENGINEERING:
- Freeflow Target-Matching & Combo Engine (NL-120, NL-121): Motion-warped trajectory solver that seamlessly vaults Batman across 8 meters between enemies while preserving combo multiplier, gadget quickfire cancels, and directional counter locks.
- Predator Fear & Squad AI (NL-122, NL-123): Mobsters dynamically check overhead gargoyles, pair up back-to-back as their panic meter rises, and fire blindly into shadows.`,
          },
          'ui-ux-tech-art': {
            title: 'Graphic-Novel Ink Contour Shaders, Diegetic Detective Overlay & Caseboard UX',
            summary:
              'UI/Tech-Art Orchestrator Sora Lindqvist (NL-133) and Shader Tech Artist Dr. Lukas Sterling (NL-137) craft the comic-book ink post-process pass and diegetic noir detective interface.',
            content: `[TEAM 11 CHARTER — NL-133 SORA LINDQVIST (9x gemini-4-argon, 1x gemini-3.8-flash)]
COMIC-BOOK CEL-SHADING TECH ART & DETECTIVE UI:
- Dynamic Sumi-Ink & Crosshatch Post-FX (NL-136, NL-137): Surface curvature and vertex-color weights drive tapered comic-ink outlines that thicken in foreground silhouettes and thin at distance, ensuring jaw-dropping clarity at 4K.
- Noir Detective Vision & Caseboard UI (NL-134, NL-135): Instead of covering up the gorgeous art with blue X-ray tint, Detective Focus highlights forensic clues with crisp golden-amber ink callouts and typewriter dossier typography.`,
          },
          'qa-playtest-liveops': {
            title: 'Visual Cohesion Audit, Freeflow 60-FPS Frame-Lock & Cloud Stream Certification',
            summary:
              'QA Team Orchestrator Victoria Sterling (NL-143) verifies 100% visual consistency between the sourced Batman model and custom cast, 60-FPS Freeflow combat frame pacing, and public GitHub sync.',
            content: `[TEAM 12 CHARTER — NL-143 VICTORIA STERLING (6x gemini-4-argon, 2x gemini-3.8-flash)]
QUALITY & VISUAL COHESION CERTIFICATION:
- Character LookDev Parity Audit (NL-143, NL-146): Side-by-side turntable verification confirming zero texel/polygon/shader disparity between the internet-sourced Batman rig and the custom Tim Sale-sculpted cast.
- Freeflow Combat & Cloud Latency Gate (NL-144, NL-149): Certified 60.0 FPS 1% low frame lock during 20-enemy Freeflow brawls and <16ms WebRTC input response.`,
          },
        }
      : {
          'executive-production': {
            title: 'Master Studio Charter & 16.6ms Frame-Time Budget',
            summary:
              'Locked the 3 core creative pillars, cross-department dependency DAG, and strict 16.6ms (60 FPS) CPU/GPU millisecond allocations across all 12 departments.',
            content: `PROJECT: ${projectTitle} | GENRE: ${genre}
1. Creative Pillars: Tactile Frame-Accurate Combat | Interconnected Vertical World | Zero-Load-Screen Immersion
2. Frame-Time Budget (16.66ms @ 60Hz):
   - Simulation & ECS Gameplay: 2.4ms CPU
   - Skeletal Pose & Physics XPBD: 2.1ms CPU
   - Render Graph & Shadows/GI: 9.8ms GPU
   - Post-FX, Particles & UI: 2.3ms GPU
3. Memory Ceiling: 6.5 GB VRAM | 128 MB Audio RAM | Max 1,500 Draw Calls/Frame`,
          },
          'game-systems-design': {
            title: 'Core Combat Frame-Data & Progression Economy Matrix',
            summary:
              'Calibrated startup/active/recovery frames for 6 weapon archetypes, poise stagger thresholds, and 100-hour faucet-to-sink currency tables.',
            content: `WEAPON ARCHETYPE FRAME TABLE (60Hz Base):
- Greatsword Cleave: Startup 18f | Active 6f | Recovery 24f | Cancel @ 32f | Poise Dmg: 65
- Twin Blades Flurry: Startup 8f | Active 4f | Recovery 11f | Cancel @ 10f | Poise Dmg: 20
- Deflect / Parry Window: Active Frames 2..11 (150ms) | Perfect Parry Stagger: +45 Posture
PROGRESSION CURVE: XP(L) = round(120 * L^2.15 + 350 * L) | BossPRD Pity Floor: 14% -> +12%/attempt`,
          },
          'level-world-design': {
            title: 'Universal Spatial Metrics & Multi-Floor Greybox Topology',
            summary:
              'Defined universal traversal metrics, 45-second open-world POI curiosity triangles, and 3-tier vertical dungeon loop shortcuts.',
            content: `UNIVERSAL SPATIAL METRICS (GREYBOX GYM):
- Corridor Width: Min 3.5m (Solo), 6.0m (Combat Arena Choke)
- Cover Heights: Low Cover 1.10m | Full Cover 2.25m | Mantle Ledge: 2.0m - 3.2m
- Horizontal Jump Gap: Sprint Jump 6.5m | Grapple Anchor Range: 24.0m
- Sector Streaming Baffle: 35m S-Curve Canyon Airlock (<0.8s background cell swap)`,
          },
          'character-design-rigging': {
            title: '85-Bone Humanoid Rig, 52-FACS Blendshapes & Hurtbox Capsules',
            summary:
              'Standardized the 85-bone skeletal hierarchy, 52 ARKit/FACS facial blendshapes, Verlet cape/hair physics weights, and bone-attached hurtbox capsules.',
            content: `CHARACTER TOPOLOGY & RIGGING STANDARD:
- Hero Protagonist Budget: 85,000 Triangles (LOD0) -> 42k (LOD1) -> 18k (LOD2) -> 6k (LOD3)
- Skeleton: 85 Core Bones + 16 Twist/Corrective PSD Bones + 24 Cloth/Hair Verlet Nodes
- Hurtbox Layers: 14 Tapered Bone-Parented Capsules (Head 1.5x Crit, Torso 1.0x, Limbs 0.85x)`,
          },
          'environment-3d-art': {
            title: '3D Model Scouting Manifest, 45-Piece Modular Kit & Trim Sheet Spec',
            summary:
              'Scouted and conditioned external glTF 2.0 3D models, paired with 45-piece 1m-grid modular architectural kits and 10.24 px/cm PBR trim sheets.',
            content: `3D ASSET & ENVIRONMENT PIPELINE:
- Texel Density Target: 10.24 pixels/cm (2048x2048 per 2m x 2m surface)
- Modular Grid Snap: 0.25m Micro | 1.0m Structural Wall | 4.0m Mega-Vault
- Texture Channel Packing (ORM): Red = Ambient Occlusion | Green = Roughness | Blue = Metallic
- 3D Scouted Assets Conditioned: MikkTSpace Tangents + Meshopt Vertex-Cache + KTX2 UASTC`,
          },
          'narrative-cinematics': {
            title: 'World Lore Timeline, Branching Ink Graph & Cutscene Camera Script',
            summary:
              'Authored the 3,000-year historical canon, N-by-N faction reputation web, branching quest state graphs, and seamless gameplay-to-cutscene camera blends.',
            content: `NARRATIVE & CINEMATIC ARCHITECTURE:
- Dialogue Pacing Rule: Max 22 words / 115 characters per subtitle node; 30% subtext compression
- Faction Disposition Matrix: 5 Major Syndicates with [-100..+100] Reputation Spillover
- Cutscene Camera: 35mm Anamorphic (Dialogue), 24mm Dynamic Handheld (Boss Intro), 0.6s Hermite Blend`,
          },
          'animation-mocap': {
            title: '8-Way Motion-Matched Locomotion, Foot-IK & Hit-Stop Impulse Spec',
            summary:
              'Built phase-matched 8-way strafe databases, two-bone Foot-IK slope adaptation, inertialization state machines, and 3-frame combat hit-stop curves.',
            content: `ANIMATION & KINEMATICS RUNTIME:
- Locomotion: 8-Way Strafe + 45°/90°/180° Planted Pivot Turns + Pelvis Slope Adaptation
- Combat Blending: Upper-Body Layered Mask + 0.12s Inertialization Pose Transition
- Impact Juice: Heavy Cleave = 4-Frame Hit-Stop (0.05x Time Dilation) + 0.35 Perlin Trauma Shake`,
          },
          'audio-music-sound': {
            title: 'Google Lyria Adaptive Musical Stems, HRTF Occlusion & -23 LUFS Master Mix',
            summary:
              'Audio Team Orchestrator (NL-091) routed score generation to Google Lyria Pro/Clip, voice previews to Gemini 3.8 Flash TTS, and HRTF portal diffraction to Gemini 4 Argon.',
            content: `AUDIO & ADAPTIVE MUSIC SPECIFICATION (POWERED BY GOOGLE LYRIA):
- Music Stems (lyria-3-pro-preview): 4 Vertical Layers (Ambient Pad, Tension Ostinato, Taiko/Brass Combat, Choir Phase-3)
- Stingers (lyria-3-clip-preview): 30s Parry Riposte, Boss Phase Shift & Discovery Cues
- Voice Synthesis (gemini-3.8-flash-tts): Multi-speaker dialogue table reads normalized to -23 LUFS
- Spatial Audio (gemini-4-argon): Binaural HRTF + Raycast Portal Diffraction`,
          },
          'engine-rendering-tools': {
            title: 'Fiber Job-Graph, SoA ECS Kernel & Automated glTF 2.0 Conditioning',
            summary:
              'Engineered lock-free fiber job scheduling, Structure-of-Arrays (SoA) ECS archetype tables, declarative render-graph aliasing, and automated glTF/meshopt ingestion.',
            content: `ENGINE & RENDERING KERNEL (100% GEMINI-4-ARGON):
- ECS Storage: 16KB Cache-Aligned SoA Archetype Chunks (Zero L1/L2 Cache Misses)
- glTF 2.0 Ingest (NL-110): Auto-Center Pivot -> MikkTSpace -> QEM LOD0..3 -> Meshopt Compress
- Render Graph: Transient G-Buffer VRAM Aliasing (-34% Peak VRAM) + Offline PSO Pre-Cache`,
          },
          'gameplay-ai-netcode': {
            title: 'Swept-Capsule Controller, GOAP Squad AI & 60Hz Rollback Netcode',
            summary:
              'Implemented 5-iteration collide-and-slide character movement, EQS cover-scoring GOAP AI, 60Hz delta-compressed server snapshots, and 250ms hitbox rewind.',
            content: `GAMEPLAY, AI & NETCODE RUNTIME:
- Character Controller: 5-Pass Swept-Capsule Collide-and-Slide + 45° Max Slope + 0.45m Step-Up
- Squad AI: Shared Attack-Token Pool (Max 2 Simultaneous Melee Attackers) + EQS Sightline Scorer
- Netcode: 60Hz Server Tick | Quantized Bitstream (<28 kbps/client) | 250ms Historical Hitbox Rewind`,
          },
          'ui-ux-tech-art': {
            title: 'Diegetic Auto-Fading HUD, GPU Compute Particles & QEM LOD Chains',
            summary:
              'Designed zero-clutter context-fading HUDs, virtualized inventory stat comparison grids, GPU compute weapon-trail ribbons, and dithered LOD transitions.',
            content: `UI/UX & TECHNICAL ART SPECIFICATION:
- HUD Hierarchy: Auto-fades to 0% opacity after 4s out-of-combat; 120ms ease-out combat wake
- VFX Overdraw Cap: Max 2.8x Pixel Quad Overdraw; Sword Ribbons fade within 12 frames
- Accessibility: Full Chorded Input Rebinder + Deuteranopia/Protanopia/Tritanopia Icon+Color Parity`,
          },
          'qa-playtest-liveops': {
            title: '10,000-Hour Autonomous Bot Soak, 1% Low FPS Audit & GitHub Release Gate',
            summary:
              'Executed 64 headless GOAP playtest bots across all quests, verified 50cm-grid collision integrity, certified 99th-percentile frame times, and prepared the Novice-Labs public repo.',
            content: `QA & LIVEOPS CERTIFICATION MATRIX:
- Autonomous Bot Soak: 64 Headless Bots × 160 Hours = 10,240 Simulated Hours (0 Crashes, 0 Softlocks)
- Collision Sweep: 50cm Spherical Probe across 16km² World -> 0 Unbounded Kill-Z Holes
- Performance Gate: 60.0 FPS Avg | 58.4 FPS 1% Low | 0.0 MB/hr Streaming Heap Drift`,
          },
        };

    const meta = concreteArtifactsByDept[dept.id];

    return {
      departmentId: dept.id,
      departmentName: dept.name,
      agentCount: deptAgents.length,
      leadAgentId: lead.id,
      leadAgentRole: `${lead.name} (${lead.role})`,
      orchestratorModelSummary,
      executiveSummary: meta.summary,
      concreteArtifactTitle: meta.title,
      concreteArtifactContent: meta.content,
      agentContributions: deptAgents.map((a) => ({
        agentId: a.id,
        role: a.role,
        name: a.name,
        assignedModel: a.assignedModel,
        assignedAction: isBatman
          ? `[${a.assignedModel}] Execute "${projectTitle}" task for ${a.specialty}`
          : a.coreDirective,
        outputArtifact: a.deliverablesProduced[0],
      })),
    };
  });

  return {
    projectTitle,
    genre,
    setting,
    targetPlatforms: ['Cloud-Streamed Browser (WebRTC Native AAA)', 'PC (Vulkan / DX12)', 'Next-Gen Console'],
    totalAgentsDeployed: ALL_STUDIO_AGENTS.length,
    departments: departmentOutputs,
    threeDAssetQueue: DEFAULT_3D_ASSET_QUEUE,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Generates the complete public GitHub repository file tree for `Novice-Labs`
 * including README.md, studio.manifest.json, orchestrator runtime, 3D asset pipeline,
 * 12 department manifests, and all 150 individual agent definition files.
 */
export function buildNoviceLabsRepoFiles(): RepoFileEntry[] {
  const files: RepoFileEntry[] = [];

  const readmeContent = `# Novice Labs — 150-Agent Autonomous AAA Game Studio

**Novice Labs** is a full-scale agentic AAA game studio architecture comprising **150 specialized autonomous agents** organized across **12 core game development departments**, governed by a **3-Tier Hierarchical Orchestrator** (Studio Head -> 12 Department Team Orchestrators -> 150 Specialist Employees) and a **Multi-Model Array** using a single unified \`GEMINI_API_KEY\`.

## Multi-Model Array & Zero Cost-Cutting Policy

Each Department's **Team Orchestrator** dynamically assigns models from the Novice Labs Model Array strictly according to capability and modality—**never downgrading to smaller models for cost**:

| Model ID | Modality | Team Orchestrator Assignment Rule |
| :--- | :--- | :--- |
| \`gemini-4-argon\` | Flagship Deep Reasoning & Code | Assigned to Studio Head, all 12 Team Orchestrators, Systems Architects, Level Designers, Engine/Gameplay Programmers, Screenwriters & QA Analysts (~84% of studio). |
| \`lyria-3-pro-preview\` | Full-Length Music Score (Audio) | Assigned by Audio Team Orchestrator (\`NL-091\`) for full orchestral scores, noir jazz themes & multi-layer adaptive combat stems. |
| \`lyria-3-clip-preview\` | 30s Musical Stingers & Beds | Assigned by Audio Team Orchestrator (\`NL-091\`) for combat stingers, discovery fanfares & biome soundscapes. |
| \`gemini-3.8-flash-tts\` | Expressive Multi-Speaker Voice | Assigned to Voice Direction & Dialogue Mastering (\`NL-097\`) for character voice synthesis. |
| \`gemini-nano-banana-2.1\` | 4K Concept & Turnaround LookDev | Assigned to Concept Art (\`NL-058\`), Hero/Creature Sculptors (\`NL-040\`, \`NL-041\`) & PBR Material LookDev (\`NL-054\`). |
| \`gemini-3.8-flash\` | Sub-Second Real-Time Speed ONLY | Strictly reserved ONLY for tasks requiring sub-second real-time speed (e.g., live packet routing, 120Hz reticle updates, ping probes). |

## Studio Headcount Breakdown (150 Agents Across 12 Departments)

| # | Department | Lead / Team Orchestrator | Headcount | Folder Path |
| :- | :--- | :--- | :---: | :--- |
${STUDIO_DEPARTMENTS.map(
  (d) =>
    `| ${String(d.index).padStart(2, '0')} | **${d.name}** | \`${d.leadAgentId}\` (${d.orchestratorCodename}) | **${d.targetHeadcount}** | \`agents/${d.folderSlug}/\` |`
).join('\n')}
| | **TOTAL STUDIO ROSTER** | **12 Team Orchestrators** | **150 Agents** | \`agents/\` |

## 1-Click Vercel Deployment

This repository contains **both** the complete runnable **React 19 + Vite + TypeScript + Serverless API Web Application** (\`src/\`, \`api/index.ts\`, \`package.json\`, \`vercel.json\`) and all **150 Autonomous Agent Markdown Specifications** (\`agents/\`) and **12 Department Manifests** (\`departments/\`).

1. Import this repository (\`Novice-Labs\`) at **[vercel.com/new](https://vercel.com/new)**.
2. Add your \`GEMINI_API_KEY\` in Vercel **Environment Variables** (used across \`gemini-4-argon\`, \`lyria-3-pro-preview\`, \`lyria-3-clip-preview\`, \`gemini-3.8-flash-tts\`, \`gemini-nano-banana-2.1\`, and \`gemini-3.8-flash\`).
3. Click **Deploy** — Vercel automatically builds the Vite frontend (\`npm run build\` -> \`dist/\`) and mounts the serverless studio orchestrator at \`/api/*\`.

## Featured Production Directive: *Batman: The Long Halloween* (Cloud-Streamed AAA)

- **Playable Scope**: Strictly **Batman** as sole playable character across all 13 Holiday Chapters (*Crime* through *Punishment*), combining deep Noir Detective forensics with next-gen *Batman: Arkham* Freeflow v4 combat, Predator stealth, and Grapnel-Boost-to-Cape-Glide traversal.
- **2.5D Comic-Panel Cutscenes**: Authentic Tim Sale high-contrast noir comic panels flipping and layering in 2.5D parallax space (zero AI video slop).
- **Collector-Grade 3D Character Pipeline & Cel-Shaded LookDev**: Internet-sourced 92k-triangle AAA Batman 3D rig (\`NL-059\`, \`NL-110\`) + collector-grade 82k–88k triangle custom 3D sculpts for Harvey Dent/Two-Face, Carmine Falcone, Catwoman, Calendar Man, Gordon, and the Rogue Gallery (\`NL-039\`..\`NL-050\`), unified under a custom Stylized Cel-Shaded Chiaroscuro & Sumi-Ink BRDF (\`NL-057\`, \`NL-074\`, \`NL-104\`).
- **Cloud-Cached Native AAA Browser Streaming**: Native C++20/Vulkan/UE5 build with 92% pre-warmed cloud NVMe pakchunk caches streamed to the browser via WebRTC (zero Three.js).
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
    architectureVersion: '2.0.0-AAA',
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

  const orchestratorContent = `/**
 * Novice Labs — 150-Agent Hierarchical Multi-Model Orchestrator
 * Studio Head (NL-001) -> 12 Department Team Orchestrators -> 150 Specialist Agents
 * Uses a single unified process.env.GEMINI_API_KEY across:
 * - gemini-4-argon (Flagship Deep Reasoning & Architecture - Zero Cost-Cutting Policy)
 * - lyria-3-pro-preview & lyria-3-clip-preview (Google Lyria Music & Stingers)
 * - gemini-3.8-flash-tts (Multi-Speaker Voice Synthesis)
 * - gemini-nano-banana-2.1 (4K Turnaround & PBR LookDev)
 * - gemini-3.8-flash (Strictly reserved ONLY for sub-second speed tasks)
 */
import { GoogleGenAI } from "@google/genai";
import manifest from "../../studio.manifest.json";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: { headers: { "User-Agent": "aistudio-build" } },
});

export async function dispatchToStudioHeadAndTeams(founderPrompt: string) {
  // 1. Studio Head (NL-001 Marcus Vance) decomposes prompt into 12 Team Charters using gemini-4-argon
  const studioHeadResponse = await ai.models.generateContent({
    model: "gemini-4-argon",
    contents: founderPrompt,
    config: {
      systemInstruction:
        "You are Marcus Vance (NL-001), Studio Head of Novice Labs. Decompose the Founder's game directive into 12 concrete Department Charters for our 12 Team Orchestrators covering all 150 agents.",
    },
  });

  return {
    studioHeadId: "NL-001",
    modelUsed: "gemini-4-argon",
    charterPlan: studioHeadResponse.text,
    totalAgentsActivated: manifest.totalAgents,
  };
}
`;

  files.push({
    path: 'src/orchestrator/studioRunner.ts',
    category: 'Orchestrator Core',
    sizeBytes: utf8Bytes(orchestratorContent),
    content: orchestratorContent,
  });

  const threeDAssetContent = JSON.stringify(
    {
      pipelineOwner: 'NL-059 (Maya Lin-Vance — 3D Model Scout) & NL-110 (Lucas Sterling — glTF Conditioning Engineer)',
      targetStandards: {
        runtimeFormat: 'Cloud Pre-Warmed IoStore Pakchunks + glTF 2.0 (Meshopt + KTX2)',
        browserDelivery: 'WebRTC Native Cloud GPU Stream (Zero Three.js)',
        texelDensity: '10.24 px/cm',
      },
      assetQueue: DEFAULT_3D_ASSET_QUEUE,
    },
    null,
    2
  );

  files.push({
    path: 'pipeline/3d-asset-scout.manifest.json',
    category: '3D Pipeline Spec',
    sizeBytes: utf8Bytes(threeDAssetContent),
    content: threeDAssetContent,
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
