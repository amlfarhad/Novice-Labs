import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_STUDIO_AGENTS,
  buildNoviceLabsRepoFiles,
  DEFAULT_FOUNDER_DIRECTIVE_CONFIG,
  filterAgents,
  getStudioSummaryMetrics,
} from './studioEngine';
import { STUDIO_DEPARTMENTS, STUDIO_MODEL_ARRAY } from './departments';

test('Novice Labs has strictly 150 unique agents across 12 departments', () => {
  assert.equal(ALL_STUDIO_AGENTS.length, 150, 'Total agent count must be strictly 150');
  assert.equal(STUDIO_DEPARTMENTS.length, 12, 'Department count must be 12');

  const ids = new Set(ALL_STUDIO_AGENTS.map((a) => a.id));
  const codeNames = new Set(ALL_STUDIO_AGENTS.map((a) => a.codeName));
  const paths = new Set(ALL_STUDIO_AGENTS.map((a) => a.repoFilePath));

  assert.equal(ids.size, 150, 'All 150 agent IDs must be unique');
  assert.equal(codeNames.size, 150, 'All 150 agent codenames must be unique');
  assert.equal(paths.size, 150, 'All 150 agent repository file paths must be unique');

  for (let i = 1; i <= 150; i++) {
    const expectedId = `NL-${String(i).padStart(3, '0')}`;
    assert.equal(ALL_STUDIO_AGENTS[i - 1].id, expectedId);
  }
});

test('Every department matches its target headcount and has a designated Team Orchestrator', () => {
  let sumHeadcount = 0;
  for (const dept of STUDIO_DEPARTMENTS) {
    sumHeadcount += dept.targetHeadcount;
    const deptAgents = ALL_STUDIO_AGENTS.filter((a) => a.departmentId === dept.id);
    assert.equal(
      deptAgents.length,
      dept.targetHeadcount,
      `Department ${dept.id} should have ${dept.targetHeadcount} agents`
    );
    const orchestrator = deptAgents.find((a) => a.isTeamOrchestrator);
    assert.ok(orchestrator, `Department ${dept.id} must have a Team Orchestrator`);
    assert.equal(orchestrator.id, dept.leadAgentId);
  }
  assert.equal(sumHeadcount, 150);
});

test('Team Orchestrator Multi-Model Array enforces Zero Cost-Cutting Policy and Google Lyria allocation', () => {
  const summary = getStudioSummaryMetrics();
  assert.equal(summary.totalAgents, 150);
  assert.equal(summary.teamOrchestrators, 12);

  assert.ok(
    summary.modelDistribution['gemini-4-argon'] >= 120,
    `Expected >= 120 agents on gemini-4-argon, got ${summary.modelDistribution['gemini-4-argon']}`
  );

  assert.equal(summary.modelDistribution['lyria-3-pro-preview'], 3);
  assert.equal(summary.modelDistribution['lyria-3-clip-preview'], 4);
  assert.equal(summary.modelDistribution['gemini-3.8-flash-tts'], 1);
  assert.equal(summary.modelDistribution['gemini-3.8-flash'], 9);

  const validModelIds = new Set(STUDIO_MODEL_ARRAY.map((m) => m.id));
  for (const agent of ALL_STUDIO_AGENTS) {
    assert.ok(validModelIds.has(agent.assignedModel));
    assert.ok(agent.modelSelectionReason.length > 20);
    assert.ok(agent.identityMandate.includes(agent.id));
    assert.ok(
      !agent.systemPrompt.toLowerCase().includes('three.js') &&
        !agent.systemPrompt.toLowerCase().includes('webgl'),
      `Agent ${agent.id} systemPrompt must not reference Three.js or WebGL`
    );
  }
});

test('Preloaded Founder Directive references mounted 386-page Long Halloween PDF and wasm64/WebGPU/OPFS VFS with zero Three.js mentions', () => {
  assert.equal(
    DEFAULT_FOUNDER_DIRECTIVE_CONFIG.sourceComicPdfPath,
    '/assets/aistudio/Batman_-_The_Long_Halloween_Deluxe_Edition__under_100_MB__b993ad16.pdf'
  );
  assert.equal(DEFAULT_FOUNDER_DIRECTIVE_CONFIG.sourceComicPages, 386);
  assert.ok(
    !DEFAULT_FOUNDER_DIRECTIVE_CONFIG.promptText.toLowerCase().includes('three.js') &&
      !DEFAULT_FOUNDER_DIRECTIVE_CONFIG.promptText.toLowerCase().includes('threejs') &&
      !DEFAULT_FOUNDER_DIRECTIVE_CONFIG.promptText.toLowerCase().includes('webgl')
  );
  assert.ok(DEFAULT_FOUNDER_DIRECTIVE_CONFIG.promptText.includes('wasm64'));
  assert.ok(DEFAULT_FOUNDER_DIRECTIVE_CONFIG.promptText.includes('WebGPU'));
});

test('buildNoviceLabsRepoFiles generates complete public repository tree including vercel.json and 150 agent files', () => {
  const repoFiles = buildNoviceLabsRepoFiles();
  const agentFiles = repoFiles.filter((f) => f.category === 'Agent Specification');
  const deptFiles = repoFiles.filter((f) => f.category === 'Department Manifest');

  assert.equal(agentFiles.length, 150);
  assert.equal(deptFiles.length, 12);
  assert.ok(repoFiles.some((f) => f.path === 'README.md'));
  assert.ok(repoFiles.some((f) => f.path === 'vercel.json'));
  assert.ok(repoFiles.some((f) => f.path === 'studio.manifest.json'));

  const audioOrch = filterAgents({ departmentId: 'audio-music-sound', onlyOrchestrators: true });
  assert.equal(audioOrch.length, 1);
  assert.equal(audioOrch[0].id, 'NL-091');
  assert.equal(audioOrch[0].assignedModel, 'lyria-3-pro-preview');
});
