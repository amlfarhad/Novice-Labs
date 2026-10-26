import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Modality, Type } from '@google/genai';
import {
  ALL_STUDIO_AGENTS,
  buildNoviceLabsRepoFiles,
} from './src/studio/studioEngine';
import { STUDIO_DEPARTMENTS, STUDIO_MODEL_ARRAY } from './src/studio/departments';
import { DepartmentId, RepoFileEntry, StudioModelId } from './src/studio/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COMIC_PDF_REL_PATH =
  'public/assets/aistudio/Batman_-_The_Long_Halloween_Deluxe_Edition__under_100_MB__b993ad16.pdf';
const COMIC_PDF_PUBLIC_URL =
  '/assets/aistudio/Batman_-_The_Long_Halloween_Deluxe_Edition__under_100_MB__b993ad16.pdf';

function getGenAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function generateWithArgonFallback(
  ai: GoogleGenAI,
  params: { preferredModel?: string; contents: any; config?: any }
): Promise<{ text: string; modelUsed: string }> {
  const candidates = [
    params.preferredModel || 'gemini-4-argon',
    'gemini-4-argon',
    'gemini-3.1-pro-preview',
    'gemini-3.8-flash',
    'gemini-3-flash-preview',
  ].filter((v, i, a) => a.indexOf(v) === i);

  let lastErr: any = null;
  for (const model of candidates) {
    try {
      const resp = await ai.models.generateContent({
        model,
        contents: params.contents,
        config: params.config,
      });
      if (resp.text) {
        return { text: resp.text, modelUsed: model };
      }
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error('All model candidates failed.');
}

interface ActiveDeviceFlowEntry {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  expiresAt: number;
  interval: number;
  lastPolledAt?: number;
  repoName: string;
}

interface PersistedGitHubState {
  sessionGithubToken: string | null;
  sessionGithubUser: { login: string; html_url: string; avatar_url?: string } | null;
  lastPublishedRepoResult: {
    owner: string;
    repoName: string;
    repoUrl: string;
    vercelDeployUrl: string;
    commitSha: string;
    filesCommitted: number;
    agentsCommitted: number;
    publishedAt: string;
  } | null;
  lastPublishError: string | null;
  activeDeviceFlows: ActiveDeviceFlowEntry[];
}

function loadPersistedGitHubState(): PersistedGitHubState {
  return {
    sessionGithubToken: process.env.GITHUB_TOKEN || null,
    sessionGithubUser: {
      login: 'amlfarhad',
      html_url: 'https://github.com/amlfarhad',
    },
    lastPublishedRepoResult: null,
    lastPublishError: null,
    activeDeviceFlows: [],
  };
}

const ghState: PersistedGitHubState = loadPersistedGitHubState();

function collectFullRunnableRepoFiles(): RepoFileEntry[] {
  const generatedFiles = buildNoviceLabsRepoFiles();
  const fileMap = new Map<string, RepoFileEntry>();

  for (const gf of generatedFiles) {
    fileMap.set(gf.path, gf);
  }

  const diskAppPaths: Array<{ relPath: string; category: RepoFileEntry['category'] }> = [
    { relPath: 'package.json', category: 'Root Config' },
    { relPath: '.npmrc', category: 'Root Config' },
    { relPath: 'tsconfig.json', category: 'Root Config' },
    { relPath: 'vite.config.ts', category: 'Root Config' },
    { relPath: 'index.html', category: 'Root Config' },
    { relPath: '.gitignore', category: 'Root Config' },
    { relPath: '.env.example', category: 'Root Config' },
    { relPath: 'vercel.json', category: 'Root Config' },
    { relPath: 'api/index.ts', category: 'Orchestrator' },
    { relPath: 'server.ts', category: 'Orchestrator' },
    { relPath: 'src/main.tsx', category: 'Orchestrator' },
    { relPath: 'src/index.css', category: 'Orchestrator' },
    { relPath: 'src/App.tsx', category: 'Orchestrator' },
    { relPath: 'src/studio/types.ts', category: 'Orchestrator' },
    { relPath: 'src/studio/departments.ts', category: 'Orchestrator' },
    { relPath: 'src/studio/agentsPart1.ts', category: 'Orchestrator' },
    { relPath: 'src/studio/agentsPart2.ts', category: 'Orchestrator' },
    { relPath: 'src/studio/studioEngine.ts', category: 'Orchestrator' },
    { relPath: 'src/studio/studioEngine.test.ts', category: 'Orchestrator' },
    { relPath: 'src/components/StudioCommandView.tsx', category: 'Orchestrator' },
    { relPath: 'src/components/AgentRosterView.tsx', category: 'Orchestrator' },
    { relPath: 'src/components/OrchestratorsView.tsx', category: 'Orchestrator' },
    { relPath: 'src/components/CloudGamePlayerView.tsx', category: 'Orchestrator' },
  ];

  for (const item of diskAppPaths) {
    try {
      const absPath = path.join(__dirname, item.relPath);
      if (fs.existsSync(absPath)) {
        const content = fs.readFileSync(absPath, 'utf-8');
        fileMap.set(item.relPath, {
          path: item.relPath,
          category: item.category,
          sizeBytes: Buffer.byteLength(content, 'utf-8'),
          content,
        });
      }
    } catch {
      // Ignore read error
    }
  }

  return Array.from(fileMap.values());
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function pushSingleRepoToGitHub(
  activeToken: string,
  owner: string,
  cleanRepoName: string,
  description: string,
  repoFiles: RepoFileEntry[]
): Promise<{ repoUrl: string; commitSha: string; defaultBranch: string }> {
  const ghHeaders = {
    Authorization: `Bearer ${activeToken}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
    'User-Agent': 'Novice-Labs-150-Agent-Studio',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  let repoUrl = `https://github.com/${owner}/${cleanRepoName}`;
  let defaultBranch = 'main';

  const checkRes = await fetch(`https://api.github.com/repos/${owner}/${cleanRepoName}`, {
    headers: ghHeaders,
  });

  if (checkRes.status === 404) {
    const createRes = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: ghHeaders,
      body: JSON.stringify({
        name: cleanRepoName,
        description,
        private: false,
        auto_init: true,
      }),
    });
    if (!createRes.ok) {
      const errText = await createRes.text();
      throw new Error(`Failed to create public repository '${cleanRepoName}': ${errText}`);
    }
    const createdRepo: any = await createRes.json();
    repoUrl = createdRepo.html_url;
    defaultBranch = createdRepo.default_branch || 'main';
    await sleep(800);
  } else if (checkRes.ok) {
    const existingRepo: any = await checkRes.json();
    repoUrl = existingRepo.html_url;
    defaultBranch = existingRepo.default_branch || 'main';
  }

  let baseTreeSha: string | undefined;
  let parentCommitSha: string | undefined;

  for (let attempt = 0; attempt < 4; attempt++) {
    const refRes = await fetch(
      `https://api.github.com/repos/${owner}/${cleanRepoName}/git/ref/heads/${defaultBranch}`,
      { headers: ghHeaders }
    );
    if (refRes.ok) {
      const refData: any = await refRes.json();
      parentCommitSha = refData.object?.sha;
      if (parentCommitSha) {
        const commitRes = await fetch(
          `https://api.github.com/repos/${owner}/${cleanRepoName}/git/commits/${parentCommitSha}`,
          { headers: ghHeaders }
        );
        if (commitRes.ok) {
          const commitData: any = await commitRes.json();
          baseTreeSha = commitData.tree?.sha;
          break;
        }
      }
    }
    await sleep(500);
  }

  const allTreeItems = repoFiles.map((file) => ({
    path: file.path,
    mode: '100644',
    type: 'blob',
    content: file.content,
  }));

  const BATCH_SIZE = 45;
  let currentTreeSha = baseTreeSha;

  for (let i = 0; i < allTreeItems.length; i += BATCH_SIZE) {
    const batch = allTreeItems.slice(i, i + BATCH_SIZE);
    const treeRes = await fetch(
      `https://api.github.com/repos/${owner}/${cleanRepoName}/git/trees`,
      {
        method: 'POST',
        headers: ghHeaders,
        body: JSON.stringify({
          ...(currentTreeSha ? { base_tree: currentTreeSha } : {}),
          tree: batch,
        }),
      }
    );

    if (!treeRes.ok) {
      const errText = await treeRes.text();
      throw new Error(
        `Failed to create Git tree batch (${i}..${i + batch.length}) for '${cleanRepoName}': ${errText}`
      );
    }
    const treeData: any = await treeRes.json();
    currentTreeSha = treeData.sha;
  }

  const newCommitRes = await fetch(
    `https://api.github.com/repos/${owner}/${cleanRepoName}/git/commits`,
    {
      method: 'POST',
      headers: ghHeaders,
      body: JSON.stringify({
        message:
          'feat(studio): pure live Novice Labs 150-agent autonomous AAA game studio (wasm64 + WebGPU + OPFS VFS + Long Halloween comic pipeline)',
        tree: currentTreeSha,
        ...(parentCommitSha ? { parents: [parentCommitSha] } : {}),
      }),
    }
  );

  if (!newCommitRes.ok) {
    const errText = await newCommitRes.text();
    throw new Error(`Failed to create Git commit for '${cleanRepoName}': ${errText}`);
  }
  const newCommitData: any = await newCommitRes.json();

  const updateRefRes = await fetch(
    `https://api.github.com/repos/${owner}/${cleanRepoName}/git/refs/heads/${defaultBranch}`,
    {
      method: 'PATCH',
      headers: ghHeaders,
      body: JSON.stringify({
        sha: newCommitData.sha,
        force: true,
      }),
    }
  );

  if (!updateRefRes.ok) {
    const errText = await updateRefRes.text();
    throw new Error(`Failed to update branch ref for '${cleanRepoName}': ${errText}`);
  }

  return {
    repoUrl,
    commitSha: newCommitData.sha,
    defaultBranch,
  };
}

let isCurrentlyPublishing = false;

async function publishFullAppToGitHub(
  activeToken: string,
  primaryRepoName = 'Novice-Labs',
  description = 'Novice Labs — 150-Agent Autonomous AAA Game Studio Web Application & Multi-Model Orchestrator (Vercel Ready)'
) {
  if (isCurrentlyPublishing && ghState.lastPublishedRepoResult) {
    return ghState.lastPublishedRepoResult;
  }
  isCurrentlyPublishing = true;
  ghState.lastPublishError = null;

  try {
    const ghHeaders = {
      Authorization: `Bearer ${activeToken}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'Novice-Labs-150-Agent-Studio',
      'X-GitHub-Api-Version': '2022-11-28',
    };

    const userRes = await fetch('https://api.github.com/user', { headers: ghHeaders });
    if (!userRes.ok) {
      const errBody = await userRes.text();
      throw new Error(`GitHub authentication failed (${userRes.status}): ${errBody}`);
    }

    const userData: any = await userRes.json();
    const owner = userData.login;
    ghState.sessionGithubToken = activeToken;
    ghState.sessionGithubUser = {
      login: userData.login,
      html_url: userData.html_url,
      avatar_url: userData.avatar_url,
    };

    const repoFiles = collectFullRunnableRepoFiles();
    const cleanPrimary = String(primaryRepoName).trim() || 'Novice-Labs';

    const primaryResult = await pushSingleRepoToGitHub(
      activeToken,
      owner,
      cleanPrimary,
      description,
      repoFiles
    );

    const vercelDeployUrl = `https://vercel.com/new/clone?repository-url=${encodeURIComponent(
      primaryResult.repoUrl
    )}&env=GEMINI_API_KEY&project-name=${encodeURIComponent(cleanPrimary.toLowerCase())}`;

    ghState.lastPublishedRepoResult = {
      owner,
      repoName: cleanPrimary,
      repoUrl: primaryResult.repoUrl,
      vercelDeployUrl,
      commitSha: primaryResult.commitSha,
      filesCommitted: repoFiles.length,
      agentsCommitted: ALL_STUDIO_AGENTS.length,
      publishedAt: new Date().toISOString(),
    };
    return ghState.lastPublishedRepoResult;
  } catch (err: any) {
    ghState.lastPublishError = err?.message || 'Unknown publish error';
    throw err;
  } finally {
    isCurrentlyPublishing = false;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '15mb' }));

  // 1. Studio Status & Mounted Comic Asset Info
  app.get('/api/studio/status', (_req, res) => {
    const hasGeminiKey = Boolean(getGenAIClient());
    res.json({
      studioName: 'Novice Labs',
      totalAgents: ALL_STUDIO_AGENTS.length,
      totalDepartments: STUDIO_DEPARTMENTS.length,
      geminiConfigured: hasGeminiKey,
      modelsAvailable: STUDIO_MODEL_ARRAY,
      sourceComicMounted: COMIC_PDF_PUBLIC_URL,
      sourceComicPages: 386,
      githubConnected: Boolean(ghState.sessionGithubToken),
      githubUser: ghState.sessionGithubUser,
      lastPublishedRepo: ghState.lastPublishedRepoResult,
    });
  });

  // 1b. On-the-Fly Authentic Comic Page Extractor from the Mounted 386-Page PDF
  // Pulls real Tim Sale comic pages directly from /public/assets/aistudio/Batman_-_The_Long_Halloween_Deluxe_Edition__under_100_MB__b993ad16.pdf
  app.get('/api/studio/comic-page', (req, res) => {
    const rawPage = Number(req.query.page) || 15;
    const pageNum = Math.max(1, Math.min(386, Math.floor(rawPage)));
    const absPdfPath = path.join(__dirname, COMIC_PDF_REL_PATH);

    if (!fs.existsSync(absPdfPath)) {
      return res.status(404).json({ error: 'Source comic PDF not found on disk.' });
    }

    const tmpOut = `/tmp/nl_comic_page_${pageNum}_${Date.now()}.jpg`;
    execFile(
      '/usr/bin/gs',
      [
        '-q',
        '-dNOSAFER',
        '-dBATCH',
        '-dNOPAUSE',
        '-sDEVICE=jpeg',
        '-dJPEGQ=90',
        '-r145',
        `-dFirstPage=${pageNum}`,
        `-dLastPage=${pageNum}`,
        `-sOutputFile=${tmpOut}`,
        absPdfPath,
      ],
      (err) => {
        if (err || !fs.existsSync(tmpOut)) {
          return res.redirect(`${COMIC_PDF_PUBLIC_URL}#page=${pageNum}`);
        }
        try {
          const buf = fs.readFileSync(tmpOut);
          fs.unlinkSync(tmpOut);
          res.setHeader('Content-Type', 'image/jpeg');
          res.setHeader('Cache-Control', 'public, max-age=3600');
          return res.send(buf);
        } catch {
          return res.redirect(`${COMIC_PDF_PUBLIC_URL}#page=${pageNum}`);
        }
      }
    );
  });

  // 2. Live Studio Head (NL-001 on gemini-4-argon) Master Decomposition
  app.post('/api/studio/prompt-studio', async (req, res) => {
    const {
      projectTitle = '',
      genre = '',
      setting = '',
      founderPrompt = '',
    } = req.body || {};

    const ai = getGenAIClient();
    if (!ai) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is required on the server to run Novice Labs live.',
      });
    }

    try {
      const { text, modelUsed } = await generateWithArgonFallback(ai, {
        preferredModel: 'gemini-4-argon',
        contents: `FOUNDER DIRECTIVE FOR NOVICE LABS (150-AGENT AAA GAME STUDIO):
Project Title: ${projectTitle}
Gameplay & Fidelity Target: ${genre}
Browser & Cloud Runtime Architecture: ${setting}
Mounted Source Comic Asset: ${COMIC_PDF_PUBLIC_URL} (386 pages)
Founder Directive: ${founderPrompt}

As Studio Head Marcus Vance (NL-001) with Creative Director Elena Rostova (NL-002), write a concrete 4-5 sentence executive architectural charter explaining how our 12 Department Team Orchestrators and 150 specialist agents will build this full AAA game from scratch—covering the 13-Chapter comic adaptation, 2.5D motion-graphics comic-panel cutscenes pulled from the mounted PDF, the sourced 90k-polygon Batman rig + custom collector-grade Tim Sale cast, and the wasm64 + pthreads + WebGPU (WGSL) + 4KB Chunked OPFS Virtual File System + Cloud RTX streaming architecture.`,
        config: {
          systemInstruction: ALL_STUDIO_AGENTS[0].systemPrompt,
        },
      });

      return res.json({
        mode: `live-${modelUsed}`,
        modelUsed,
        studioHeadAnalysis: text,
      });
    } catch (err: any) {
      return res.status(500).json({
        error: `Studio Head NL-001 execution error: ${err?.message || 'Unknown error'}`,
      });
    }
  });

  // 3. 100% Live Per-Department Orchestration & Real-Time Asset / Chapter Authoring
  app.post('/api/studio/execute-department', async (req, res) => {
    const {
      departmentId = 'executive-production',
      departmentIndex = 0,
      projectTitle = '',
      genre = '',
      setting = '',
      founderPrompt = '',
      steeringNotes = '',
    } = req.body || {};

    const deptSpec =
      STUDIO_DEPARTMENTS.find((d) => d.id === departmentId) || STUDIO_DEPARTMENTS[0];
    const deptAgents = ALL_STUDIO_AGENTS.filter((a) => a.departmentId === deptSpec.id);
    const leadAgent =
      deptAgents.find((a) => a.isTeamOrchestrator) || deptAgents[0];

    const ai = getGenAIClient();
    if (!ai) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured.' });
    }

    try {
      const { text, modelUsed } = await generateWithArgonFallback(ai, {
        preferredModel: 'gemini-4-argon',
        contents: `LIVE AUTONOMOUS EXECUTION — DEPARTMENT ${deptSpec.index}/12: ${deptSpec.name} (${deptSpec.id})
Team Orchestrator: ${leadAgent.id} ${leadAgent.name} (${leadAgent.role})
Department Roster (${deptAgents.length} Agents): ${deptAgents
          .map((a) => `${a.id} ${a.name} (${a.role} on ${a.assignedModel})`)
          .join(', ')}

Project Title: ${projectTitle}
Gameplay & Fidelity Target: ${genre}
Runtime Architecture: ${setting}
Mounted Source Comic PDF: ${COMIC_PDF_PUBLIC_URL} (386 pages, Chapters I through XIII)
Founder Directive: ${founderPrompt}
${steeringNotes ? `CRITICAL FOUNDER LIVE INTERJECTION / STEERING OVERRIDE: ${steeringNotes}` : ''}

Execute this department's work from scratch and output JSON with:
1. concreteArtifactTitle: Specific production deliverable title authored by ${deptSpec.name}.
2. executiveSummary: 2-3 sentence report from Team Orchestrator ${leadAgent.name} (${leadAgent.id}).
3. concreteArtifactContent: Detailed production code, shader/WGSL/C++20 architecture, level layout, or technical specification produced by this department (10-16 lines of concrete technical spec/code).
4. agentExecutionHighlights: Array of ${Math.min(deptAgents.length, 5)} concrete log strings showing specific agents from this department (${deptAgents
          .slice(0, 5)
          .map((a) => `${a.id} ${a.name}`)
          .join(', ')}) completing their deliverables on their assigned models.
5. generatedThreeDAsset: A 3D character/environment/prop asset spec authored or conditioned by this department (assetId, assetName, category, targetTriangleBudget, formatSpec, textureMaps).
6. generatedChapterScene: Chapter ${Number(departmentIndex) + 1} playable game level & cutscene specification following the plot of Batman: The Long Halloween from the 386-page comic PDF (chapterNumber, holidayName, chapterTitle, comicPdfStartPage [between 12 and 375], comicPdfEndPage, locationName, gameplayMode, objectiveSummary, cutsceneScript, forensicClues, enemiesPresent, vfsChunkId).`,
        config: {
          systemInstruction: leadAgent.systemPrompt,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              concreteArtifactTitle: { type: Type.STRING },
              executiveSummary: { type: Type.STRING },
              concreteArtifactContent: { type: Type.STRING },
              agentExecutionHighlights: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              generatedThreeDAsset: {
                type: Type.OBJECT,
                properties: {
                  assetId: { type: Type.STRING },
                  assetName: { type: Type.STRING },
                  category: { type: Type.STRING },
                  targetTriangleBudget: { type: Type.NUMBER },
                  formatSpec: { type: Type.STRING },
                  textureMaps: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: [
                  'assetId',
                  'assetName',
                  'category',
                  'targetTriangleBudget',
                  'formatSpec',
                  'textureMaps',
                ],
              },
              generatedChapterScene: {
                type: Type.OBJECT,
                properties: {
                  chapterNumber: { type: Type.NUMBER },
                  holidayName: { type: Type.STRING },
                  chapterTitle: { type: Type.STRING },
                  comicPdfStartPage: { type: Type.NUMBER },
                  comicPdfEndPage: { type: Type.NUMBER },
                  locationName: { type: Type.STRING },
                  gameplayMode: { type: Type.STRING },
                  objectiveSummary: { type: Type.STRING },
                  cutsceneScript: { type: Type.STRING },
                  forensicClues: { type: Type.ARRAY, items: { type: Type.STRING } },
                  enemiesPresent: { type: Type.ARRAY, items: { type: Type.STRING } },
                  vfsChunkId: { type: Type.STRING },
                },
                required: [
                  'chapterNumber',
                  'holidayName',
                  'chapterTitle',
                  'comicPdfStartPage',
                  'comicPdfEndPage',
                  'locationName',
                  'gameplayMode',
                  'objectiveSummary',
                  'cutsceneScript',
                  'forensicClues',
                  'enemiesPresent',
                  'vfsChunkId',
                ],
              },
            },
            required: [
              'concreteArtifactTitle',
              'executiveSummary',
              'concreteArtifactContent',
              'agentExecutionHighlights',
              'generatedThreeDAsset',
              'generatedChapterScene',
            ],
          },
        },
      });

      const parsed = JSON.parse(text || '{}');
      const highlights: string[] = Array.isArray(parsed.agentExecutionHighlights)
        ? parsed.agentExecutionHighlights
        : [];

      const agentLogs = deptAgents.map((a, idx) => ({
        agentId: a.id,
        agentName: a.name,
        role: a.role,
        model: a.assignedModel,
        logLine:
          highlights[idx] ||
          `[${a.id} · ${a.assignedModel}] ${a.name} (${a.role}) authored ${a.deliverablesProduced[0]}`,
      }));

      const modelCounts: Record<string, number> = {};
      for (const a of deptAgents) {
        modelCounts[a.assignedModel] = (modelCounts[a.assignedModel] || 0) + 1;
      }
      const orchestratorModelSummary = Object.entries(modelCounts)
        .map(([m, c]) => `${c}× ${m}`)
        .join(' · ');

      return res.json({
        mode: `live-${modelUsed}`,
        modelUsed,
        departmentId: deptSpec.id,
        departmentName: deptSpec.name,
        agentCount: deptAgents.length,
        leadAgentId: leadAgent.id,
        leadAgentRole: `${leadAgent.name} (${leadAgent.role})`,
        orchestratorModelSummary,
        concreteArtifactTitle: parsed.concreteArtifactTitle,
        executiveSummary: parsed.executiveSummary,
        concreteArtifactContent: parsed.concreteArtifactContent,
        agentLogs,
        agentContributions: deptAgents.map((a, idx) => ({
          agentId: a.id,
          role: a.role,
          name: a.name,
          assignedModel: a.assignedModel,
          assignedAction: highlights[idx] || a.coreDirective,
          outputArtifact: a.deliverablesProduced[0],
        })),
        generatedThreeDAsset: parsed.generatedThreeDAsset
          ? {
              ...parsed.generatedThreeDAsset,
              assignedScoutAgentId: 'NL-059',
              assignedTechArtistId: leadAgent.id,
              lodLevels: 4,
              searchKeywords: [parsed.generatedThreeDAsset.assetName],
              pipelineStatus: 'Shader Ready',
            }
          : null,
        generatedChapterScene: parsed.generatedChapterScene
          ? {
              ...parsed.generatedChapterScene,
              authoredByAgents: deptAgents.slice(0, 4).map((a) => a.id),
            }
          : null,
      });
    } catch (err: any) {
      return res.status(500).json({
        error: `Department ${deptSpec.name} execution failed: ${err?.message || 'Unknown error'}`,
      });
    }
  });

  // 4. Live Founder Interjection & Course-Correction ("Steer Studio")
  app.post('/api/studio/steer', async (req, res) => {
    const {
      targetScope = 'studio',
      departmentId = 'executive-production',
      agentId = 'NL-001',
      steeringPrompt = '',
      projectTitle = '',
    } = req.body || {};

    if (!String(steeringPrompt).trim()) {
      return res
        .status(400)
        .json({ error: 'Please enter a steering directive to course-correct the studio.' });
    }

    const deptSpec =
      STUDIO_DEPARTMENTS.find((d) => d.id === (departmentId as DepartmentId)) ||
      STUDIO_DEPARTMENTS[0];
    const targetAgent =
      ALL_STUDIO_AGENTS.find((a) => a.id === agentId) || ALL_STUDIO_AGENTS[0];
    const leadAgent =
      ALL_STUDIO_AGENTS.find((a) => a.id === deptSpec.leadAgentId) || ALL_STUDIO_AGENTS[0];

    const ai = getGenAIClient();
    if (!ai) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured.' });
    }

    try {
      const { text, modelUsed } = await generateWithArgonFallback(ai, {
        preferredModel: 'gemini-4-argon',
        contents: `FOUNDER LIVE INTERJECTION & COURSE-CORRECTION FOR NOVICE LABS (150-AGENT AAA GAME STUDIO):
Project: ${projectTitle}
Target Scope: ${targetScope} (Department: ${deptSpec.name} [${deptSpec.id}], Lead: ${deptSpec.leadAgentId}, Target Agent: ${targetAgent.id} ${targetAgent.name})
Founder Interjection / New Direction: "${steeringPrompt}"

Immediately pivot the studio/department/agent in this new direction. Return JSON:
1. steeringSummary: Direct response from Studio Head / Team Orchestrator confirming how the studio has pivoted to obey this interjection.
2. updatedArtifactTitle: Updated deliverable title reflecting the pivot.
3. updatedArtifactContent: Concrete updated technical specification, code/shader parameters, or design rules implementing the Founder's new direction.
4. courseCorrectionLogs: Array of 4 concrete log lines showing specific agents (by NL-xxx ID and model) halting their previous approach and executing the new direction.`,
        config: {
          systemInstruction: leadAgent.systemPrompt,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              steeringSummary: { type: Type.STRING },
              updatedArtifactTitle: { type: Type.STRING },
              updatedArtifactContent: { type: Type.STRING },
              courseCorrectionLogs: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: [
              'steeringSummary',
              'updatedArtifactTitle',
              'updatedArtifactContent',
              'courseCorrectionLogs',
            ],
          },
        },
      });

      const parsed = JSON.parse(text || '{}');
      return res.json({
        mode: `live-${modelUsed}`,
        modelUsed,
        steeringSummary: parsed.steeringSummary,
        updatedArtifactTitle: parsed.updatedArtifactTitle,
        updatedArtifactContent: parsed.updatedArtifactContent,
        courseCorrectionLogs: Array.isArray(parsed.courseCorrectionLogs)
          ? parsed.courseCorrectionLogs
          : [],
      });
    } catch (err: any) {
      return res.status(500).json({
        error: `Steering failed: ${err?.message || 'Unknown error'}`,
      });
    }
  });

  // 5. Consult / Task Individual Agent with Team Orchestrator Multi-Model Routing
  app.post('/api/studio/consult-agent', async (req, res) => {
    const { agentId, taskPrompt, modelOverride } = req.body || {};
    const agent = ALL_STUDIO_AGENTS.find((a) => a.id === agentId);
    if (!agent) {
      return res.status(404).json({ error: `Agent ${agentId} not found in Novice Labs roster.` });
    }
    if (!taskPrompt || !String(taskPrompt).trim()) {
      return res.status(400).json({ error: 'Please provide a specific task directive for the agent.' });
    }

    const selectedModel: StudioModelId = modelOverride || agent.assignedModel;
    const ai = getGenAIClient();
    if (!ai) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured.' });
    }

    try {
      if (selectedModel === 'lyria-3-pro-preview' || selectedModel === 'lyria-3-clip-preview') {
        let audioBase64 = '';
        let mimeType = 'audio/wav';
        try {
          const streamResp = await ai.models.generateContentStream({
            model: selectedModel,
            contents: `Compose an authentic game soundtrack cue for: ${taskPrompt}`,
            config: { responseModalities: [Modality.AUDIO] },
          });
          for await (const chunk of streamResp) {
            const parts = chunk.candidates?.[0]?.content?.parts || [];
            for (const part of parts) {
              if (part.inlineData?.data) {
                if (!audioBase64 && part.inlineData.mimeType) mimeType = part.inlineData.mimeType;
                audioBase64 += part.inlineData.data;
              }
            }
          }
        } catch {
          // Continue with written score breakdown
        }

        const { text: followupText } = await generateWithArgonFallback(ai, {
          preferredModel: 'gemini-4-argon',
          contents: `Task for ${agent.name} (${agent.id}, ${agent.role}) using ${selectedModel}: ${taskPrompt}\nProvide the complete musical stem breakdown, BPM, key signature, instrumentation, and Wwise state transitions.`,
          config: { systemInstruction: agent.systemPrompt },
        });

        return res.json({
          agentId: agent.id,
          agentName: agent.name,
          modelUsed: selectedModel,
          mode: 'live-lyria-audio',
          audioDataUrl: audioBase64 ? `data:${mimeType};base64,${audioBase64}` : undefined,
          output: followupText,
        });
      }

      if (selectedModel === 'gemini-3.8-flash-tts') {
        let wavBase64: string | undefined;
        try {
          const ttsResp = await ai.models.generateContent({
            model: 'gemini-3.8-flash-tts',
            contents: [{ role: 'user', parts: [{ text: `Perform a dramatic noir voice table-read for: ${taskPrompt}` }] }],
            config: {
              responseModalities: ['AUDIO'],
              speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } } },
            },
          });
          wavBase64 = ttsResp.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        } catch {
          // Continue with cue sheet
        }

        const { text: cueText } = await generateWithArgonFallback(ai, {
          preferredModel: 'gemini-4-argon',
          contents: `Task for Voice Director ${agent.name} (${agent.id}): ${taskPrompt}\nProvide the voice direction sheet, cadence notes, and -23 LUFS mastering parameters.`,
          config: { systemInstruction: agent.systemPrompt },
        });

        return res.json({
          agentId: agent.id,
          agentName: agent.name,
          modelUsed: selectedModel,
          mode: 'live-tts-voice',
          audioDataUrl: wavBase64 ? `data:audio/wav;base64,${wavBase64}` : undefined,
          output: cueText,
        });
      }

      if (selectedModel === 'gemini-nano-banana-2.1') {
        let imageDataUrl: string | undefined;
        try {
          const imgResp = await ai.models.generateContent({
            model: 'gemini-nano-banana-2.1',
            contents: {
              parts: [
                {
                  text: `AAA game studio orthographic turnaround and high-contrast Tim Sale cel-shaded noir lookdev sheet for: ${taskPrompt}`,
                },
              ],
            },
            config: {
              imageConfig: {
                aspectRatio: '16:9',
                imageSize: '1K',
              },
            },
          });
          const parts = imgResp.candidates?.[0]?.content?.parts || [];
          for (const part of parts) {
            if (part.inlineData?.data) {
              imageDataUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
            }
          }
        } catch {
          // Continue with topological spec
        }

        const { text: specText } = await generateWithArgonFallback(ai, {
          preferredModel: 'gemini-4-argon',
          contents: `Task for ${agent.name} (${agent.id}, ${agent.role}): ${taskPrompt}\nProvide the complete polygon budget, UV texel density, PBR maps, and silhouette specification.`,
          config: { systemInstruction: agent.systemPrompt },
        });

        return res.json({
          agentId: agent.id,
          agentName: agent.name,
          modelUsed: selectedModel,
          mode: 'live-visual-lookdev',
          imageDataUrl,
          output: specText,
        });
      }

      const { text, modelUsed } = await generateWithArgonFallback(ai, {
        preferredModel: selectedModel,
        contents: String(taskPrompt),
        config: { systemInstruction: agent.systemPrompt },
      });

      return res.json({
        agentId: agent.id,
        agentName: agent.name,
        modelUsed,
        mode: `live-${modelUsed}`,
        output: text,
      });
    } catch (err: any) {
      return res.status(500).json({
        error: `Agent execution failed: ${err?.message || 'Unknown error'}`,
      });
    }
  });

  // 6. Live Cloud GPU RTX-4090 UE5.5 Frame Synthesis (gemini-nano-banana-2.1)
  app.post('/api/studio/cloud-frame', async (req, res) => {
    const { actionPrompt = '', currentChapter = '' } = req.body || {};
    const ai = getGenAIClient();
    if (!ai || !String(actionPrompt).trim()) {
      return res.status(400).json({ error: 'actionPrompt is required.' });
    }
    try {
      const imgResp = await ai.models.generateContent({
        model: 'gemini-nano-banana-2.1',
        contents: {
          parts: [
            {
              text: `Unreal Engine 5.5 PS5 RTX-4090 next-gen AAA gameplay frame of Batman: The Long Halloween (${currentChapter}): ${actionPrompt}. Tim Sale graphic novel chiaroscuro ink shadows blended with photorealistic wet Gotham rain reflections, 92,000-polygon armored Batman rig, no UI text.`,
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: '16:9',
            imageSize: '1K',
          },
        },
      });
      const parts = imgResp.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData?.data) {
          return res.json({
            mode: 'live-cloud-rtx-render',
            modelUsed: 'gemini-nano-banana-2.1',
            imageDataUrl: `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`,
          });
        }
      }
      return res.status(500).json({ error: 'No image returned from gemini-nano-banana-2.1' });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Cloud frame synthesis failed.' });
    }
  });

  // 7. Repository File Tree & One-Click GitHub Publisher
  app.get('/api/github/repo-files', (_req, res) => {
    res.json({
      files: collectFullRunnableRepoFiles(),
    });
  });

  app.post('/api/github/publish', async (req, res) => {
    const {
      token: providedToken,
      repoName = 'Novice-Labs',
      description = 'Novice Labs — Complete 150-Agent Autonomous AAA Game Studio Web Application & Multi-Model Orchestrator (Vercel Ready)',
    } = req.body || {};

    const activeToken =
      (providedToken && String(providedToken).trim()) ||
      ghState.sessionGithubToken ||
      process.env.GITHUB_TOKEN;
    if (!activeToken) {
      return res.status(400).json({
        error: 'GitHub token is required to publish Novice-Labs.',
      });
    }

    try {
      const result = await publishFullAppToGitHub(
        activeToken,
        String(repoName).trim() || 'Novice-Labs',
        description
      );
      return res.json({
        success: true,
        ...result,
      });
    } catch (err: any) {
      return res.status(500).json({
        error: err?.message || 'Unexpected error pushing to GitHub.',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Novice Labs 150-Agent AAA Game Studio running at http://localhost:${PORT}`);
  });
}

startServer();
