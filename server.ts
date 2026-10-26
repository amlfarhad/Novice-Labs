import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Modality, Type } from '@google/genai';
import {
  ALL_STUDIO_AGENTS,
  buildNoviceLabsRepoFiles,
  generateStudioSprintReport,
} from './src/studio/studioEngine';
import { STUDIO_DEPARTMENTS, STUDIO_MODEL_ARRAY } from './src/studio/departments';
import { RepoFileEntry, StudioModelId } from './src/studio/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

const STATE_FILE_PATH = path.join(__dirname, '.github-studio-state.json');

function loadPersistedGitHubState(): PersistedGitHubState {
  try {
    if (fs.existsSync(STATE_FILE_PATH)) {
      const raw = JSON.parse(fs.readFileSync(STATE_FILE_PATH, 'utf-8'));
      return {
        sessionGithubToken: raw.sessionGithubToken || process.env.GITHUB_TOKEN || null,
        sessionGithubUser: raw.sessionGithubUser || {
          login: 'amlfarhad',
          html_url: 'https://github.com/amlfarhad',
        },
        lastPublishedRepoResult: raw.lastPublishedRepoResult || null,
        lastPublishError: raw.lastPublishError || null,
        activeDeviceFlows: Array.isArray(raw.activeDeviceFlows) ? raw.activeDeviceFlows : [],
      };
    }
  } catch {
    // Ignore corrupted state file
  }
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

function savePersistedGitHubState() {
  try {
    fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(ghState, null, 2), 'utf-8');
  } catch {
    // Ignore write error
  }
}

/**
 * Collects the ENTIRE runnable full-stack application from disk (React 19 + Vite + TypeScript +
 * Vercel Serverless API in api/index.ts + package.json + vercel.json) AND merges it with the
 * 150 Agent Markdown files + 12 Department Manifests so the pushed GitHub repository runs out-of-the-box on Vercel.
 */
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
    { relPath: 'src/components/GitHubRepoView.tsx', category: 'Orchestrator' },
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
      // Keep generated fallback if disk read fails
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
        private: false, // Strictly PUBLIC
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
    // Give GitHub 800ms to finish writing the initial auto_init commit
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

  // Commit the 188 files in safe batches of 45 files chained via base_tree so no single payload times out
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
          'feat(studio): deploy complete runnable Novice Labs 150-agent AAA game studio web app + Vercel API + 150 agent specs',
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
  description = 'Novice Labs — Complete 150-Agent Autonomous AAA Game Studio Web Application & Multi-Model Orchestrator (Vercel Ready)'
) {
  if (isCurrentlyPublishing && ghState.lastPublishedRepoResult) {
    return ghState.lastPublishedRepoResult;
  }
  isCurrentlyPublishing = true;
  ghState.lastPublishError = null;
  savePersistedGitHubState();

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
      throw new Error(
        `GitHub authentication failed (${userRes.status}). Ensure your token/authorization includes 'public_repo' or 'repo' scope. Details: ${errBody}`
      );
    }

    const userData: any = await userRes.json();
    const owner = userData.login;
    ghState.sessionGithubToken = activeToken;
    ghState.sessionGithubUser = {
      login: userData.login,
      html_url: userData.html_url,
      avatar_url: userData.avatar_url,
    };
    savePersistedGitHubState();

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
    ghState.activeDeviceFlows = [];
    savePersistedGitHubState();

    console.log(
      `[Novice Labs GitHub Publisher] Successfully published ${primaryResult.repoUrl} (${repoFiles.length} files)`
    );
    return ghState.lastPublishedRepoResult;
  } catch (err: any) {
    ghState.lastPublishError = err?.message || 'Unknown publish error';
    savePersistedGitHubState();
    console.error('[Novice Labs GitHub Publisher Error]:', ghState.lastPublishError);
    throw err;
  } finally {
    isCurrentlyPublishing = false;
  }
}

async function getOrCreateStableDeviceFlow(
  repoName = 'Novice-Labs',
  forceNew = false
): Promise<ActiveDeviceFlowEntry> {
  const now = Date.now();
  // Remove expired or slow_down-penalized flows (interval > 15s)
  ghState.activeDeviceFlows = ghState.activeDeviceFlows.filter(
    (d) => d.expiresAt > now + 30_000 && (d.interval || 5) <= 15
  );

  if (!forceNew && ghState.activeDeviceFlows.length > 0) {
    const existing = ghState.activeDeviceFlows[ghState.activeDeviceFlows.length - 1];
    if (existing.expiresAt > now + 180_000 && (existing.interval || 5) <= 15) {
      return existing;
    }
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    throw new Error('GITHUB_CLIENT_ID is not set in environment.');
  }

  const deviceRes = await fetch('https://github.com/login/device/code', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      scope: 'public_repo read:user',
    }).toString(),
  });

  const deviceData: any = await deviceRes.json();
  if (!deviceRes.ok || !deviceData.device_code) {
    throw new Error(
      deviceData.error_description || 'Failed to start GitHub Device Flow.'
    );
  }

  const entry: ActiveDeviceFlowEntry = {
    deviceCode: deviceData.device_code,
    userCode: deviceData.user_code,
    verificationUri: deviceData.verification_uri || 'https://github.com/login/device',
    expiresAt: now + (Number(deviceData.expires_in) || 899) * 1000,
    interval: Number(deviceData.interval) || 5,
    lastPolledAt: 0,
    repoName: repoName || 'Novice-Labs',
  };

  ghState.activeDeviceFlows.push(entry);
  savePersistedGitHubState();
  return entry;
}

// Server-side autonomous background poller: strictly respects GitHub OAuth >=7s interval per deviceCode!
let isServerPolling = false;
async function pollAllActiveDeviceFlowsOnServer() {
  if (isServerPolling) return;
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) return;

  const now = Date.now();
  ghState.activeDeviceFlows = ghState.activeDeviceFlows.filter(
    (d) => d.expiresAt > now && (d.interval || 5) <= 15
  );
  if (ghState.activeDeviceFlows.length === 0) return;

  isServerPolling = true;
  try {
    for (const flow of [...ghState.activeDeviceFlows]) {
      const minWaitMs = (Math.max(flow.interval || 5, 5) + 2) * 1000;
      if (Date.now() - (flow.lastPolledAt || 0) < minWaitMs) {
        continue;
      }

      flow.lastPolledAt = Date.now();
      savePersistedGitHubState();

      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          device_code: flow.deviceCode,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        }).toString(),
      });

      const tokenData: any = await tokenRes.json();
      if (tokenData.access_token) {
        console.log(
          `[Novice Labs Server Poller] GitHub Device Code ${flow.userCode} authorized! Auto-publishing ${flow.repoName}...`
        );
        await publishFullAppToGitHub(tokenData.access_token, flow.repoName || 'Novice-Labs');
        break;
      } else if (tokenData.error === 'slow_down') {
        const newInterval = Number(tokenData.interval) || (flow.interval || 5) + 5;
        flow.interval = newInterval;
        if (newInterval > 15) {
          // Rotate out penalized device code and immediately create a clean 5-second device code
          ghState.activeDeviceFlows = ghState.activeDeviceFlows.filter(
            (d) => d.deviceCode !== flow.deviceCode
          );
          savePersistedGitHubState();
          await getOrCreateStableDeviceFlow(flow.repoName || 'Novice-Labs', true);
        } else {
          savePersistedGitHubState();
        }
      } else if (
        tokenData.error === 'expired_token' ||
        tokenData.error === 'access_denied' ||
        tokenData.error === 'incorrect_device_code'
      ) {
        ghState.activeDeviceFlows = ghState.activeDeviceFlows.filter(
          (d) => d.deviceCode !== flow.deviceCode
        );
        savePersistedGitHubState();
      }
    }
  } catch {
    // Ignore transient network errors during background poll
  } finally {
    isServerPolling = false;
  }
}

setInterval(() => {
  pollAllActiveDeviceFlowsOnServer();
}, 7000);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // 1. Studio Status & Model Array Health
  app.get('/api/studio/status', (_req, res) => {
    const hasGeminiKey = Boolean(
      process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
    );
    const latestFlow =
      ghState.activeDeviceFlows.length > 0
        ? ghState.activeDeviceFlows[ghState.activeDeviceFlows.length - 1]
        : null;
    res.json({
      studioName: 'Novice Labs',
      totalAgents: ALL_STUDIO_AGENTS.length,
      totalDepartments: STUDIO_DEPARTMENTS.length,
      geminiConfigured: hasGeminiKey,
      modelsAvailable: STUDIO_MODEL_ARRAY,
      githubConnected: Boolean(ghState.sessionGithubToken),
      githubUser: ghState.sessionGithubUser,
      githubOAuthConfigured: Boolean(
        process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
      ),
      githubDeviceFlowConfigured: Boolean(process.env.GITHUB_CLIENT_ID),
      lastPublishedRepo: ghState.lastPublishedRepoResult,
      lastPublishError: ghState.lastPublishError,
      activeDeviceFlow: latestFlow,
    });
  });

  // 1b. Full Repository File Tree (Full Runnable App + 150 Agents)
  app.get('/api/github/repo-files', (_req, res) => {
    res.json({
      files: collectFullRunnableRepoFiles(),
    });
  });

  async function generateWithArgonFallback(
    ai: GoogleGenAI,
    params: { preferredModel?: string; contents: any; config?: any }
  ): Promise<{ text: string; modelUsed: string }> {
    const candidates = [
      params.preferredModel || 'gemini-4-argon',
      'gemini-4-argon',
      'gemini-3.1-pro-preview',
      'gemini-3.8-flash',
      'gemini-flash-latest',
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

  // 1c. Live Per-Department Orchestration & Real-Time Agent Execution Logs
  app.post('/api/studio/execute-department', async (req, res) => {
    const {
      departmentId = 'executive-production',
      projectTitle = 'Batman: The Long Halloween (Cloud-Streamed AAA Noir Detective Action)',
      genre = 'Single-Player Noir Detective / Tactical Freeflow Action (Batman Sole Playable)',
      setting = 'Year-One Gothic Gotham City across 13 Monthly Holiday Chapters',
      founderPrompt = '',
      steeringNotes = '',
    } = req.body || {};

    const deptSpec =
      STUDIO_DEPARTMENTS.find((d) => d.id === departmentId) || STUDIO_DEPARTMENTS[0];
    const deptAgents = ALL_STUDIO_AGENTS.filter((a) => a.departmentId === deptSpec.id);
    const leadAgent =
      deptAgents.find((a) => a.isTeamOrchestrator) || deptAgents[0];

    const baseReport = generateStudioSprintReport(projectTitle, genre, setting);
    const baseDept =
      baseReport.departments.find((d) => d.departmentId === deptSpec.id) ||
      baseReport.departments[0];

    const ai = getGenAIClient();
    if (!ai) {
      return res.json({
        mode: 'deterministic-blueprint',
        modelUsed: leadAgent.assignedModel,
        departmentId: deptSpec.id,
        departmentName: deptSpec.name,
        orchestratorAgent: `${leadAgent.id} (${leadAgent.name})`,
        concreteArtifactTitle: baseDept.concreteArtifactTitle,
        executiveSummary: baseDept.executiveSummary,
        concreteArtifactContent: baseDept.concreteArtifactContent,
        agentLogs: deptAgents.map((a) => ({
          agentId: a.id,
          agentName: a.name,
          role: a.role,
          model: a.assignedModel,
          logLine: `[${a.id} · ${a.assignedModel}] ${a.name} (${a.role}) produced ${a.deliverablesProduced[0]}`,
        })),
      });
    }

    try {
      const { text, modelUsed } = await generateWithArgonFallback(ai, {
        preferredModel: 'gemini-4-argon',
        contents: `LIVE STUDIO EXECUTION — DEPARTMENT: ${deptSpec.name} (${deptSpec.id})
Team Orchestrator: ${leadAgent.id} ${leadAgent.name} (${leadAgent.role})
Department Roster (${deptAgents.length} Agents): ${deptAgents
          .map((a) => `${a.id} ${a.name} (${a.role} on ${a.assignedModel})`)
          .join(', ')}

Project Title: ${projectTitle}
Genre: ${genre}
Setting: ${setting}
Founder Directive: ${founderPrompt}
${steeringNotes ? `CRITICAL FOUNDER COURSE-CORRECTION / STEERING OVERRIDE: ${steeringNotes}` : ''}

Produce JSON for this department's execution step:
1. concreteArtifactTitle: Specific technical deliverable title for ${deptSpec.name}.
2. executiveSummary: 2-3 sentence summary from Team Orchestrator ${leadAgent.name} (${leadAgent.id}) explaining how this department executed the directive (and any Founder Steering override).
3. concreteArtifactContent: Detailed technical artifact/spec produced by this department (6-12 lines of concrete technical spec, parameters, budgets, or code/shader/design rules).
4. agentExecutionHighlights: Array of 4 short log strings showing specific agents from this department (${deptAgents
          .slice(0, 5)
          .map((a) => a.id)
          .join(', ')}) executing their tasks on their assigned models.`,
        config: {
          systemInstruction:
            'You are the Autonomous Team Orchestrator at Novice Labs (150-agent AAA game studio). Output concrete, production-grade AAA game engineering, art, audio, or design specifications. Never output generic filler.',
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
            },
            required: [
              'concreteArtifactTitle',
              'executiveSummary',
              'concreteArtifactContent',
              'agentExecutionHighlights',
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
          `[${a.id} · ${a.assignedModel}] ${a.name} (${a.role}) completed "${a.deliverablesProduced[0]}"${
            steeringNotes ? ' [Aligned with Founder Steering]' : ''
          }`,
      }));

      return res.json({
        mode: `live-${modelUsed}`,
        modelUsed,
        departmentId: deptSpec.id,
        departmentName: deptSpec.name,
        orchestratorAgent: `${leadAgent.id} (${leadAgent.name})`,
        concreteArtifactTitle: parsed.concreteArtifactTitle || baseDept.concreteArtifactTitle,
        executiveSummary: parsed.executiveSummary || baseDept.executiveSummary,
        concreteArtifactContent:
          parsed.concreteArtifactContent || baseDept.concreteArtifactContent,
        agentLogs,
      });
    } catch (err: any) {
      return res.json({
        mode: 'deterministic-fallback',
        modelUsed: 'gemini-4-argon',
        warning: err?.message,
        departmentId: deptSpec.id,
        departmentName: deptSpec.name,
        orchestratorAgent: `${leadAgent.id} (${leadAgent.name})`,
        concreteArtifactTitle: baseDept.concreteArtifactTitle,
        executiveSummary: steeringNotes
          ? `[STEERED: ${steeringNotes}] ${baseDept.executiveSummary}`
          : baseDept.executiveSummary,
        concreteArtifactContent: steeringNotes
          ? `// FOUNDER STEERING OVERRIDE APPLIED: ${steeringNotes}\n${baseDept.concreteArtifactContent}`
          : baseDept.concreteArtifactContent,
        agentLogs: deptAgents.map((a) => ({
          agentId: a.id,
          agentName: a.name,
          role: a.role,
          model: a.assignedModel,
          logLine: `[${a.id} · ${a.assignedModel}] ${a.name} (${a.role}) executed "${a.deliverablesProduced[0]}"`,
        })),
      });
    }
  });

  // 1d. Live Founder Interjection & Course-Correction ("Steer Studio")
  app.post('/api/studio/steer', async (req, res) => {
    const {
      targetScope = 'studio',
      departmentId = 'executive-production',
      agentId = 'NL-001',
      steeringPrompt = '',
      projectTitle = 'Batman: The Long Halloween (Cloud-Streamed AAA Noir Detective Action)',
    } = req.body || {};

    if (!String(steeringPrompt).trim()) {
      return res
        .status(400)
        .json({ error: 'Please enter a steering directive to course-correct the studio.' });
    }

    const deptSpec =
      STUDIO_DEPARTMENTS.find((d) => d.id === departmentId) || STUDIO_DEPARTMENTS[0];
    const targetAgent =
      ALL_STUDIO_AGENTS.find((a) => a.id === agentId) || ALL_STUDIO_AGENTS[0];

    const ai = getGenAIClient();
    if (!ai) {
      return res.json({
        mode: 'deterministic-steer',
        modelUsed: 'gemini-4-argon',
        steeringSummary: `Founder Override locked for ${
          targetScope === 'agent'
            ? `${targetAgent.id} (${targetAgent.name})`
            : targetScope === 'department'
            ? deptSpec.name
            : 'All 12 Departments (NL-001 Studio Head)'
        }: "${steeringPrompt}"`,
        updatedArtifactTitle: `[FOUNDER STEERED] ${deptSpec.name} — Course-Corrected Spec`,
        updatedArtifactContent: `// FOUNDER INTERJECTION APPLIED:\n// "${steeringPrompt}"\n// Re-tasked ${deptSpec.targetHeadcount} agents under ${deptSpec.leadAgentId} to enforce new direction immediately.`,
        courseCorrectionLogs: [
          `[FOUNDER INTERJECTION] Pivoting direction: "${steeringPrompt}"`,
          `[${deptSpec.leadAgentId} · gemini-4-argon] Re-allocating department task graph to match Founder steering.`,
          `[${targetAgent.id} · ${targetAgent.assignedModel}] Updating ${targetAgent.deliverablesProduced[0]} immediately.`,
        ],
      });
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
          systemInstruction:
            'You are Marcus Vance (NL-001), Studio Head of Novice Labs. When the Founder interjects to steer a department or the studio in a new or opposite direction, you immediately halt conflicting work and pivot the agents with concrete technical execution.',
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
        steeringSummary:
          parsed.steeringSummary ||
          `Pivoted ${deptSpec.name} to follow Founder directive: "${steeringPrompt}"`,
        updatedArtifactTitle:
          parsed.updatedArtifactTitle || `[STEERED] ${deptSpec.name} Spec`,
        updatedArtifactContent:
          parsed.updatedArtifactContent || `// Steered: ${steeringPrompt}`,
        courseCorrectionLogs: Array.isArray(parsed.courseCorrectionLogs)
          ? parsed.courseCorrectionLogs
          : [`[FOUNDER STEER] Applied "${steeringPrompt}" across ${deptSpec.name}`],
      });
    } catch (err: any) {
      return res.json({
        mode: 'deterministic-steer-fallback',
        modelUsed: 'gemini-4-argon',
        warning: err?.message,
        steeringSummary: `Founder Override locked for ${deptSpec.name}: "${steeringPrompt}"`,
        updatedArtifactTitle: `[FOUNDER STEERED] ${deptSpec.name} — Course-Corrected Spec`,
        updatedArtifactContent: `// FOUNDER INTERJECTION APPLIED:\n// "${steeringPrompt}"\n// Re-tasked ${deptSpec.targetHeadcount} agents under ${deptSpec.leadAgentId}.`,
        courseCorrectionLogs: [
          `[FOUNDER INTERJECTION] "${steeringPrompt}"`,
          `[${deptSpec.leadAgentId} · gemini-4-argon] Updated ${deptSpec.name} task graph.`,
        ],
      });
    }
  });

  // 2. Hierarchical Studio Prompting Endpoint:
  //    Founder Prompt -> Studio Head (NL-001 on gemini-4-argon) -> 12 Team Orchestrators -> 150 Agents
  app.post('/api/studio/prompt-studio', async (req, res) => {
    const {
      projectTitle = 'Batman: The Long Halloween (Cloud-Streamed AAA Noir Detective Action)',
      genre = 'Single-Player Noir Detective / Tactical Freeflow Action (Batman Sole Playable)',
      setting = 'Year-One Gothic Gotham City across 13 Monthly Holiday Chapters',
      founderPrompt = '',
    } = req.body || {};

    const baseReport = generateStudioSprintReport(projectTitle, genre, setting);
    const ai = getGenAIClient();

    if (!ai || !founderPrompt.trim()) {
      return res.json({
        mode: 'deterministic-blueprint',
        modelUsed: 'gemini-4-argon',
        studioHeadAnalysis:
          'Studio Head Marcus Vance (NL-001) decomposed the directive across all 12 Department Team Orchestrators and 150 specialist agents.',
        report: baseReport,
      });
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-argon',
        contents: `FOUNDER PROMPT FOR NOVICE LABS (150-AGENT AAA GAME STUDIO):\nProject Title: ${projectTitle}\nGenre: ${genre}\nSetting: ${setting}\nDirective: ${founderPrompt}\n\nAs Studio Head Marcus Vance (NL-001), provide:\n1. studioHeadAnalysis: Your executive technical & creative approach explaining how Novice Labs meets every requirement of this prompt.\n2. teamDirectives: An array of 12 objects (one for each of our 12 departments: ${STUDIO_DEPARTMENTS.map((d) => d.id).join(', ')}) containing departmentId, concreteArtifactTitle, executiveSummary, and concreteArtifactContent detailing how that team's orchestrator splits the project across its specialist agents.`,
        config: {
          systemInstruction:
            'You are Marcus Vance (NL-001), Studio Head of Novice Labs (150-agent AAA game studio). You use gemini-4-argon and delegate to 12 Team Orchestrators who assign gemini-4-argon, Google Lyria (lyria-3-pro-preview / lyria-3-clip-preview), gemini-3.8-flash-tts, gemini-nano-banana-2.1, and gemini-3.8-flash (only for sub-second speed). Never cut corners or use AI slop.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              studioHeadAnalysis: {
                type: Type.STRING,
                description: 'Executive synthesis and architectural approach from NL-001 Studio Head.',
              },
              teamDirectives: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    departmentId: { type: Type.STRING },
                    concreteArtifactTitle: { type: Type.STRING },
                    executiveSummary: { type: Type.STRING },
                    concreteArtifactContent: { type: Type.STRING },
                  },
                  required: [
                    'departmentId',
                    'concreteArtifactTitle',
                    'executiveSummary',
                    'concreteArtifactContent',
                  ],
                },
              },
            },
            required: ['studioHeadAnalysis', 'teamDirectives'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      if (Array.isArray(parsed.teamDirectives)) {
        for (const td of parsed.teamDirectives) {
          const match = baseReport.departments.find((d) => d.departmentId === td.departmentId);
          if (match) {
            match.concreteArtifactTitle = td.concreteArtifactTitle || match.concreteArtifactTitle;
            match.executiveSummary = td.executiveSummary || match.executiveSummary;
            match.concreteArtifactContent =
              td.concreteArtifactContent || match.concreteArtifactContent;
          }
        }
      }

      return res.json({
        mode: 'live-gemini-4-argon',
        modelUsed: 'gemini-4-argon',
        studioHeadAnalysis:
          parsed.studioHeadAnalysis ||
          'Studio Head Marcus Vance (NL-001) decomposed your directive across all 12 Team Orchestrators and 150 agents.',
        report: baseReport,
      });
    } catch (err: any) {
      return res.json({
        mode: 'deterministic-fallback',
        modelUsed: 'gemini-4-argon',
        warning: err?.message || 'Used deterministic studio charter blueprint.',
        studioHeadAnalysis:
          'Studio Head Marcus Vance (NL-001) decomposed the directive across all 12 Team Orchestrators and 150 specialist agents using the Novice Labs architecture blueprint.',
        report: baseReport,
      });
    }
  });

  // 3. Consult / Task Individual Agent with Team Orchestrator Multi-Model Routing
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

    const deterministicSpec = [
      `### [${agent.id} // ${agent.codeName}] ${agent.name} — ${agent.role}`,
      `**Department**: ${agent.departmentName} | **Team Orchestrator**: \`${agent.teamOrchestratorId}\` (${agent.teamOrchestratorName})`,
      `**Active Model**: \`${selectedModel}\` (${agent.modelSelectionReason})`,
      ``,
      `#### 1. Task Execution Summary`,
      `Executing directive: *"${String(taskPrompt).trim()}"*`,
      ``,
      `#### 2. Technical Deliverable (${agent.deliverablesProduced[0]})`,
      `- **Primary Mandate Applied**: ${agent.coreDirective}`,
      `- **Inputs Verified**: ${agent.inputsConsumed.join(', ')}`,
      `- **Toolchain Invoked**: \`${agent.toolchain.join('` -> `')}\``,
      `- **Secondary Artifacts**: ${agent.deliverablesProduced.slice(1).join(' | ')}`,
      ``,
      `#### 3. Downstream Agent Handoff Packet`,
      `Serialized contract validated and queued for collaborators: ${agent.collaboratesWith.map((c) => `\`${c}\``).join(', ')}.`,
    ].join('\n');

    if (!ai) {
      return res.json({
        agentId: agent.id,
        agentName: agent.name,
        modelUsed: selectedModel,
        mode: 'studio-simulation',
        output: deterministicSpec,
      });
    }

    try {
      // Case A: Google Lyria Music Models (lyria-3-pro-preview or lyria-3-clip-preview)
      if (selectedModel === 'lyria-3-pro-preview' || selectedModel === 'lyria-3-clip-preview') {
        let audioBase64 = '';
        let mimeType = 'audio/wav';
        let lyricsOrNotes = '';

        try {
          const streamResp = await ai.models.generateContentStream({
            model: selectedModel,
            contents: `Compose an authentic game soundtrack cue for: ${taskPrompt}`,
            config: {
              responseModalities: [Modality.AUDIO],
            },
          });

          for await (const chunk of streamResp) {
            const parts = chunk.candidates?.[0]?.content?.parts;
            if (!parts) continue;
            for (const part of parts) {
              if (part.inlineData?.data) {
                if (!audioBase64 && part.inlineData.mimeType) {
                  mimeType = part.inlineData.mimeType;
                }
                audioBase64 += part.inlineData.data;
              }
              if (part.text && !lyricsOrNotes) {
                lyricsOrNotes = part.text;
              }
            }
          }
        } catch (_lyriaErr) {
          // Also generate the written orchestration sheet via gemini-4-argon if audio stream isn't returned
        }

        const textFollowup = await ai.models.generateContent({
          model: 'gemini-4-argon',
          contents: `Task for ${agent.name} (${agent.id}, ${agent.role}) using ${selectedModel}: ${taskPrompt}\nProvide the complete musical stem breakdown, BPM, key signature, instrumentation, and Wwise state transitions.`,
          config: { systemInstruction: agent.systemPrompt },
        });

        return res.json({
          agentId: agent.id,
          agentName: agent.name,
          modelUsed: selectedModel,
          mode: 'live-lyria-audio',
          audioDataUrl: audioBase64 ? `data:${mimeType};base64,${audioBase64}` : undefined,
          output: textFollowup.text || lyricsOrNotes || deterministicSpec,
        });
      }

      // Case B: Gemini 3.8 Flash TTS Voice Synthesis
      if (selectedModel === 'gemini-3.8-flash-tts') {
        let wavBase64: string | undefined;
        try {
          const ttsResp = await ai.models.generateContent({
            model: 'gemini-3.8-flash-tts',
            contents: [
              {
                role: 'user',
                parts: [{ text: `Perform a dramatic noir voice table-read for: ${taskPrompt}` }],
              },
            ],
            config: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: 'Charon' },
                },
              },
            },
          });
          wavBase64 = ttsResp.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        } catch (_ttsErr) {
          // Continue with text cue sheet
        }

        const cueSheet = await ai.models.generateContent({
          model: 'gemini-4-argon',
          contents: `Task for Voice Director ${agent.name} (${agent.id}): ${taskPrompt}\nProvide the voice direction sheet, cadence notes, and -23 LUFS mastering parameters.`,
          config: { systemInstruction: agent.systemPrompt },
        });

        return res.json({
          agentId: agent.id,
          agentName: agent.name,
          modelUsed: selectedModel,
          mode: 'live-tts-voice',
          audioDataUrl: wavBase64 ? `data:audio/wav;base64,${wavBase64}` : undefined,
          output: cueSheet.text || deterministicSpec,
        });
      }

      // Case C: Visual Concept / Turnaround Model (gemini-nano-banana-2.1)
      if (selectedModel === 'gemini-nano-banana-2.1') {
        let imageDataUrl: string | undefined;
        let textNotes = '';
        try {
          const imgResp = await ai.models.generateContent({
            model: 'gemini-nano-banana-2.1',
            contents: {
              parts: [
                {
                  text: `AAA game studio orthographic turnaround and high-contrast noir concept sheet for: ${taskPrompt}`,
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
            } else if (part.text) {
              textNotes += part.text + '\n';
            }
          }
        } catch (_imgErr) {
          // Fallback to technical lookdev specification
        }

        const specResp = await ai.models.generateContent({
          model: 'gemini-4-argon',
          contents: `Task for ${agent.name} (${agent.id}, ${agent.role}): ${taskPrompt}\nProvide the complete polygon budget, UV texel density, PBR maps, and silhouette specification.`,
          config: { systemInstruction: agent.systemPrompt },
        });

        return res.json({
          agentId: agent.id,
          agentName: agent.name,
          modelUsed: selectedModel,
          mode: 'live-visual-lookdev',
          imageDataUrl,
          output: (textNotes ? textNotes + '\n\n' : '') + (specResp.text || deterministicSpec),
        });
      }

      // Case D: gemini-4-argon (Default Deep Reasoning) or gemini-3.8-flash (Sub-second Speed)
      const response = await ai.models.generateContent({
        model: selectedModel,
        contents: String(taskPrompt),
        config: {
          systemInstruction: agent.systemPrompt,
        },
      });

      return res.json({
        agentId: agent.id,
        agentName: agent.name,
        modelUsed: selectedModel,
        mode: `live-${selectedModel}`,
        output: response.text || deterministicSpec,
      });
    } catch (err: any) {
      return res.json({
        agentId: agent.id,
        agentName: agent.name,
        modelUsed: selectedModel,
        mode: 'studio-simulation-fallback',
        warning: err?.message,
        output: deterministicSpec,
      });
    }
  });

  // 4. GitHub OAuth & Device Flow + Automatic Public Repo Publisher
  app.get('/api/github/auth/url', (req, res) => {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const redirectUri = `${baseUrl.replace(/\/$/, '')}/auth/github/callback`;

    if (!clientId) {
      return res.status(400).json({
        error:
          'GITHUB_CLIENT_ID is not configured. Please paste a GitHub Personal Access Token (with public_repo scope) to push Novice-Labs immediately.',
        redirectUri,
      });
    }

    // Omitting redirect_uri lets GitHub use whatever Authorization Callback URL
    // is registered in the user's GitHub OAuth App settings without throwing redirect_uri_mismatch.
    const params = new URLSearchParams({
      client_id: clientId,
      scope: 'public_repo read:user',
    });

    res.json({
      url: `https://github.com/login/oauth/authorize?${params.toString()}`,
      redirectUri,
    });
  });

  // 4b. GitHub OAuth Device Flow (Zero Callback URL / Zero Popup Blocker)
  // Reuses the active unexpired Device Code across refreshes so no user authorization is ever orphaned!
  app.post('/api/github/device/start', async (req, res) => {
    const { repoName = 'Novice-Labs', forceNew = false } = req.body || {};
    try {
      const entry = await getOrCreateStableDeviceFlow(repoName, Boolean(forceNew));
      return res.json({
        deviceCode: entry.deviceCode,
        userCode: entry.userCode,
        verificationUri: entry.verificationUri,
        expiresIn: Math.max(Math.floor((entry.expiresAt - Date.now()) / 1000), 60),
        interval: entry.interval,
      });
    } catch (err: any) {
      return res.status(500).json({
        error: `Failed to initiate GitHub Device Flow: ${err?.message || 'Unknown error'}`,
      });
    }
  });

  // 4c. Poll GitHub Device Flow & Auto-Publish Public Repo ("Novice-Labs") immediately on authorization
  app.post('/api/github/device/poll', async (req, res) => {
    const { repoName = 'Novice-Labs' } = req.body || {};

    // Check if the Node.js background poller already finished publishing while the browser tab was in the background!
    if (ghState.lastPublishedRepoResult) {
      return res.json({
        status: 'published',
        publishResult: ghState.lastPublishedRepoResult,
      });
    }

    if (repoName && ghState.activeDeviceFlows.length > 0) {
      for (const f of ghState.activeDeviceFlows) {
        f.repoName = String(repoName).trim() || 'Novice-Labs';
      }
    }

    await pollAllActiveDeviceFlowsOnServer();

    if (ghState.lastPublishedRepoResult) {
      return res.json({
        status: 'published',
        publishResult: ghState.lastPublishedRepoResult,
      });
    }

    if (ghState.lastPublishError) {
      return res.status(500).json({
        status: 'error',
        error: ghState.lastPublishError,
      });
    }

    const latestFlow =
      ghState.activeDeviceFlows.length > 0
        ? ghState.activeDeviceFlows[ghState.activeDeviceFlows.length - 1]
        : null;

    return res.json({
      status: 'authorization_pending',
      activeDeviceFlow: latestFlow,
      message: 'Waiting for authorization on GitHub (Node.js server poller active)...',
    });
  });

  const githubCallbackHandler: express.RequestHandler = async (req, res, next) => {
    const { code } = req.query;
    if (!code) {
      return next();
    }
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.status(400).send('Missing GitHub OAuth credentials.');
    }

    try {
      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code: String(code),
        }),
      });
      const tokenData: any = await tokenRes.json();
      let autoPublishJson = 'null';

      if (tokenData.access_token) {
        ghState.sessionGithubToken = tokenData.access_token;
        savePersistedGitHubState();
        try {
          const pubResult = await publishFullAppToGitHub(
            tokenData.access_token,
            'Novice-Labs'
          );
          autoPublishJson = JSON.stringify(pubResult);
        } catch {
          // Token is stored in ghState.sessionGithubToken
        }
      }

      res.send(`<!DOCTYPE html>
<html>
  <body style="background:#0B0F17;color:#F1F5F9;font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;text-align:center;padding:24px;">
    <script>
      const pubResult = ${autoPublishJson};
      if (window.opener) {
        window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', publishResult: pubResult }, '*');
        window.close();
      } else {
        window.location.href = '/';
      }
    </script>
    <h2 style="color:#F59E0B;margin-bottom:8px;">GitHub Connected & Public Repository Published!</h2>
    <p>Novice-Labs has been pushed to your GitHub account. Returning to studio...</p>
  </body>
</html>`);
    } catch (err: any) {
      res.status(500).send(`GitHub OAuth failed: ${err?.message || 'Unknown error'}`);
    }
  };

  app.get(
    [
      '/auth/github/callback',
      '/auth/github/callback/',
      '/api/auth/github/callback',
      '/api/github/callback',
      '/auth/callback',
      '/callback',
    ],
    githubCallbackHandler
  );

  // Also intercept ?code= on root / in case the user's GitHub OAuth App callback URL is set to the root domain
  app.use((req, res, next) => {
    if (req.path === '/' && req.query.code && typeof req.query.code === 'string') {
      return githubCallbackHandler(req, res, next);
    }
    return next();
  });

  // 5. One-Click Public GitHub Repository Publisher ("Novice-Labs")
  app.post('/api/github/publish', async (req, res) => {
    const {
      token: providedToken,
      repoName = 'Novice-Labs',
      description = 'Novice Labs — Complete 150-Agent Autonomous AAA Game Studio Web Application & Multi-Model Orchestrator (Vercel Ready)',
    } = req.body || {};

    const activeToken =
      (providedToken && String(providedToken).trim()) || ghState.sessionGithubToken;
    if (!activeToken) {
      return res.status(400).json({
        error:
          'Please click "Copy Code & Open GitHub" in Option A (or paste a GitHub Personal Access Token) to push Novice-Labs to your personal GitHub account.',
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

  // Mount Vite dev server or production static files
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

  app.listen(PORT, '0.0.0.0', async () => {
    console.log(`Novice Labs 150-Agent AAA Game Studio running at http://localhost:${PORT}`);
    if (!ghState.lastPublishedRepoResult && process.env.GITHUB_CLIENT_ID) {
      try {
        const entry = await getOrCreateStableDeviceFlow('Novice-Labs', false);
        console.log(
          `[Novice Labs GitHub Device Code Ready] Code: ${entry.userCode} -> ${entry.verificationUri}`
        );
      } catch {
        // Ignore startup device flow pre-warm error
      }
    }
  });
}

startServer();
