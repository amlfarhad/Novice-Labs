import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_STUDIO_AGENTS,
  buildNoviceLabsRepoFiles,
  filterAgents,
  generateStudioSprintReport,
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

  // Verify majority of studio uses flagship gemini-4-argon
  assert.ok(
    summary.modelDistribution['gemini-4-argon'] >= 120,
    `Expected >= 120 agents on gemini-4-argon, got ${summary.modelDistribution['gemini-4-argon']}`
  );

  // Verify Google Lyria models are assigned to Audio/Music agents
  assert.equal(summary.modelDistribution['lyria-3-pro-preview'], 3);
  assert.equal(summary.modelDistribution['lyria-3-clip-preview'], 4);
  assert.equal(summary.modelDistribution['gemini-3.8-flash-tts'], 1);

  // Verify gemini-3.8-flash is restricted strictly to the 9 sub-second speed-critical agents
  assert.equal(summary.modelDistribution['gemini-3.8-flash'], 9);

  const validModelIds = new Set(STUDIO_MODEL_ARRAY.map((m) => m.id));
  for (const agent of ALL_STUDIO_AGENTS) {
    assert.ok(validModelIds.has(agent.assignedModel));
    assert.ok(agent.modelSelectionReason.length > 20);
    assert.ok(agent.identityMandate.includes(agent.id));
  }
});

test('Batman: The Long Halloween Studio Sprint Report decomposes across all 12 teams and 150 agents', () => {
  const report = generateStudioSprintReport();
  assert.equal(report.totalAgentsDeployed, 150);
  assert.equal(report.departments.length, 12);

  const totalContribs = report.departments.reduce(
    (sum, d) => sum + d.agentContributions.length,
    0
  );
  assert.equal(totalContribs, 150);
  assert.ok(report.departments[0].concreteArtifactContent.includes('Sole Playable'));
  assert.ok(report.departments[5].concreteArtifactContent.includes('2.5D'));
  assert.ok(report.departments[8].concreteArtifactContent.includes('WebRTC'));
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
  assert.ok(repoFiles.some((f) => f.path === 'src/orchestrator/studioRunner.ts'));

  const audioOrch = filterAgents({ departmentId: 'audio-music-sound', onlyOrchestrators: true });
  assert.equal(audioOrch.length, 1);
  assert.equal(audioOrch[0].id, 'NL-091');
  assert.equal(audioOrch[0].assignedModel, 'lyria-3-pro-preview');
});
