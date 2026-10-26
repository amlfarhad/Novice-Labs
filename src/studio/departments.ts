import { DepartmentSpec, StudioModelSpec } from './types';

export const STUDIO_MODEL_ARRAY: StudioModelSpec[] = [
  {
    id: 'gemini-4-argon',
    displayName: 'Gemini 4 Argon (gemini-4-argon)',
    modality: 'Deep Reasoning & Code',
    orchestratorPolicy:
      'Primary flagship model across Novice Labs. Assigned to all Team Orchestrators, Directors, Systems Architects, Level Designers, Engine/Gameplay Programmers, Screenwriters, and QA Analysts requiring deep multi-step reasoning.',
    costPolicyNote:
      'ZERO COST-CUTTING POLICY: Never downgraded to Flash for budget reasons. Used wherever cognitive depth, architectural rigor, or creative synthesis is required.',
  },
  {
    id: 'lyria-3-pro-preview',
    displayName: 'Google Lyria 3 Pro (lyria-3-pro-preview)',
    modality: 'Full-Track Music (Audio)',
    orchestratorPolicy:
      'Assigned by the Audio Team Orchestrator (NL-091) to composers and adaptive music designers for full-length orchestral scores, boss themes, and multi-layered musical stems.',
    costPolicyNote: 'Dedicated full-track music generation model via the same GEMINI_API_KEY.',
  },
  {
    id: 'lyria-3-clip-preview',
    displayName: 'Google Lyria 3 Clip (lyria-3-clip-preview)',
    modality: 'Short Music/Stinger (Audio)',
    orchestratorPolicy:
      'Assigned by the Audio Team Orchestrator (NL-091) for 30-second combat stingers, discovery fanfares, ambient biome loops, and rhythmic percussive cues.',
    costPolicyNote: 'Dedicated short-clip acoustic & music model via the same GEMINI_API_KEY.',
  },
  {
    id: 'gemini-3.8-flash-tts',
    displayName: 'Gemini 3.8 Flash TTS (gemini-3.8-flash-tts)',
    modality: 'Voice & Dialogue TTS',
    orchestratorPolicy:
      'Assigned to Voice Direction, Dialogue Mastering, and Combat Bark table-read synthesis requiring custom voice personas, vocal bursts, and dual-speaker performance.',
    costPolicyNote: 'Specialized flagship voice synthesis model.',
  },
  {
    id: 'gemini-nano-banana-2.1',
    displayName: 'Gemini Nano Banana 2.1 (gemini-nano-banana-2.1)',
    modality: 'Visual Concept & PBR Image',
    orchestratorPolicy:
      'Assigned to Concept Art, Hero Silhouette Turnarounds, PBR Material LookDev, and Color Grading LUT reference generation.',
    costPolicyNote: 'High-resolution (1K/2K/4K) visual asset model.',
  },
  {
    id: 'gemini-3.8-flash',
    displayName: 'Gemini 3.8 Flash (gemini-3.8-flash)',
    modality: 'Sub-Second Real-Time Speed',
    orchestratorPolicy:
      'STRICTLY RESTRICTED: Assigned ONLY when the operational task requires sub-second real-time execution speed (e.g., live packet routing, real-time bark trigger checks, low-latency ping probes). Never assigned for cost savings.',
    costPolicyNote: 'Speed-only allocation; prohibited as a cost-saving substitute for gemini-4-argon.',
  },
];

export const STUDIO_DEPARTMENTS: DepartmentSpec[] = [
  {
    id: 'executive-production',
    index: 1,
    name: 'Executive Direction & Studio Production',
    shortName: 'Executive & Production',
    folderSlug: '01-executive-production',
    targetHeadcount: 10,
    leadAgentId: 'NL-001',
    orchestratorCodename: 'ORCH-EXEC-01',
    defaultDepartmentModel: 'gemini-4-argon',
    allowedModelArray: ['gemini-4-argon', 'gemini-3.8-flash'],
    orchestratorRoutingRule:
      'Assigns gemini-4-argon to all 9 Directors and Milestone Managers for maximum strategic and architectural depth; assigns gemini-3.8-flash strictly to NL-010 (Sprint Coordinator) for sub-second real-time packet handoff routing.',
    productionStage: 'Pre-Production',
    mandate:
      'Governs creative vision, milestone gates, cross-department dependency resolution, risk registers, and technical architecture standards across all 150 agents.',
    keyOutputs: [
      'Creative Pillars & Vision Charter',
      'Master 12-Department Dependency Graph',
      'Milestone Gate Acceptance Criteria',
      'Technical & Memory Budget Allocations',
    ],
  },
  {
    id: 'game-systems-design',
    index: 2,
    name: 'Game Systems & Mechanics Design',
    shortName: 'Systems Design',
    folderSlug: '02-game-systems-design',
    targetHeadcount: 14,
    leadAgentId: 'NL-011',
    orchestratorCodename: 'ORCH-SYS-02',
    defaultDepartmentModel: 'gemini-4-argon',
    allowedModelArray: ['gemini-4-argon', 'gemini-3.8-flash'],
    orchestratorRoutingRule:
      'Assigns gemini-4-argon to all 13 Systems, Combat, Economy, AI, and Boss Architects for deep mathematical modeling; assigns gemini-3.8-flash only to NL-015 (3C Input Feel) when polling sub-millisecond input buffer telemetry.',
    productionStage: 'Pre-Production',
    mandate:
      'Architects the 30-second combat loop, player progression curves, economy sinks/faucets, enemy AI behavioral matrices, camera feel, and systemic gameplay rules.',
    keyOutputs: [
      'Core Combat & Frame-Timing Specification',
      'Progression & Economy Monte Carlo Tables',
      'Enemy Archetype & AI Utility Matrices',
      'Skill Tree & Crafting Recipe Schemas',
    ],
  },
  {
    id: 'level-world-design',
    index: 3,
    name: 'Level Design & World Building',
    shortName: 'Level Design',
    folderSlug: '03-level-world-design',
    targetHeadcount: 14,
    leadAgentId: 'NL-025',
    orchestratorCodename: 'ORCH-LVL-03',
    defaultDepartmentModel: 'gemini-4-argon',
    allowedModelArray: ['gemini-4-argon', 'gemini-3.8-flash'],
    orchestratorRoutingRule:
      'Assigns gemini-4-argon across spatial blockout, dungeon topology, puzzle logic, and sightline architects; uses gemini-3.8-flash only on NL-028 for rapid wave-trigger state evaluation.',
    productionStage: 'Vertical Slice',
    mandate:
      'Constructs greybox spatial layouts, combat arena geometry, sightlines, traversal flow, stealth routes, environmental puzzles, and open-world sector streaming boundaries.',
    keyOutputs: [
      'Greybox Spatial Metrics & Traversal Rules',
      'Encounter Spawn & Pacing Curve Graphs',
      'Sightline, Landmark & Cover Topologies',
      'Open-World Sector Streaming Boundaries',
    ],
  },
  {
    id: 'character-design-rigging',
    index: 4,
    name: 'Character Design, Sculpting & Rigging',
    shortName: 'Character Art',
    folderSlug: '04-character-design-rigging',
    targetHeadcount: 12,
    leadAgentId: 'NL-039',
    orchestratorCodename: 'ORCH-CHAR-04',
    defaultDepartmentModel: 'gemini-4-argon',
    allowedModelArray: ['gemini-4-argon', 'gemini-nano-banana-2.1'],
    orchestratorRoutingRule:
      'Assigns gemini-4-argon to skeletal rigging, FACS blendshapes, cloth physics, and hitbox calibration; pairs gemini-nano-banana-2.1 with Hero/Boss Concept Sculptors (NL-040, NL-041) for 4K turnaround lookdev.',
    productionStage: 'Vertical Slice',
    mandate:
      'Designs hero protagonists, boss silhouettes, modular NPCs, facial FACS blendshapes, skeletal deformation rigs, cloth/hair physics chains, and hitbox capsules.',
    keyOutputs: [
      'Hero & Boss Silhouette Turnarounds',
      'Skeletal Joint Hierarchy & IK Rig Specs',
      'FACS 52-Blendshape Facial Topology',
      'Modular Armor Socket & Cloth Physics Maps',
    ],
  },
  {
    id: 'environment-3d-art',
    index: 5,
    name: 'Environment, Concept & 3D Asset Pipeline',
    shortName: 'Environment & 3D Art',
    folderSlug: '05-environment-3d-art',
    targetHeadcount: 16,
    leadAgentId: 'NL-051',
    orchestratorCodename: 'ORCH-ENV3D-05',
    defaultDepartmentModel: 'gemini-4-argon',
    allowedModelArray: ['gemini-4-argon', 'gemini-nano-banana-2.1'],
    orchestratorRoutingRule:
      'Assigns gemini-4-argon to 3D Model Scout (NL-059), Modular Kitbashing, Trim Sheets, Voronoi Destruction, and Terrain Erosion; assigns gemini-nano-banana-2.1 to Concept Art (NL-058) and PBR Substance LookDev (NL-054).',
    productionStage: 'Full Production',
    mandate:
      'Produces architectural modular kits, organic biomes, PBR substance materials, lighting moodboards, and executes 3D model scouting, photogrammetry conditioning, and glTF standardization.',
    keyOutputs: [
      '3D Model Scouting & glTF Asset Manifests',
      'Modular Architectural KitGrid Specifications',
      'PBR Albedo/Roughness/Metallic Calibration',
      'Volumetric Lighting & Color Grading LUTs',
    ],
  },
  {
    id: 'narrative-cinematics',
    index: 6,
    name: 'Narrative, World Lore & Cinematics',
    shortName: 'Narrative & Lore',
    folderSlug: '06-narrative-cinematics',
    targetHeadcount: 12,
    leadAgentId: 'NL-067',
    orchestratorCodename: 'ORCH-NARR-06',
    defaultDepartmentModel: 'gemini-4-argon',
    allowedModelArray: ['gemini-4-argon', 'gemini-3.8-flash-tts', 'gemini-3.8-flash'],
    orchestratorRoutingRule:
      'Assigns gemini-4-argon to all World Lore, Main Campaign, Side Quest, Codex, and Faction writers for maximum literary depth; assigns gemini-3.8-flash only to NL-071 (Combat Barks) for rapid reactive bark firing.',
    productionStage: 'Full Production',
    mandate:
      'Writes world mythology, faction politics, branching quest graphs, combat barks, environmental storytelling vignettes, and directs real-time cutscene camera staging.',
    keyOutputs: [
      'World Lore Bible & Historical Timeline',
      'Branching Dialogue Node Graphs (JSON/Ink)',
      'Contextual Combat & Companion Bark Tables',
      'Real-Time Cutscene Camera & Shot Lists',
    ],
  },
  {
    id: 'animation-mocap',
    index: 7,
    name: 'Animation, Motion Capture & Kinematics',
    shortName: 'Animation & Mocap',
    folderSlug: '07-animation-mocap',
    targetHeadcount: 12,
    leadAgentId: 'NL-079',
    orchestratorCodename: 'ORCH-ANIM-07',
    defaultDepartmentModel: 'gemini-4-argon',
    allowedModelArray: ['gemini-4-argon', 'gemini-3.8-flash'],
    orchestratorRoutingRule:
      'Assigns gemini-4-argon to Locomotion IK, Combat Frame-Data, Quadruped Gaits, State Machine Engineers, and Mocap Cleanup; assigns gemini-3.8-flash only to NL-089 for real-time hit-stop impulse previewing.',
    productionStage: 'Full Production',
    mandate:
      'Crafts responsive locomotion blend-trees, melee attack frame-data (startup/active/recovery), motion-warping vaults, quadruped creature gaits, and active-ragdoll transitions.',
    keyOutputs: [
      'Locomotion 8-Way Strafe & Blend-Tree Specs',
      'Combat Frame-Data & Cancel Window Tables',
      'Foot-IK & Procedural Slope Adaptation Rules',
      'Mocap Cleanup & Facial Lip-Sync Curves',
    ],
  },
  {
    id: 'audio-music-sound',
    index: 8,
    name: 'Audio, Adaptive Music & Sound Design',
    shortName: 'Audio & Music',
    folderSlug: '08-audio-music-sound',
    targetHeadcount: 12,
    leadAgentId: 'NL-091',
    orchestratorCodename: 'ORCH-AUDIO-08',
    defaultDepartmentModel: 'lyria-3-pro-preview',
    allowedModelArray: ['lyria-3-pro-preview', 'lyria-3-clip-preview', 'gemini-3.8-flash-tts', 'gemini-4-argon'],
    orchestratorRoutingRule:
      'Routes music composition & dynamic orchestration (NL-091, NL-092, NL-102) to Google Lyria Pro (lyria-3-pro-preview), short stingers/soundscapes (NL-093, NL-094, NL-095, NL-096) to Google Lyria Clip (lyria-3-clip-preview), Voice Direction (NL-097) to gemini-3.8-flash-tts, and spatial/DSP engineering (NL-098..NL-101) to gemini-4-argon.',
    productionStage: 'Full Production',
    mandate:
      'Composes adaptive horizontal/vertical musical stems, synthesizes weapon and creature foley, models 3D acoustic occlusion/reverb zones, and mixes LUFS-compliant master buses.',
    keyOutputs: [
      'Adaptive Music Stem & State Transition Matrix',
      'Surface-Dependent Foley & Weapon Impulse Specs',
      'HRTF 3D Spatialization & Occlusion Profiles',
      'Master Bus Dynamic Mixing & LUFS Targets',
    ],
  },
  {
    id: 'engine-rendering-tools',
    index: 9,
    name: 'Core Engine, Rendering & Pipeline Tools',
    shortName: 'Engine & Rendering',
    folderSlug: '09-engine-rendering-tools',
    targetHeadcount: 16,
    leadAgentId: 'NL-103',
    orchestratorCodename: 'ORCH-ENG-09',
    defaultDepartmentModel: 'gemini-4-argon',
    allowedModelArray: ['gemini-4-argon'],
    orchestratorRoutingRule:
      '100% gemini-4-argon allocation across all 16 Engine, Rendering, Raytracing, Physics Solver, glTF Conditioning, and SIMD Optimization engineers. Zero Flash substitution permitted on low-level systems code.',
    productionStage: 'Full Production',
    mandate:
      'Builds ECS runtime architecture, deferred/forward+ render graphs, global illumination, physics collision solvers, glTF/OBJ geometry importers, and automated CI/CD build farms.',
    keyOutputs: [
      'ECS Archetype Memory Layout & Job Scheduler',
      'Render Graph Pass & GPU Frame-Time Budget',
      'Automated glTF/FBX Mesh Conditioning Pipeline',
      'Deterministic Physics & BVH Spatial Index',
    ],
  },
  {
    id: 'gameplay-ai-netcode',
    index: 10,
    name: 'Gameplay, AI Systems & Network Engineering',
    shortName: 'Gameplay & Netcode',
    folderSlug: '10-gameplay-ai-netcode',
    targetHeadcount: 14,
    leadAgentId: 'NL-119',
    orchestratorCodename: 'ORCH-GAME-10',
    defaultDepartmentModel: 'gemini-4-argon',
    allowedModelArray: ['gemini-4-argon', 'gemini-3.8-flash'],
    orchestratorRoutingRule:
      'Assigns gemini-4-argon to 13 Gameplay, GOAP AI, NavMesh, Server Netcode, and Serialization engineers; assigns gemini-3.8-flash strictly to NL-125 for sub-16ms client-side prediction tick delta verification.',
    productionStage: 'Full Production',
    mandate:
      'Implements character movement controllers, ability execution machines, GOAP/behavior-tree AI agents, navmesh crowd steering, rollback/snapshot netcode, and save serialization.',
    keyOutputs: [
      'Character Controller & Swept-Capsule Kinematics',
      'GOAP & Behavior-Tree Tactical AI Evaluators',
      'Server-Authoritative Snapshot & Lag Compensation',
      'Versioned Save-State Serialization Schema',
    ],
  },
  {
    id: 'ui-ux-tech-art',
    index: 11,
    name: 'UI/UX Architecture, HUD & Technical Art',
    shortName: 'UI/UX & Tech Art',
    folderSlug: '11-ui-ux-tech-art',
    targetHeadcount: 10,
    leadAgentId: 'NL-133',
    orchestratorCodename: 'ORCH-UIUX-11',
    defaultDepartmentModel: 'gemini-4-argon',
    allowedModelArray: ['gemini-4-argon', 'gemini-3.8-flash'],
    orchestratorRoutingRule:
      'Assigns gemini-4-argon to UI Architecture, Shader Graphs, GPU Particles, and Mesh LOD Decimation pipelines; assigns gemini-3.8-flash only to NL-134 for 120Hz diegetic reticle state updates.',
    productionStage: 'Polish & LiveOps',
    mandate:
      'Designs diegetic HUDs, low-latency inventory grids, accessibility remapping, GPU particle VFX shaders, automated LOD mesh decimation chains, and draw-call profilers.',
    keyOutputs: [
      'Diegetic HUD & Reticle State Machine',
      'GPU Compute Particle & Post-Process Shaders',
      'Automated Mesh LOD0-LOD3 Decimation Rules',
      'WCAG Accessibility & Input Remapping Spec',
    ],
  },
  {
    id: 'qa-playtest-liveops',
    index: 12,
    name: 'Quality Assurance, Telemetry & LiveOps',
    shortName: 'QA & LiveOps',
    folderSlug: '12-qa-playtest-liveops',
    targetHeadcount: 8,
    leadAgentId: 'NL-143',
    orchestratorCodename: 'ORCH-QA-12',
    defaultDepartmentModel: 'gemini-4-argon',
    allowedModelArray: ['gemini-4-argon', 'gemini-3.8-flash'],
    orchestratorRoutingRule:
      'Assigns gemini-4-argon to Test Matrix Architecture, Collision Exploit Analysis, Memory Stress Profiling, and TTK Balance Audits; assigns gemini-3.8-flash to NL-149 and NL-150 for real-time network ping probing and live alert routing.',
    productionStage: 'Polish & LiveOps',
    mandate:
      'Executes automated bot soak tests, navmesh/collision out-of-bounds sweeps, 1% low frame-time profiling, combat TTK balance audits, network jitter testing, and zero-downtime patch rollouts.',
    keyOutputs: [
      'Automated Headless Bot Soak & Crash Matrix',
      'Collision Seam & Out-of-Bounds Audit Log',
      'Combat TTK & Economy Telemetry Heatmaps',
      'LiveOps Hotfix & Rollback Deployment Manifest',
    ],
  },
];
