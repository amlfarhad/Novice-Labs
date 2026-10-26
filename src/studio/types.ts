export type DepartmentId =
  | 'executive-production'
  | 'game-systems-design'
  | 'level-world-design'
  | 'character-design-rigging'
  | 'environment-3d-art'
  | 'narrative-cinematics'
  | 'animation-mocap'
  | 'audio-music-sound'
  | 'engine-rendering-tools'
  | 'gameplay-ai-netcode'
  | 'ui-ux-tech-art'
  | 'qa-playtest-liveops';

export type SeniorityTier = 'Director / Lead' | 'Principal / Senior' | 'Specialist';

export type StudioModelId =
  | 'gemini-4-argon'
  | 'lyria-3-pro-preview'
  | 'lyria-3-clip-preview'
  | 'gemini-3.8-flash-tts'
  | 'gemini-nano-banana-2.1'
  | 'gemini-3.8-flash';

export interface StudioModelSpec {
  id: StudioModelId;
  displayName: string;
  modality:
    | 'Deep Reasoning & Code'
    | 'Full-Track Music (Audio)'
    | 'Short Music/Stinger (Audio)'
    | 'Voice & Dialogue TTS'
    | 'Visual Concept & PBR Image'
    | 'Sub-Second Real-Time Speed';
  orchestratorPolicy: string;
  costPolicyNote: string;
}

export interface AgentSeed {
  id: string; // NL-001 .. NL-150
  codeName: string;
  name: string;
  role: string;
  departmentId: DepartmentId;
  tier: SeniorityTier;
  specialty: string;
  identityMandate: string;
  coreDirective: string;
  inputsConsumed: string[];
  deliverablesProduced: string[];
  collaboratesWith: string[]; // Agent IDs
  toolchain: string[];
  assignedModel?: StudioModelId;
  modelSelectionReason?: string;
}

export interface AgentSpec extends AgentSeed {
  index: number; // 1 .. 150
  departmentName: string;
  teamOrchestratorId: string;
  teamOrchestratorName: string;
  isTeamOrchestrator: boolean;
  assignedModel: StudioModelId;
  fallbackModels: StudioModelId[];
  modelSelectionReason: string;
  systemPrompt: string;
  repoFilePath: string;
  activeSprintTask: string;
  utilizationRate: number;
}

export interface DepartmentSpec {
  id: DepartmentId;
  index: number;
  name: string;
  shortName: string;
  folderSlug: string;
  targetHeadcount: number;
  leadAgentId: string;
  orchestratorCodename: string;
  defaultDepartmentModel: StudioModelId;
  allowedModelArray: StudioModelId[];
  orchestratorRoutingRule: string;
  productionStage: 'Pre-Production' | 'Vertical Slice' | 'Full Production' | 'Polish & LiveOps';
  mandate: string;
  keyOutputs: string[];
}

export interface ThreeDAssetBrief {
  assetId: string;
  assetName: string;
  category:
    | 'Hero Character'
    | 'Modular Environment'
    | 'Hard-Surface Weapon/Vehicle'
    | 'Hero Prop & Foliage';
  assignedScoutAgentId: string;
  assignedTechArtistId: string;
  targetTriangleBudget: number;
  lodLevels: number;
  textureMaps: string[];
  formatSpec: string;
  searchKeywords: string[];
  pipelineStatus: 'Spec Locked' | 'Topology Verified' | 'Shader Ready';
}

export type ThreeDAssetSpec = ThreeDAssetBrief;
export type ThreeDAssetPipelineEntry = ThreeDAssetBrief;

export interface DepartmentSprintOutput {
  departmentId: DepartmentId;
  departmentName: string;
  agentCount: number;
  leadAgentId: string;
  leadAgentRole: string;
  orchestratorModelSummary: string;
  executiveSummary: string;
  concreteArtifactTitle: string;
  concreteArtifactContent: string;
  agentContributions: Array<{
    agentId: string;
    role: string;
    name: string;
    assignedModel: StudioModelId;
    assignedAction: string;
    outputArtifact: string;
  }>;
}

export type DepartmentOutput = DepartmentSprintOutput;

export interface GeneratedChapterScene {
  chapterNumber: number;
  holidayName: string;
  chapterTitle: string;
  comicPdfStartPage: number;
  comicPdfEndPage: number;
  locationName: string;
  gameplayMode: 'Freeflow Combat' | 'Noir Detective Forensics' | 'Predator Stealth' | '2.5D Comic Cutscene' | 'Cape Glide & Grapnel Traversal';
  objectiveSummary: string;
  cutsceneScript: string;
  forensicClues: string[];
  enemiesPresent: string[];
  vfsChunkId: string;
  rtxFrameDataUrl?: string;
  authoredByAgents: string[];
}

export interface StudioSprintReport {
  projectTitle: string;
  genre: string;
  setting: string;
  targetPlatforms: string[];
  totalAgentsDeployed: number;
  departments: DepartmentSprintOutput[];
  threeDAssetQueue: ThreeDAssetBrief[];
  generatedAt: string;
}

export interface RepoFileEntry {
  path: string;
  category:
    | 'Root Config'
    | 'Orchestrator'
    | 'Orchestrator Core'
    | 'Department Manifest'
    | 'Agent Specification'
    | '3D Pipeline Spec';
  departmentId?: DepartmentId;
  agentId?: string;
  sizeBytes: number;
  content: string;
}
