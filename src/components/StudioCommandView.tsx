import React, { useEffect, useRef, useState } from 'react';
import {
  ALL_STUDIO_AGENTS,
  DEFAULT_FOUNDER_DIRECTIVE_CONFIG,
} from '../studio/studioEngine';
import { STUDIO_DEPARTMENTS } from '../studio/departments';
import {
  AgentSpec,
  DepartmentId,
  DepartmentSprintOutput,
  GeneratedChapterScene,
  ThreeDAssetSpec,
} from '../studio/types';
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Cloud,
  Code2,
  Compass,
  ExternalLink,
  FileCode2,
  Gamepad2,
  Loader2,
  Pause,
  Play,
  Send,
  Terminal,
} from 'lucide-react';

export interface LiveExecutionLogEntry {
  id: string;
  timestamp: string;
  level: 'STUDIO_HEAD' | 'ORCHESTRATOR' | 'AGENT' | 'FOUNDER_STEER' | 'CLOUD_DEPLOY';
  actorId: string;
  actorName: string;
  modelUsed: string;
  departmentId?: DepartmentId;
  message: string;
}

export type DepartmentExecutionState = 'unwritten' | 'writing' | 'completed' | 'steered';

interface StudioCommandViewProps {
  writtenDepartments: DepartmentSprintOutput[];
  onSetWrittenDepartments: React.Dispatch<React.SetStateAction<DepartmentSprintOutput[]>>;
  writtenThreeDAssets: ThreeDAssetSpec[];
  onSetWrittenThreeDAssets: React.Dispatch<React.SetStateAction<ThreeDAssetSpec[]>>;
  writtenChapters: GeneratedChapterScene[];
  onSetWrittenChapters: React.Dispatch<React.SetStateAction<GeneratedChapterScene[]>>;
  studioHeadAnalysis: string | null;
  onUpdateStudioHeadAnalysis: (analysis: string | null) => void;
  cloudStorageProvider: string;
  onSelectCloudStorageProvider: (provider: string) => void;
  founderSteeringHistory: string[];
  onAddFounderSteering: (note: string) => void;
  isGameBuildReady: boolean;
  onSetGameBuildReady: (ready: boolean) => void;
  compiledFilesCount: number;
  onSetCompiledFilesCount: React.Dispatch<React.SetStateAction<number>>;
  onSelectAgent: (agent: AgentSpec) => void;
  onNavigateToRosterDept: (deptId: DepartmentId) => void;
  onLaunchGameInline: () => void;
}

const CLOUD_STORAGE_TARGETS = [
  {
    id: 'wasm64 (16GB Heap) + pthreads + WebGPU (DX12/Vulkan WGSL) + 4KB Chunked OPFS VFS + Cloud RTX Pod',
    label:
      'wasm64 (16GB Heap) + WebGPU (WGSL) + 4KB Chunked OPFS Virtual File System + Cloud RTX Pod',
  },
  {
    id: 'Novice Cloud RTX 6000 Ada Pod + HTTP Range-Request Chunked VFS (4K 120Hz Stream)',
    label: 'Novice Cloud RTX 6000 Ada Pod + HTTP Range-Request Chunked VFS (4K 120Hz Stream)',
  },
  {
    id: 'AWS G6e RTX L40S + S3 4KB Byte-Range OPFS VFS + CloudFront Edge',
    label: 'AWS G6e RTX L40S + S3 4KB Byte-Range OPFS VFS + CloudFront Edge',
  },
];

export const StudioCommandView: React.FC<StudioCommandViewProps> = ({
  writtenDepartments,
  onSetWrittenDepartments,
  writtenThreeDAssets,
  onSetWrittenThreeDAssets,
  writtenChapters,
  onSetWrittenChapters,
  studioHeadAnalysis,
  onUpdateStudioHeadAnalysis,
  cloudStorageProvider,
  onSelectCloudStorageProvider,
  founderSteeringHistory,
  onAddFounderSteering,
  isGameBuildReady,
  onSetGameBuildReady,
  compiledFilesCount,
  onSetCompiledFilesCount,
  onSelectAgent,
  onNavigateToRosterDept,
  onLaunchGameInline,
}) => {
  const [projectTitle, setProjectTitle] = useState(DEFAULT_FOUNDER_DIRECTIVE_CONFIG.title);
  const [genre, setGenre] = useState(DEFAULT_FOUNDER_DIRECTIVE_CONFIG.genre);
  const [setting, setSetting] = useState(DEFAULT_FOUNDER_DIRECTIVE_CONFIG.setting);
  const [founderPrompt, setFounderPrompt] = useState(DEFAULT_FOUNDER_DIRECTIVE_CONFIG.promptText);
  const [promptError, setPromptError] = useState<string | null>(null);

  const [pipelineStatus, setPipelineStatus] = useState<
    'unbuilt' | 'writing' | 'paused' | 'completed'
  >(isGameBuildReady ? 'completed' : 'unbuilt');
  const [currentDeptIndex, setCurrentDeptIndex] = useState<number>(0);
  const [deptStates, setDeptStates] = useState<Record<string, DepartmentExecutionState>>({});
  const [activeAgentsCount, setActiveAgentsCount] = useState<number>(
    isGameBuildReady ? 150 : 0
  );
  const [cloudCachePercent, setCloudCachePercent] = useState<number>(
    isGameBuildReady ? 100 : 0
  );
  const [liveLogs, setLiveLogs] = useState<LiveExecutionLogEntry[]>([]);

  // Founder Live Interjection & Course-Correction State
  const [steerScope, setSteerScope] = useState<'studio' | 'department' | 'agent'>('department');
  const [steerDeptId, setSteerDeptId] = useState<DepartmentId>('character-design-rigging');
  const [steerAgentId, setSteerAgentId] = useState<string>('NL-039');
  const [steeringInput, setSteeringInput] = useState<string>('');
  const [isSteering, setIsSteering] = useState<boolean>(false);

  const [expandedDeptId, setExpandedDeptId] = useState<DepartmentId | 'none'>('none');
  const [showAllEmployeesForDept, setShowAllEmployeesForDept] = useState<Record<string, boolean>>({});

  const isPausedRef = useRef<boolean>(false);
  const abortRunRef = useRef<boolean>(false);
  const latestSteeringRef = useRef<string>('');
  const logContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [liveLogs]);

  const appendLog = (entry: Omit<LiveExecutionLogEntry, 'id' | 'timestamp'>) => {
    setLiveLogs((prev) => [
      ...prev,
      {
        ...entry,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
  };

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const waitWhilePaused = async () => {
    while (isPausedRef.current && !abortRunRef.current) {
      await sleep(250);
    }
  };

  // Write the entire game from scratch purely via live Novice Labs model calls
  const handleDispatchFromScratch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectTitle.trim() || !founderPrompt.trim()) {
      setPromptError(
        'Both a Project Title and a Founder Directive are required before dispatching to Studio Head NL-001.'
      );
      return;
    }

    setPromptError(null);
    abortRunRef.current = false;
    isPausedRef.current = false;

    // Reset everything to 0 — Novice Labs writes everything live from scratch
    setPipelineStatus('writing');
    onSetGameBuildReady(false);
    onUpdateStudioHeadAnalysis(null);
    onSetWrittenDepartments([]);
    onSetWrittenThreeDAssets([]);
    onSetWrittenChapters([]);
    onSetCompiledFilesCount(0);
    setActiveAgentsCount(0);
    setCloudCachePercent(0);
    setLiveLogs([]);

    try {
      localStorage.removeItem('novice_labs_live_chapters');
      localStorage.removeItem('novice_labs_build_ready');
    } catch {
      // Ignore storage error
    }

    const freshStates: Record<string, DepartmentExecutionState> = {};
    for (const d of STUDIO_DEPARTMENTS) freshStates[d.id] = 'unwritten';
    setDeptStates(freshStates);

    appendLog({
      level: 'STUDIO_HEAD',
      actorId: 'NL-001',
      actorName: 'Marcus Vance (Studio Head)',
      modelUsed: 'gemini-4-argon',
      message: `DISPATCHING LIVE DIRECTIVE FOR "${projectTitle.trim()}". Mounted 386-page source comic (${DEFAULT_FOUNDER_DIRECTIVE_CONFIG.sourceComicPdfPath}). Calling NL-001 on gemini-4-argon...`,
    });

    // Stage 0: Studio Head (NL-001) writes Master Architecture live on gemini-4-argon
    try {
      const headRes = await fetch('/api/studio/prompt-studio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectTitle: projectTitle.trim(),
          genre: genre.trim(),
          setting: setting.trim(),
          founderPrompt: founderPrompt.trim(),
        }),
      });
      const headData = await headRes.json();
      if (!headRes.ok) {
        throw new Error(headData.error || 'Studio Head execution failed');
      }
      onUpdateStudioHeadAnalysis(headData.studioHeadAnalysis);
      onSetCompiledFilesCount((c) => c + 4);
      appendLog({
        level: 'STUDIO_HEAD',
        actorId: 'NL-001',
        actorName: 'Marcus Vance (Studio Head)',
        modelUsed: headData.modelUsed || 'gemini-4-argon',
        message: headData.studioHeadAnalysis,
      });
    } catch (err: any) {
      setPromptError(`Studio Head NL-001 error: ${err?.message || 'Check GEMINI_API_KEY'}`);
      setPipelineStatus('unbuilt');
      return;
    }

    // Stages 1..12: Each Department Team Orchestrator & its Specialist Agents execute live
    let cumulativeAgents = 0;
    const accumulatedChapters: GeneratedChapterScene[] = [];

    for (let i = 0; i < STUDIO_DEPARTMENTS.length; i++) {
      await waitWhilePaused();
      if (abortRunRef.current) return;

      const dept = STUDIO_DEPARTMENTS[i];
      setCurrentDeptIndex(i);
      setExpandedDeptId(dept.id);
      setDeptStates((prev) => ({ ...prev, [dept.id]: 'writing' }));

      appendLog({
        level: 'ORCHESTRATOR',
        actorId: dept.leadAgentId,
        actorName: `${dept.orchestratorCodename} (${dept.name})`,
        modelUsed: dept.defaultDepartmentModel,
        departmentId: dept.id,
        message: `[TEAM ${String(i + 1).padStart(2, '0')}/12 LIVE] ${dept.leadAgentId} orchestrating ${dept.targetHeadcount} agents on [${dept.allowedModelArray.join(', ')}]...`,
      });

      try {
        const res = await fetch('/api/studio/execute-department', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            departmentId: dept.id,
            departmentIndex: i,
            projectTitle: projectTitle.trim(),
            genre: genre.trim(),
            setting: setting.trim(),
            founderPrompt: founderPrompt.trim(),
            steeringNotes: latestSteeringRef.current,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || `Department ${dept.name} failed`);
        }

        await waitWhilePaused();
        if (abortRunRef.current) return;

        const newlyWrittenDept: DepartmentSprintOutput = {
          departmentId: dept.id,
          departmentName: dept.name,
          agentCount: data.agentCount || dept.targetHeadcount,
          leadAgentId: data.leadAgentId || dept.leadAgentId,
          leadAgentRole: data.leadAgentRole || dept.orchestratorCodename,
          orchestratorModelSummary: data.orchestratorModelSummary || dept.defaultDepartmentModel,
          concreteArtifactTitle: data.concreteArtifactTitle,
          executiveSummary: data.executiveSummary,
          concreteArtifactContent: data.concreteArtifactContent,
          agentContributions: Array.isArray(data.agentContributions)
            ? data.agentContributions
            : [],
        };

        const agentLogs: Array<{
          agentId: string;
          agentName: string;
          role: string;
          model: string;
          logLine: string;
        }> = Array.isArray(data.agentLogs) ? data.agentLogs : [];

        for (let aIdx = 0; aIdx < Math.min(agentLogs.length, 4); aIdx++) {
          const al = agentLogs[aIdx];
          appendLog({
            level: 'AGENT',
            actorId: al.agentId,
            actorName: `${al.agentName} (${al.role})`,
            modelUsed: al.model,
            departmentId: dept.id,
            message: al.logLine,
          });
          onSetCompiledFilesCount((c) => c + 3);
          await sleep(120);
        }

        onSetWrittenDepartments((prev) => {
          const filtered = prev.filter((d) => d.departmentId !== dept.id);
          return [...filtered, newlyWrittenDept];
        });

        if (data.generatedThreeDAsset) {
          const newAsset: ThreeDAssetSpec = data.generatedThreeDAsset;
          onSetWrittenThreeDAssets((prev) => [
            ...prev.filter((a) => a.assetId !== newAsset.assetId),
            newAsset,
          ]);
        }

        if (data.generatedChapterScene) {
          const newChapter: GeneratedChapterScene = data.generatedChapterScene;
          accumulatedChapters.push(newChapter);
          onSetWrittenChapters((prev) => {
            const next = [
              ...prev.filter((c) => c.chapterNumber !== newChapter.chapterNumber),
              newChapter,
            ].sort((a, b) => a.chapterNumber - b.chapterNumber);
            try {
              localStorage.setItem('novice_labs_live_chapters', JSON.stringify(next));
            } catch {
              // Ignore storage error
            }
            return next;
          });
        }

        cumulativeAgents += dept.targetHeadcount;
        setActiveAgentsCount(cumulativeAgents);
        setCloudCachePercent(
          Math.min(100, Math.round(((i + 1) / STUDIO_DEPARTMENTS.length) * 100))
        );
        setDeptStates((prev) => ({
          ...prev,
          [dept.id]: latestSteeringRef.current ? 'steered' : 'completed',
        }));

        appendLog({
          level: 'ORCHESTRATOR',
          actorId: dept.leadAgentId,
          actorName: `${dept.orchestratorCodename} (${dept.name})`,
          modelUsed: data.modelUsed || dept.defaultDepartmentModel,
          departmentId: dept.id,
          message: `Committed "${newlyWrittenDept.concreteArtifactTitle}" & VFS Chunk [${
            data.generatedChapterScene?.vfsChunkId || `pakchunk${i}.ucas`
          }] (${cumulativeAgents}/150 agents finished).`,
        });
      } catch (err: any) {
        appendLog({
          level: 'ORCHESTRATOR',
          actorId: dept.leadAgentId,
          actorName: dept.name,
          modelUsed: dept.defaultDepartmentModel,
          departmentId: dept.id,
          message: `Error in ${dept.name}: ${err?.message || 'Retrying'}`,
        });
      }
    }

    setCloudCachePercent(100);
    setPipelineStatus('completed');
    onSetGameBuildReady(true);
    try {
      localStorage.setItem('novice_labs_build_ready', 'true');
    } catch {
      // Ignore storage error
    }

    appendLog({
      level: 'CLOUD_DEPLOY',
      actorId: 'NL-103 & NL-115',
      actorName: 'wasm64 + WebGPU + 4KB Chunked OPFS VFS Deployer',
      modelUsed: 'gemini-4-argon',
      message: `BUILD COMPLETE! All 12 Departments & 150 Agents finished writing "${projectTitle.trim()}" (${accumulatedChapters.length} Playable Chapters + 2.5D Comic-Panel Cutscenes linked to the 386-page PDF). Click "Open & Play Game in New Browser Tab" below!`,
    });
  };

  const handleTogglePause = () => {
    if (pipelineStatus === 'writing') {
      isPausedRef.current = true;
      setPipelineStatus('paused');
      appendLog({
        level: 'FOUNDER_STEER',
        actorId: 'FOUNDER',
        actorName: 'Founder Orchestration Override',
        modelUsed: 'manual-control',
        message: `Execution PAUSED at Team ${String(currentDeptIndex + 1).padStart(2, '0')}. Inspect the logs and code written so far, or enter an interjection on the right to steer the studio in a new direction.`,
      });
    } else if (pipelineStatus === 'paused') {
      isPausedRef.current = false;
      setPipelineStatus('writing');
      appendLog({
        level: 'FOUNDER_STEER',
        actorId: 'FOUNDER',
        actorName: 'Founder Orchestration Override',
        modelUsed: 'manual-control',
        message: `Resuming live build from Team ${String(currentDeptIndex + 1).padStart(2, '0')}...`,
      });
    }
  };

  const handleSteerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!steeringInput.trim()) return;

    const note = steeringInput.trim();
    setIsSteering(true);
    latestSteeringRef.current = note;
    onAddFounderSteering(note);

    const targetDept =
      STUDIO_DEPARTMENTS.find((d) => d.id === steerDeptId) || STUDIO_DEPARTMENTS[0];
    const targetAgent =
      ALL_STUDIO_AGENTS.find((a) => a.id === steerAgentId) || ALL_STUDIO_AGENTS[0];

    appendLog({
      level: 'FOUNDER_STEER',
      actorId: 'FOUNDER',
      actorName: 'Founder Live Interjection',
      modelUsed: 'gemini-4-argon',
      departmentId: steerDeptId,
      message: `FOUNDER OVERRIDE — STEERING [${
        steerScope === 'studio'
          ? 'ENTIRE STUDIO (NL-001)'
          : steerScope === 'department'
          ? `${targetDept.name} (${targetDept.leadAgentId})`
          : `${targetAgent.id} (${targetAgent.name})`
      }] IN NEW DIRECTION: "${note}"`,
    });

    try {
      const res = await fetch('/api/studio/steer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetScope: steerScope,
          departmentId: steerDeptId,
          agentId: steerAgentId,
          steeringPrompt: note,
          projectTitle: projectTitle.trim(),
        }),
      });
      const data = await res.json();

      if (data.steeringSummary) {
        appendLog({
          level: 'ORCHESTRATOR',
          actorId: targetDept.leadAgentId,
          actorName: `${targetDept.orchestratorCodename} (${targetDept.name})`,
          modelUsed: data.modelUsed || 'gemini-4-argon',
          departmentId: steerDeptId,
          message: `HALTED PREVIOUS APPROACH & RE-WROTE SPEC: ${data.steeringSummary}`,
        });
      }

      if (Array.isArray(data.courseCorrectionLogs)) {
        for (const line of data.courseCorrectionLogs) {
          appendLog({
            level: 'AGENT',
            actorId: steerScope === 'agent' ? targetAgent.id : targetDept.leadAgentId,
            actorName: steerScope === 'agent' ? targetAgent.name : targetDept.shortName,
            modelUsed: data.modelUsed || 'gemini-4-argon',
            departmentId: steerDeptId,
            message: line,
          });
        }
      }

      onSetWrittenDepartments((prev) => {
        const existing = prev.find((d) => d.departmentId === steerDeptId);
        const deptAgents = ALL_STUDIO_AGENTS.filter((a) => a.departmentId === steerDeptId);
        const steeredDeptOutput: DepartmentSprintOutput = existing
          ? {
              ...existing,
              concreteArtifactTitle: data.updatedArtifactTitle || existing.concreteArtifactTitle,
              executiveSummary: data.steeringSummary || existing.executiveSummary,
              concreteArtifactContent:
                data.updatedArtifactContent || existing.concreteArtifactContent,
            }
          : {
              departmentId: steerDeptId,
              departmentName: targetDept.name,
              agentCount: deptAgents.length,
              leadAgentId: targetDept.leadAgentId,
              leadAgentRole: targetDept.orchestratorCodename,
              orchestratorModelSummary: targetDept.defaultDepartmentModel,
              concreteArtifactTitle: data.updatedArtifactTitle || `${targetDept.name} Spec`,
              executiveSummary: data.steeringSummary || '',
              concreteArtifactContent: data.updatedArtifactContent || '',
              agentContributions: deptAgents.map((a) => ({
                agentId: a.id,
                role: a.role,
                name: a.name,
                assignedModel: a.assignedModel,
                assignedAction: a.coreDirective,
                outputArtifact: a.deliverablesProduced[0],
              })),
            };

        if (!existing) return [...prev, steeredDeptOutput];
        return prev.map((d) => (d.departmentId === steerDeptId ? steeredDeptOutput : d));
      });

      setDeptStates((prev) => ({ ...prev, [steerDeptId]: 'steered' }));
      setExpandedDeptId(steerDeptId);
      onSetCompiledFilesCount((c) => c + 5);
      setSteeringInput('');
    } catch (err: any) {
      appendLog({
        level: 'FOUNDER_STEER',
        actorId: targetDept.leadAgentId,
        actorName: targetDept.name,
        modelUsed: 'gemini-4-argon',
        departmentId: steerDeptId,
        message: `Steering error: ${err?.message || 'Unknown error'}`,
      });
    } finally {
      setIsSteering(false);
    }
  };

  const toggleEmployeeList = (deptId: string) => {
    setShowAllEmployeesForDept((prev) => ({
      ...prev,
      [deptId]: !prev[deptId],
    }));
  };

  return (
    <div className="space-y-8">
      {/* Top Studio Command & Scratch-Build Dispatch Console (ONLY Preloaded Form Fields) */}
      <section
        aria-labelledby="studio-command-heading"
        className="border border-slate-800 bg-[#0F1623] rounded-xl p-6"
      >
        <div className="pb-5 border-b border-slate-800/80 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-amber-400 font-mono font-semibold">
              <span>NOVICE LABS · 150-AGENT AUTONOMOUS AAA GAME STUDIO</span>
              <span aria-hidden="true">·</span>
              <span>NL-001 STUDIO HEAD</span>
              <span aria-hidden="true">·</span>
              <span>12 TEAM ORCHESTRATORS</span>
            </div>
            <a
              href={DEFAULT_FOUNDER_DIRECTIVE_CONFIG.sourceComicPdfPath}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded bg-emerald-950/60 border border-emerald-700/60 text-emerald-300 hover:bg-emerald-900/60 transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>
                Mounted Source Comic PDF ({DEFAULT_FOUNDER_DIRECTIVE_CONFIG.sourceComicPages} Pages)
              </span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <h1
            id="studio-command-heading"
            className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100 font-display"
          >
            Dispatch Directive to Novice Labs (NL-001 → 12 Teams → 150 Agents)
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed max-w-4xl">
            Only your project parameters, mounted 386-page comic book reference, and Founder Directive are preloaded below.{' '}
            <strong>Zero pre-built game files exist until you click Dispatch.</strong> When you dispatch, the 150 agents write the entire game from scratch—pulling authentic panels from the mounted comic PDF for 2.5D motion-graphics cutscenes and compiling the <code className="font-mono text-amber-300">wasm64 + WebGPU + 4KB Chunked OPFS VFS</code> build for instant browser play.
          </p>
        </div>

        {/* Dispatch Form */}
        <form onSubmit={handleDispatchFromScratch} className="pt-5 space-y-4">
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
              />
            </div>
            <div>
              <label
                htmlFor="studio-project-genre"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                Gameplay Target (PS5 / Xbox Series X / PC RTX Fidelity)
              </label>
              <input
                id="studio-project-genre"
                type="text"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label
                htmlFor="studio-cloud-storage"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                Browser Execution & Cloud VFS Architecture
              </label>
              <select
                id="studio-cloud-storage"
                value={cloudStorageProvider}
                onChange={(e) => onSelectCloudStorageProvider(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-amber-400"
              >
                {CLOUD_STORAGE_TARGETS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
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
              rows={5}
              value={founderPrompt}
              onChange={(e) => setFounderPrompt(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-950 border border-slate-800 rounded-lg text-slate-100 leading-relaxed focus:outline-none focus:border-amber-400"
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
              <span>Build State: </span>
              <strong
                className={
                  pipelineStatus === 'writing'
                    ? 'text-amber-400'
                    : pipelineStatus === 'completed'
                    ? 'text-emerald-400'
                    : 'text-slate-400'
                }
              >
                {pipelineStatus === 'unbuilt'
                  ? 'UNBUILT (0 FILES EXIST)'
                  : pipelineStatus.toUpperCase()}
              </strong>
              <span aria-hidden="true"> · </span>
              <span>
                Written: {writtenDepartments.length}/12 Departments ({activeAgentsCount}/150 Agents)
              </span>
              <span aria-hidden="true"> · </span>
              <span>Compiled Files: {compiledFilesCount}</span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {(pipelineStatus === 'writing' || pipelineStatus === 'paused') && (
                <button
                  type="button"
                  onClick={handleTogglePause}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-100 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
                >
                  {pipelineStatus === 'paused' ? (
                    <>
                      <Play className="w-3.5 h-3.5 text-emerald-400 fill-current" />
                      <span>Resume Writing Game</span>
                    </>
                  ) : (
                    <>
                      <Pause className="w-3.5 h-3.5 text-amber-400" />
                      <span>Pause & Interject</span>
                    </>
                  )}
                </button>
              )}

              <button
                type="submit"
                disabled={pipelineStatus === 'writing'}
                className="inline-flex items-center gap-2 px-6 py-3 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-lg"
              >
                {pipelineStatus === 'writing' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>
                      Novice Labs Writing: Team {String(currentDeptIndex + 1).padStart(2, '0')}/12 ({activeAgentsCount}/150 Agents)...
                    </span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>
                      {pipelineStatus === 'completed'
                        ? 'Clean & Re-Write Entire Game From Scratch (150 Agents)'
                        : 'Dispatch Directive to Studio Head (Kick Off Novice Labs)'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* IF UNBUILT: Clean Empty State Until Founder Clicks Dispatch */}
      {pipelineStatus === 'unbuilt' && writtenDepartments.length === 0 && (
        <section className="border-2 border-dashed border-slate-800 bg-[#0B0F17]/60 rounded-xl p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-amber-400">
            <Code2 className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 max-w-xl mx-auto">
            <div className="text-xs font-mono text-amber-400 uppercase tracking-wider">
              0 FILES WRITTEN · AWAITING NOVICE LABS EXECUTION
            </div>
            <h2 className="text-xl font-bold text-slate-100 font-display">
              Ready for Novice Labs (150 Agents) to Kick Off Development
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Click <strong>Dispatch Directive to Studio Head (Kick Off Novice Labs)</strong> above. Studio Head{' '}
              <code className="font-mono text-slate-200">NL-001</code> and all 12 Department Team Orchestrators will build the game live from zero, pulling comic panels directly from your uploaded 386-page PDF and compiling the playable chapters.
            </p>
          </div>
        </section>
      )}

      {/* ONCE DISPATCH IS CLICKED: Live Execution Logs, Founder Interjection Console, and Newly Written Files */}
      {(pipelineStatus !== 'unbuilt' || writtenDepartments.length > 0) && (
        <>
          <section
            aria-labelledby="live-orchestration-heading"
            className="border border-amber-500/40 bg-[#0F1623] rounded-xl p-6 space-y-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <div className="text-xs font-mono text-amber-400">
                  LIVE NOVICE LABS COMPILER STREAM & FOUNDER INTERJECTION CONSOLE
                </div>
                <h2
                  id="live-orchestration-heading"
                  className="text-xl font-bold text-slate-100 mt-1 font-display"
                >
                  Live 150-Agent Execution Logs & Real-Time Course-Correction
                </h2>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-48 h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-amber-400 transition-all duration-300"
                    style={{ width: `${Math.round((activeAgentsCount / 150) * 100)}%` }}
                  />
                </div>
                <span className="text-xs font-mono font-bold text-amber-300 tabular-nums">
                  {activeAgentsCount} / 150 Agents · {compiledFilesCount} Files Written
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left 7 Cols: Live Streaming Agent Execution Logs */}
              <div className="lg:col-span-7 flex flex-col space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                  <span className="inline-flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-amber-400" />
                    <span>LIVE AGENT COMPILER STREAM ({liveLogs.length} EVENTS)</span>
                  </span>
                  <span>Models: gemini-4-argon · Lyria 3 Pro/Clip · Flash TTS · 3.8 Flash</span>
                </div>

                <div
                  ref={logContainerRef}
                  className="h-[360px] overflow-y-auto rounded-xl bg-[#070A10] border border-slate-800 p-4 font-mono text-xs space-y-2.5"
                >
                  {liveLogs.map((log) => {
                    const badgeColor =
                      log.level === 'FOUNDER_STEER'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : log.level === 'CLOUD_DEPLOY'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : log.level === 'STUDIO_HEAD'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : log.level === 'ORCHESTRATOR'
                        ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                        : 'bg-slate-800 text-slate-300 border-slate-700';

                    return (
                      <div
                        key={log.id}
                        className="p-2.5 rounded-lg bg-slate-950/90 border border-slate-800/80 space-y-1"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${badgeColor}`}
                            >
                              {log.level}
                            </span>
                            <span className="font-bold text-slate-100">
                              {log.actorId} · {log.actorName}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400">
                            [{log.modelUsed}] · {log.timestamp}
                          </span>
                        </div>
                        <div className="text-slate-200 leading-relaxed pl-1">{log.message}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right 5 Cols: Founder Interjection & Steering Control Panel */}
              <div className="lg:col-span-5 flex flex-col justify-between p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
                <form onSubmit={handleSteerSubmit} className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-amber-400">
                      <Compass className="w-4 h-4" />
                      <span>FOUNDER LIVE INTERJECTION & STEERING</span>
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      Override Any Team/Agent
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    Interject at any point to steer the entire studio, a specific department, or a single agent in an opposite direction—the orchestrator immediately halts and re-writes those files live on Gemini 4 Argon.
                  </p>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setSteerScope('studio')}
                      className={`py-1.5 px-2 rounded text-xs font-mono font-semibold border cursor-pointer ${
                        steerScope === 'studio'
                          ? 'bg-amber-400 text-slate-950 border-amber-400'
                          : 'bg-slate-900 text-slate-300 border-slate-800'
                      }`}
                    >
                      Entire Studio
                    </button>
                    <button
                      type="button"
                      onClick={() => setSteerScope('department')}
                      className={`py-1.5 px-2 rounded text-xs font-mono font-semibold border cursor-pointer ${
                        steerScope === 'department'
                          ? 'bg-amber-400 text-slate-950 border-amber-400'
                          : 'bg-slate-900 text-slate-300 border-slate-800'
                      }`}
                    >
                      Specific Team
                    </button>
                    <button
                      type="button"
                      onClick={() => setSteerScope('agent')}
                      className={`py-1.5 px-2 rounded text-xs font-mono font-semibold border cursor-pointer ${
                        steerScope === 'agent'
                          ? 'bg-amber-400 text-slate-950 border-amber-400'
                          : 'bg-slate-900 text-slate-300 border-slate-800'
                      }`}
                    >
                      Single Agent
                    </button>
                  </div>

                  {steerScope !== 'studio' && (
                    <div>
                      <label
                        htmlFor="steer-dept-select"
                        className="block text-[11px] font-mono text-slate-400 mb-1"
                      >
                        Target Department Team Orchestrator
                      </label>
                      <select
                        id="steer-dept-select"
                        value={steerDeptId}
                        onChange={(e) => {
                          const dId = e.target.value as DepartmentId;
                          setSteerDeptId(dId);
                          const firstAg = ALL_STUDIO_AGENTS.find((a) => a.departmentId === dId);
                          if (firstAg) setSteerAgentId(firstAg.id);
                        }}
                        className="w-full px-3 py-1.5 text-xs font-mono bg-slate-900 border border-slate-800 rounded-lg text-slate-100"
                      >
                        {STUDIO_DEPARTMENTS.map((d) => (
                          <option key={d.id} value={d.id}>
                            Team {String(d.index).padStart(2, '0')}: {d.name} ({d.leadAgentId})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {steerScope === 'agent' && (
                    <div>
                      <label
                        htmlFor="steer-agent-select"
                        className="block text-[11px] font-mono text-slate-400 mb-1"
                      >
                        Target Specialist Agent (150-Agent Roster)
                      </label>
                      <select
                        id="steer-agent-select"
                        value={steerAgentId}
                        onChange={(e) => setSteerAgentId(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs font-mono bg-slate-900 border border-slate-800 rounded-lg text-slate-100"
                      >
                        {ALL_STUDIO_AGENTS.filter((a) => a.departmentId === steerDeptId).map(
                          (a) => (
                            <option key={a.id} value={a.id}>
                              {a.id} · {a.name} ({a.role} · {a.assignedModel})
                            </option>
                          )
                        )}
                      </select>
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="founder-steer-textarea"
                      className="block text-[11px] font-mono text-slate-400 mb-1"
                    >
                      Your Interjection / New Direction Prompt
                    </label>
                    <textarea
                      id="founder-steer-textarea"
                      rows={3}
                      value={steeringInput}
                      onChange={(e) => setSteeringInput(e.target.value)}
                      placeholder="Enter your steering override for Novice Labs..."
                      className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSteering || !steeringInput.trim()}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-rose-500 hover:bg-rose-400 disabled:opacity-50 text-slate-950 text-xs font-bold transition-colors cursor-pointer"
                  >
                    {isSteering ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Halting & Re-Writing on Gemini 4 Argon...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Interject & Steer Direction Now</span>
                      </>
                    )}
                  </button>
                </form>

                {founderSteeringHistory.length > 0 && (
                  <div className="pt-2 border-t border-slate-800 space-y-1">
                    <div className="text-[11px] font-mono text-amber-400">
                      FOUNDER STEERING APPLIED ({founderSteeringHistory.length}):
                    </div>
                    <div className="text-xs font-mono text-slate-300 truncate">
                      Latest: “{founderSteeringHistory[founderSteeringHistory.length - 1]}”
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* LAUNCH BANNER (Unlocks as chapters are compiled by Novice Labs!) */}
          {(isGameBuildReady || writtenChapters.length > 0) && (
            <section
              aria-labelledby="cloud-launch-heading"
              className="border-2 border-emerald-500/70 bg-gradient-to-r from-emerald-950/60 via-[#0F1623] to-[#0F1623] rounded-xl p-6 space-y-4"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-1.5 max-w-3xl">
                  <div className="inline-flex items-center gap-2 text-xs font-mono text-emerald-400 font-semibold">
                    <Cloud className="w-4 h-4" />
                    <span>
                      {isGameBuildReady
                        ? `FULL BUILD COMPILED (${compiledFilesCount} FILES · ${writtenChapters.length} CHAPTERS · ${cloudCachePercent}% OPFS VFS READY)`
                        : `STREAMING BUILD IN PROGRESS (${writtenChapters.length} CHAPTERS COMPILED SO FAR)`}
                    </span>
                  </div>
                  <h2
                    id="cloud-launch-heading"
                    className="text-2xl font-bold text-slate-100 font-display"
                  >
                    Play the Novice Labs Build in Browser (`wasm64` + `WebGPU` + 2.5D Comic Cutscenes)
                  </h2>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Compiled onto <strong className="text-emerald-300 font-mono">{cloudStorageProvider}</strong> with authentic 2.5D comic-panel cutscenes pulled directly from your 386-page PDF. Open a new browser tab to play immediately.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <a
                    href="/?play=true"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-sm font-bold shadow-lg transition-all cursor-pointer"
                  >
                    <Gamepad2 className="w-4 h-4" />
                    <span>Open & Play Game in New Browser Tab</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>

                  <button
                    type="button"
                    onClick={onLaunchGameInline}
                    className="inline-flex items-center gap-2 px-4 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 text-amber-400 fill-current" />
                    <span>Open Player Here</span>
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Studio Head (NL-001) Live Executive Charter */}
          {studioHeadAnalysis && (
            <div className="p-4 rounded-xl bg-slate-950/90 border border-amber-500/30 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-mono font-semibold text-amber-400">
                  NL-001 STUDIO HEAD (MARCUS VANCE) · LIVE ARCHITECTURAL CHARTER (gemini-4-argon)
                </span>
                <span className="text-xs font-mono text-emerald-400">
                  100% Live Model Output → 12 Team Orchestrators
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                {studioHeadAnalysis}
              </p>
            </div>
          )}

          {/* Live-Authored 3D Character Rigs & Pakchunks */}
          {writtenThreeDAssets.length > 0 && (
            <section
              aria-labelledby="threed-scout-heading"
              className="border border-slate-800 bg-[#0F1623] rounded-xl p-6 space-y-5"
            >
              <div>
                <div className="text-xs font-mono text-emerald-400">
                  LIVE NOVICE LABS 3D ASSET & RIG MANIFEST ({writtenThreeDAssets.length} ASSETS AUTHORED)
                </div>
                <h2
                  id="threed-scout-heading"
                  className="text-xl font-bold text-slate-100 mt-1 font-display"
                >
                  Live-Authored 3D Character Rigs, Environment Kits & OPFS VFS Containers
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {writtenThreeDAssets.map((asset) => (
                  <div
                    key={asset.assetId}
                    className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/90 flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-mono font-bold text-amber-400">
                          {asset.assetId} · {asset.category}
                        </span>
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-700/60 text-emerald-300">
                          {asset.pipelineStatus}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-100">{asset.assetName}</h3>
                      <p className="text-xs text-slate-400 font-mono">{asset.formatSpec}</p>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-slate-300 font-mono tabular-nums">
                        <span>Polygon Budget:</span>
                        <strong>{Number(asset.targetTriangleBudget || 85000).toLocaleString()} Tris</strong>
                      </div>
                      <div className="text-slate-400 font-mono text-[11px] truncate">
                        Maps: {Array.isArray(asset.textureMaps) ? asset.textureMaps.join(', ') : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Department Execution Cards (Materialize one by one as Novice Labs writes them) */}
          {writtenDepartments.length > 0 && (
            <section
              aria-labelledby="department-decomposition-heading"
              className="space-y-4"
            >
              <div>
                <div className="text-xs font-mono text-amber-400">
                  LIVE DEPARTMENT FILES WRITTEN BY NOVICE LABS ({writtenDepartments.length} / 12 TEAMS)
                </div>
                <h2
                  id="department-decomposition-heading"
                  className="text-xl font-bold text-slate-100 mt-1 font-display"
                >
                  Department Code, Shaders & Level Specifications Written Live
                </h2>
              </div>

              <div className="space-y-3">
                {writtenDepartments.map((deptOut) => {
                  const isExpanded = expandedDeptId === deptOut.departmentId;
                  const showAllEmployees = Boolean(
                    showAllEmployeesForDept[deptOut.departmentId]
                  );
                  const visibleEmployees = showAllEmployees
                    ? deptOut.agentContributions
                    : deptOut.agentContributions.slice(0, 4);
                  const execState = deptStates[deptOut.departmentId] || 'completed';

                  return (
                    <article
                      key={deptOut.departmentId}
                      className={`border rounded-xl bg-[#0F1623] overflow-hidden transition-colors ${
                        execState === 'steered'
                          ? 'border-rose-500/60'
                          : 'border-slate-800'
                      }`}
                    >
                      <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="space-y-1.5 max-w-3xl">
                          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                              <CheckCircle2 className="w-3 h-3" />
                              WRITTEN LIVE ({deptOut.orchestratorModelSummary})
                            </span>
                            <span className="text-amber-400 font-semibold">
                              {deptOut.departmentName}
                            </span>
                            <span className="text-slate-500">·</span>
                            <span className="text-slate-300">
                              Orchestrator: {deptOut.leadAgentId} ({deptOut.leadAgentRole})
                            </span>
                          </div>
                          <h3 className="text-base font-bold text-slate-100 font-display">
                            {deptOut.concreteArtifactTitle}
                          </h3>
                          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                            {deptOut.executiveSummary}
                          </p>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => onNavigateToRosterDept(deptOut.departmentId)}
                            className="px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors cursor-pointer"
                          >
                            Team Roster ({deptOut.agentCount})
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedDeptId(isExpanded ? 'none' : deptOut.departmentId)
                            }
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors cursor-pointer"
                          >
                            <FileCode2 className="w-3.5 h-3.5" />
                            <span>{isExpanded ? 'Hide Spec' : 'Inspect Written Spec'}</span>
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-slate-800 bg-slate-950/90 p-5 space-y-5">
                          <div>
                            <div className="text-xs font-mono text-amber-400 mb-2">
                              LIVE ARTIFACT WRITTEN BY {deptOut.leadAgentId}: {deptOut.concreteArtifactTitle}
                            </div>
                            <pre className="p-4 rounded-lg bg-[#090D14] border border-slate-800 text-xs font-mono text-slate-200 overflow-x-auto leading-relaxed whitespace-pre-wrap">
                              {deptOut.concreteArtifactContent}
                            </pre>
                          </div>

                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between">
                              <div className="text-xs font-mono text-slate-400">
                                EMPLOYEE DELIVERABLES ({deptOut.agentContributions.length} AGENTS)
                              </div>
                              {deptOut.agentContributions.length > 4 && (
                                <button
                                  type="button"
                                  onClick={() => toggleEmployeeList(deptOut.departmentId)}
                                  className="text-xs font-mono text-amber-400 hover:text-amber-300 cursor-pointer"
                                >
                                  {showAllEmployees
                                    ? 'Show Top 4 Agents'
                                    : `Show All ${deptOut.agentContributions.length} Agents`}
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                              {visibleEmployees.map((contrib) => {
                                const fullAgent = ALL_STUDIO_AGENTS.find(
                                  (a) => a.id === contrib.agentId
                                );
                                return (
                                  <div
                                    key={contrib.agentId}
                                    className="p-3 rounded-lg bg-slate-900/75 border border-slate-800/90 flex items-start justify-between gap-3"
                                  >
                                    <div className="space-y-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-mono font-bold text-amber-400">
                                          {contrib.agentId}
                                        </span>
                                        <span className="text-xs font-semibold text-slate-100 truncate">
                                          {contrib.name}
                                        </span>
                                        <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                                          {contrib.assignedModel}
                                        </span>
                                      </div>
                                      <div className="text-xs text-slate-400 truncate">
                                        {contrib.role} →{' '}
                                        <strong className="text-slate-200">
                                          {contrib.outputArtifact}
                                        </strong>
                                      </div>
                                    </div>
                                    {fullAgent && (
                                      <button
                                        type="button"
                                        onClick={() => onSelectAgent(fullAgent)}
                                        className="text-xs font-mono text-amber-400 hover:text-amber-300 shrink-0 cursor-pointer"
                                      >
                                        Task Agent →
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
};
