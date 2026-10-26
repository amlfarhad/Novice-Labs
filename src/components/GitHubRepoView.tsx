import React, { useEffect, useMemo, useRef, useState } from 'react';
import { buildNoviceLabsRepoFiles } from '../studio/studioEngine';
import { RepoFileEntry } from '../studio/types';
import {
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  FolderGit2,
  GitBranch,
  KeyRound,
  Loader2,
  Rocket,
  Sparkles,
} from 'lucide-react';

interface PublishedResult {
  owner: string;
  repoName: string;
  repoUrl: string;
  vercelDeployUrl?: string;
  commitSha: string;
  filesCommitted: number;
  agentsCommitted: number;
}

export const GitHubRepoView: React.FC = () => {
  const [repoFiles, setRepoFiles] = useState<RepoFileEntry[]>(() => buildNoviceLabsRepoFiles());
  const [selectedFilePath, setSelectedFilePath] = useState<string>('README.md');
  const [fileSearch, setFileSearch] = useState('');

  // GitHub Publish state — Strictly Novice-Labs
  const [repoName, setRepoName] = useState('Novice-Labs');
  const [githubToken, setGithubToken] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishSuccess, setPublishSuccess] = useState<PublishedResult | null>(null);
  const [copiedFile, setCopiedFile] = useState(false);

  // GitHub Device Flow state (Zero Callback / Zero Popup Blocker)
  const [deviceData, setDeviceData] = useState<{
    deviceCode: string;
    userCode: string;
    verificationUri: string;
    interval: number;
  } | null>(null);
  const [isStartingDeviceFlow, setIsStartingDeviceFlow] = useState(false);
  const [isPollingDevice, setIsPollingDevice] = useState(false);
  const [copiedDeviceCode, setCopiedDeviceCode] = useState(false);
  const pollTimerRef = useRef<number | null>(null);

  // Fetch full 188-file runnable app + 150-agent tree & check existing GitHub status
  useEffect(() => {
    fetch('/api/github/repo-files')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.files && Array.isArray(data.files) && data.files.length > 0) {
          setRepoFiles(data.files);
        }
      })
      .catch(() => {});

    fetch('/api/studio/status')
      .then((r) => (r.ok ? r.json() : null))
      .then((status) => {
        if (status?.lastPublishedRepo) {
          setPublishSuccess(status.lastPublishedRepo);
        } else if (status?.activeDeviceFlow) {
          setDeviceData({
            deviceCode: status.activeDeviceFlow.deviceCode,
            userCode: status.activeDeviceFlow.userCode,
            verificationUri:
              status.activeDeviceFlow.verificationUri || 'https://github.com/login/device',
            interval: status.activeDeviceFlow.interval || 5,
          });
          setIsPollingDevice(true);
        } else if (status?.githubDeviceFlowConfigured) {
          startDeviceFlowSilent(false);
        }
      })
      .catch(() => {});

    return () => {
      if (pollTimerRef.current) {
        window.clearInterval(pollTimerRef.current);
      }
    };
  }, []);

  const startDeviceFlowSilent = async (forceNew = false) => {
    setIsStartingDeviceFlow(true);
    try {
      const res = await fetch('/api/github/device/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoName: repoName.trim() || 'Novice-Labs', forceNew }),
      });
      const data = await res.json();
      if (res.ok && data.deviceCode && data.userCode) {
        setDeviceData({
          deviceCode: data.deviceCode,
          userCode: data.userCode,
          verificationUri: data.verificationUri || 'https://github.com/login/device',
          interval: data.interval || 5,
        });
        setIsPollingDevice(true);
      }
    } catch {
      // Ignore silent pre-warm error
    } finally {
      setIsStartingDeviceFlow(false);
    }
  };

  // Poll GitHub Device Flow when deviceData is active + check immediately on tab focus
  useEffect(() => {
    if (!deviceData?.deviceCode || publishSuccess) {
      if (pollTimerRef.current) {
        window.clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      return;
    }

    const checkPollOnce = async () => {
      try {
        const res = await fetch('/api/github/device/poll', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deviceCode: deviceData.deviceCode,
            repoName: repoName.trim() || 'Novice-Labs',
          }),
        });
        const data = await res.json();
        if (data.status === 'published' && data.publishResult) {
          setPublishSuccess(data.publishResult);
          setIsPollingDevice(false);
          setPublishError(null);
          if (pollTimerRef.current) {
            window.clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
          }
        } else if (data.activeDeviceFlow && data.activeDeviceFlow.userCode !== deviceData.userCode) {
          setDeviceData({
            deviceCode: data.activeDeviceFlow.deviceCode,
            userCode: data.activeDeviceFlow.userCode,
            verificationUri:
              data.activeDeviceFlow.verificationUri || 'https://github.com/login/device',
            interval: data.activeDeviceFlow.interval || 5,
          });
        } else if (data.status === 'error' && data.error) {
          setPublishError(data.error);
        }
      } catch {
        // Keep polling on transient network hiccup
      }
    };

    const intervalMs = Math.max(deviceData.interval || 5, 5) * 1000;
    const id = window.setInterval(checkPollOnce, intervalMs);
    pollTimerRef.current = id;

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        checkPollOnce();
      }
    };
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [deviceData, repoName, publishSuccess]);

  // Listen for Web OAuth popup completion
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        setPublishError(null);
        if (event.data.publishResult) {
          setPublishSuccess(event.data.publishResult);
        } else {
          triggerSessionPublish();
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [repoName]);

  const triggerSessionPublish = async () => {
    setIsPublishing(true);
    setPublishError(null);
    try {
      const response = await fetch('/api/github/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoName: repoName.trim() || 'Novice-Labs',
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setPublishSuccess(data);
      } else {
        setPublishError(data.error || 'Failed to publish repository.');
      }
    } catch (err: any) {
      setPublishError(err?.message || 'Error publishing repository.');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleOAuthPopup = async () => {
    setPublishError(null);
    try {
      const res = await fetch('/api/github/auth/url');
      const data = await res.json();
      if (!res.ok || !data.url) {
        setPublishError(data.error || 'Could not generate GitHub OAuth URL.');
        return;
      }
      window.open(data.url, 'github_oauth_popup', 'width=620,height=720');
    } catch (err: any) {
      setPublishError(err?.message || 'Failed to launch GitHub OAuth window.');
    }
  };

  const handleCopyDeviceCodeAndOpen = async () => {
    if (!deviceData) return;
    try {
      await navigator.clipboard.writeText(deviceData.userCode);
      setCopiedDeviceCode(true);
      setTimeout(() => setCopiedDeviceCode(false), 3500);
    } catch {
      // Ignore clipboard restriction
    }
  };

  const handlePublishToGitHub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoName.trim()) {
      setPublishError('Please provide a repository name (default: Novice-Labs).');
      return;
    }

    setPublishError(null);
    setIsPublishing(true);

    try {
      const response = await fetch('/api/github/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: githubToken.trim() || undefined,
          repoName: repoName.trim(),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setPublishError(data.error || 'Failed to publish repository to GitHub.');
      } else {
        setPublishSuccess(data);
      }
    } catch (err: any) {
      setPublishError(err?.message || 'Network error while communicating with GitHub API.');
    } finally {
      setIsPublishing(false);
    }
  };

  const selectedFile = useMemo(() => {
    return repoFiles.find((f) => f.path === selectedFilePath) || repoFiles[0];
  }, [repoFiles, selectedFilePath]);

  const filteredFiles = useMemo(() => {
    const q = fileSearch.trim().toLowerCase();
    if (!q) return repoFiles;
    return repoFiles.filter((f) => f.path.toLowerCase().includes(q));
  }, [repoFiles, fileSearch]);

  const handleCopyFileContent = async () => {
    try {
      await navigator.clipboard.writeText(selectedFile.content);
      setCopiedFile(true);
      setTimeout(() => setCopiedFile(false), 1800);
    } catch {
      // Ignore clipboard permission errors
    }
  };

  const handleDownloadManifestBundle = () => {
    const bundle = {
      repositoryName: repoName,
      visibility: 'public',
      vercelReady: true,
      generatedAt: new Date().toISOString(),
      totalFiles: repoFiles.length,
      files: repoFiles,
    };
    const blob = new Blob([JSON.stringify(bundle, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${repoName}-full-vercel-app-and-150-agents.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      {/* One-Click Public GitHub Repo & Vercel Publisher Card */}
      <section
        aria-labelledby="github-publish-heading"
        className="border border-amber-500/40 bg-[#0F1623] rounded-xl p-6 space-y-6"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="text-xs font-mono text-amber-400">
              FULL RUNNABLE APPLICATION + 150 AGENT REPOSITORY · PUBLIC GITHUB → VERCEL
            </div>
            <h1
              id="github-publish-heading"
              className="text-2xl font-bold text-slate-100 mt-1 font-display"
            >
              Push Full Application to Public GitHub Repo “Novice-Labs” (Vercel Ready)
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-4xl">
              Commits all <strong className="font-mono tabular-nums text-amber-300">{repoFiles.length}</strong> files—including the{' '}
              <strong>complete runnable React 19 + Vite + TypeScript web application</strong> (
              <code className="font-mono text-amber-300">package.json</code>,{' '}
              <code className="font-mono text-amber-300">src/*</code>,{' '}
              <code className="font-mono text-amber-300">api/index.ts</code>,{' '}
              <code className="font-mono text-amber-300">vercel.json</code>), 12 Department Manifests, and all{' '}
              <strong className="font-mono tabular-nums">150</strong> individual agent specification files—directly to your personal GitHub account as a <strong>public</strong> repository ready to import into Vercel in 1 click.
            </p>
          </div>

          <button
            type="button"
            onClick={handleDownloadManifestBundle}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Download {repoFiles.length}-File App Bundle (.json)
          </button>
        </div>

        {/* Success Banner with Direct GitHub Links + 1-Click Deploy to Vercel */}
        {publishSuccess && (
          <div
            role="status"
            className="p-5 rounded-xl bg-emerald-950/70 border border-emerald-500/70 text-emerald-100 space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2.5 font-bold text-base text-emerald-300">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>
                  Live on Your GitHub: {publishSuccess.owner}/{publishSuccess.repoName}
                </span>
              </div>
              <span className="text-xs font-mono px-2.5 py-1 rounded bg-emerald-900/80 text-emerald-200">
                Committed {publishSuccess.filesCommitted} Files · {publishSuccess.agentsCommitted} Agents · SHA {publishSuccess.commitSha.slice(0, 8)}
              </span>
            </div>

            <p className="text-xs text-emerald-200 leading-relaxed">
              Your complete runnable application and 150-agent studio repository is now public on your GitHub account. Click <strong>1-Click Import & Deploy on Vercel</strong> below (or select <code className="font-mono">{publishSuccess.repoName}</code> in your Vercel dashboard) and add <code className="font-mono">GEMINI_API_KEY</code> in Vercel Environment Variables.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <a
                href={publishSuccess.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-400/50 text-xs font-semibold transition-colors"
              >
                <FolderGit2 className="w-4 h-4" />
                <span>Open GitHub: {publishSuccess.owner}/{publishSuccess.repoName}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <a
                href={
                  publishSuccess.vercelDeployUrl ||
                  `https://vercel.com/new/clone?repository-url=${encodeURIComponent(
                    publishSuccess.repoUrl
                  )}&env=GEMINI_API_KEY`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold transition-colors"
              >
                <Rocket className="w-4 h-4" />
                <span>1-Click Import & Deploy on Vercel</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        )}

        {/* Step 1: Fast 1-Click GitHub Device Authorization OR OAuth Popup (Uses Configured GITHUB_CLIENT_ID) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-950/90 border border-amber-500/40 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-mono text-amber-400 font-semibold">
                OPTION A (RECOMMENDED) · 1-CLICK GITHUB DEVICE ACTIVATION
              </span>
              {isPollingDevice && (
                <span className="inline-flex items-center gap-1.5 text-xs font-mono text-emerald-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Auto-Polling GitHub...
                </span>
              )}
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Uses your configured GitHub App (<code className="font-mono text-amber-300">Ov23liDAAwfr6EBnyd2D</code>) with zero callback URL issues. Copy the 8-digit activation code below and paste it on GitHub—the moment you click <strong>Authorize</strong>, this server automatically creates and pushes <strong>Novice-Labs</strong> to your personal GitHub!
            </p>

            {deviceData ? (
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-slate-900 border border-slate-800">
                <div>
                  <div className="text-[11px] font-mono text-slate-400">
                    YOUR GITHUB ACTIVATION CODE
                  </div>
                  <div className="text-xl font-bold font-mono tracking-widest text-amber-300 mt-0.5">
                    {deviceData.userCode}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={deviceData.verificationUri}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleCopyDeviceCodeAndOpen}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>
                      {copiedDeviceCode
                        ? 'Code Copied! Complete on GitHub →'
                        : `Copy "${deviceData.userCode}" & Open GitHub`}
                    </span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => startDeviceFlowSilent(true)}
                    disabled={isStartingDeviceFlow}
                    className="inline-flex items-center gap-1.5 px-2.5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors cursor-pointer"
                    title="Generate a brand new 8-digit GitHub Device Code"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>New Code</span>
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => startDeviceFlowSilent(true)}
                disabled={isStartingDeviceFlow}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  {isStartingDeviceFlow
                    ? 'Generating GitHub Activation Code...'
                    : 'Generate 1-Click GitHub Activation Code'}
                </span>
              </button>
            )}
          </div>

          <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="text-xs font-mono text-slate-300 font-semibold">
                OPTION B · INSTANT PRE-FILLED TOKEN OR WEB OAUTH POPUP
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Want instant 2-second synchronous upload with zero waiting? Click <strong>1-Click Pre-Filled GitHub Token</strong> below (already pre-checked with <code className="font-mono text-amber-300">public_repo</code>), click green <em>Generate token</em> on GitHub, and paste it below!
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              <a
                href="https://github.com/settings/tokens/new?scopes=public_repo&description=Novice-Labs-Studio"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/50 text-amber-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                <span>1-Click Pre-Filled GitHub Token (public_repo)</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                type="button"
                onClick={handleOAuthPopup}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 text-xs font-semibold transition-colors cursor-pointer"
              >
                <GitBranch className="w-3.5 h-3.5 text-amber-400" />
                <span>OAuth Popup</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Direct Publish Form (Repository Name + Optional PAT) */}
        <form onSubmit={handlePublishToGitHub} className="space-y-4 pt-2 border-t border-slate-800/80">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="github-repo-name"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                Public Repository Name
              </label>
              <input
                id="github-repo-name"
                type="text"
                value={repoName}
                onChange={(e) => setRepoName(e.target.value)}
                className="w-full px-3.5 py-2 text-sm font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-amber-400"
                placeholder="Novice-Labs"
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="github-pat-input"
                className="block text-xs font-medium text-slate-300 mb-1.5"
              >
                <span className="inline-flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    Or Paste GitHub Personal Access Token (<code className="font-mono text-amber-300">public_repo</code> scope) for Instant Push
                  </span>
                </span>
              </label>
              <input
                id="github-pat-input"
                type="password"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                className="w-full px-3.5 py-2 text-sm font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-amber-400"
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx (optional if authorized via Option A or B above)"
              />
            </div>
          </div>

          {publishError && (
            <div
              role="alert"
              className="p-3.5 rounded-lg bg-red-950/60 border border-red-800 text-xs text-red-200"
            >
              {publishError}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="text-xs text-slate-400 font-mono">
              Visibility: PUBLIC (private: false) · Commits {repoFiles.length} Files (Full Vite/React/Vercel Web App + 150 Agents)
            </div>
            <button
              type="submit"
              disabled={isPublishing}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <GitBranch className="w-3.5 h-3.5" />
              {isPublishing
                ? `Creating Public Repo & Committing ${repoFiles.length} Files...`
                : `Create & Push Public Repo "${repoName}" to GitHub`}
            </button>
          </div>
        </form>
      </section>

      {/* Interactive Repository Tree Explorer (188 Files) */}
      <section
        aria-labelledby="repo-tree-heading"
        className="border border-slate-800 bg-[#0F1623] rounded-xl overflow-hidden"
      >
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <FolderGit2 className="w-4 h-4 text-amber-400" />
            <h2 id="repo-tree-heading" className="text-sm font-bold text-slate-100 font-mono">
              {repoName} / main ({repoFiles.length} Total Files: Full Runnable Vercel Web App + 12 Department Manifests + 150 Agent Specs)
            </h2>
          </div>

          <div className="w-full sm:w-72">
            <label htmlFor="repo-file-search" className="sr-only">
              Filter repository files
            </label>
            <input
              id="repo-file-search"
              type="search"
              value={fileSearch}
              onChange={(e) => setFileSearch(e.target.value)}
              placeholder="Filter files (e.g. App.tsx, vercel.json, NL-001)..."
              className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[540px]">
          {/* Left File Tree List */}
          <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-slate-800 max-h-[540px] overflow-y-auto divide-y divide-slate-800/50">
            {filteredFiles.map((file) => {
              const active = file.path === selectedFile.path;
              return (
                <button
                  key={file.path}
                  type="button"
                  onClick={() => setSelectedFilePath(file.path)}
                  className={`w-full text-left px-3.5 py-2.5 text-xs font-mono flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                    active
                      ? 'bg-amber-500/15 text-amber-300 border-l-2 border-amber-400'
                      : 'text-slate-300 hover:bg-slate-900/70'
                  }`}
                >
                  <span className="truncate">{file.path}</span>
                  <span className="text-[11px] text-slate-400 shrink-0 tabular-nums">
                    {file.category}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right File Content Inspector */}
          <div className="lg:col-span-8 flex flex-col bg-slate-950 max-h-[540px]">
            <div className="px-4 py-2.5 border-b border-slate-800 flex items-center justify-between gap-2 bg-slate-900/60">
              <div className="text-xs font-mono text-amber-300 truncate">{selectedFile.path}</div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs font-mono text-slate-400 tabular-nums">
                  {selectedFile.sizeBytes} bytes
                </span>
                <button
                  type="button"
                  onClick={handleCopyFileContent}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition-colors cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedFile ? 'Copied' : 'Copy File'}</span>
                </button>
              </div>
            </div>

            <pre className="p-4 text-xs font-mono text-slate-200 overflow-auto flex-1 leading-relaxed whitespace-pre-wrap">
              {selectedFile.content}
            </pre>
          </div>
        </div>
      </section>
    </div>
  );
};
