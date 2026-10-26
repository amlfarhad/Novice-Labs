import { GoogleGenAI, Modality, Type } from '@google/genai';
import {
  ALL_STUDIO_AGENTS,
  buildNoviceLabsRepoFiles,
  generateStudioSprintReport,
} from '../src/studio/studioEngine';
import { STUDIO_DEPARTMENTS, STUDIO_MODEL_ARRAY } from '../src/studio/departments';
import { DepartmentId, StudioModelId } from '../src/studio/types';

function getGenAIClient(): GoogleGenAI | null {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.API_KEY ||
    process.env.VITE_GEMINI_API_KEY;
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
  params: {
    preferredModel?: string;
    contents: any;
    config?: any;
  }
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

export default async function handler(req: any, res: any) {
  const url = String(req.url || '');
  const method = String(req.method || 'GET').toUpperCase();

  // 1. GET /api/studio/status
  if (url.includes('/api/studio/status') && method === 'GET') {
    const hasGeminiKey = Boolean(getGenAIClient());
    return res.status(200).json({
      studioName: 'Novice Labs',
      totalAgents: ALL_STUDIO_AGENTS.length,
      totalDepartments: STUDIO_DEPARTMENTS.length,
      geminiConfigured: hasGeminiKey,
      modelsAvailable: STUDIO_MODEL_ARRAY,
    });
  }

  // 2. POST /api/studio/execute-department (Fast Live Per-Department Orchestration + Agent Logs)
  if (url.includes('/api/studio/execute-department') && method === 'POST') {
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
      return res.status(200).json({
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

      return res.status(200).json({
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
      return res.status(200).json({
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
  }

  // 3. POST /api/studio/steer (Live Founder Interjection & Course-Correction)
  if (url.includes('/api/studio/steer') && method === 'POST') {
    const {
      targetScope = 'studio',
      departmentId = 'executive-production',
      agentId = 'NL-001',
      steeringPrompt = '',
      projectTitle = 'Batman: The Long Halloween (Cloud-Streamed AAA Noir Detective Action)',
    } = req.body || {};

    if (!String(steeringPrompt).trim()) {
      return res.status(400).json({ error: 'Please enter a steering directive to course-correct the studio.' });
    }

    const deptSpec =
      STUDIO_DEPARTMENTS.find((d) => d.id === (departmentId as DepartmentId)) ||
      STUDIO_DEPARTMENTS[0];
    const targetAgent =
      ALL_STUDIO_AGENTS.find((a) => a.id === agentId) || ALL_STUDIO_AGENTS[0];

    const ai = getGenAIClient();
    if (!ai) {
      return res.status(200).json({
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
      return res.status(200).json({
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
      return res.status(200).json({
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
  }

  // 4. POST /api/studio/prompt-studio
  if (url.includes('/api/studio/prompt-studio') && method === 'POST') {
    const {
      projectTitle = 'Batman: The Long Halloween (Cloud-Streamed AAA Arkham-Successor Noir Detective)',
      genre = 'Noir Detective Mystery & Next-Gen Arkham-Successor Action (Batman Sole Playable)',
      setting = 'Year-One Gothic Gotham City · Living Graphic-Novel Cel-Shaded Noir · 13 Holiday Chapters',
      founderPrompt = '',
    } = req.body || {};

    const baseReport = generateStudioSprintReport(projectTitle, genre, setting);
    const ai = getGenAIClient();

    if (!ai || !String(founderPrompt).trim()) {
      return res.status(200).json({
        mode: 'deterministic-blueprint',
        modelUsed: 'gemini-4-argon',
        studioHeadAnalysis:
          'Studio Head Marcus Vance (NL-001) decomposed the directive across all 12 Department Team Orchestrators and 150 specialist agents.',
        report: baseReport,
      });
    }

    try {
      const { text, modelUsed } = await generateWithArgonFallback(ai, {
        preferredModel: 'gemini-4-argon',
        contents: `FOUNDER PROMPT FOR NOVICE LABS (150-AGENT AAA GAME STUDIO):\nProject Title: ${projectTitle}\nGenre: ${genre}\nSetting: ${setting}\nDirective: ${founderPrompt}\n\nAs Studio Head Marcus Vance (NL-001), provide a concise 3-4 sentence executive technical & creative approach explaining how our 12 Team Orchestrators and 150 specialist agents will execute this directive.`,
      });

      return res.status(200).json({
        mode: `live-${modelUsed}`,
        modelUsed,
        studioHeadAnalysis:
          text ||
          'Studio Head Marcus Vance (NL-001) decomposed your directive across all 12 Team Orchestrators and 150 agents.',
        report: baseReport,
      });
    } catch (err: any) {
      return res.status(200).json({
        mode: 'deterministic-fallback',
        modelUsed: 'gemini-4-argon',
        warning: err?.message || 'Used deterministic studio charter blueprint.',
        studioHeadAnalysis:
          'Studio Head Marcus Vance (NL-001) decomposed the directive across all 12 Team Orchestrators and 150 specialist agents using the studio architecture blueprint.',
        report: baseReport,
      });
    }
  }

  // 5. POST /api/studio/consult-agent
  if (url.includes('/api/studio/consult-agent') && method === 'POST') {
    const { agentId, taskPrompt, modelOverride } = req.body || {};
    const agent = ALL_STUDIO_AGENTS.find((a) => a.id === agentId);
    if (!agent) {
      return res.status(404).json({ error: `Agent ${agentId} not found in studio roster.` });
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
      return res.status(200).json({
        agentId: agent.id,
        agentName: agent.name,
        modelUsed: selectedModel,
        mode: 'studio-simulation',
        output: deterministicSpec,
      });
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
        } catch (_e) {
          // Continue with written score breakdown
        }

        const { text: followupText } = await generateWithArgonFallback(ai, {
          preferredModel: 'gemini-4-argon',
          contents: `Task for ${agent.name} (${agent.id}, ${agent.role}) using ${selectedModel}: ${taskPrompt}\nProvide the complete musical stem breakdown, BPM, key signature, instrumentation, and Wwise state transitions.`,
          config: { systemInstruction: agent.systemPrompt },
        });

        return res.status(200).json({
          agentId: agent.id,
          agentName: agent.name,
          modelUsed: selectedModel,
          mode: 'live-lyria-audio',
          audioDataUrl: audioBase64 ? `data:${mimeType};base64,${audioBase64}` : undefined,
          output: followupText || deterministicSpec,
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
        } catch (_e) {
          // Continue with text cue sheet
        }

        const { text: cueText } = await generateWithArgonFallback(ai, {
          preferredModel: 'gemini-4-argon',
          contents: `Task for Voice Director ${agent.name} (${agent.id}): ${taskPrompt}\nProvide the voice direction sheet, cadence notes, and -23 LUFS mastering parameters.`,
          config: { systemInstruction: agent.systemPrompt },
        });

        return res.status(200).json({
          agentId: agent.id,
          agentName: agent.name,
          modelUsed: selectedModel,
          mode: 'live-tts-voice',
          audioDataUrl: wavBase64 ? `data:audio/wav;base64,${wavBase64}` : undefined,
          output: cueText || deterministicSpec,
        });
      }

      const { text, modelUsed } = await generateWithArgonFallback(ai, {
        preferredModel: selectedModel === 'gemini-nano-banana-2.1' ? 'gemini-4-argon' : selectedModel,
        contents: String(taskPrompt),
        config: { systemInstruction: agent.systemPrompt },
      });

      return res.status(200).json({
        agentId: agent.id,
        agentName: agent.name,
        modelUsed,
        mode: `live-${modelUsed}`,
        output: text || deterministicSpec,
      });
    } catch (err: any) {
      return res.status(200).json({
        agentId: agent.id,
        agentName: agent.name,
        modelUsed: selectedModel,
        mode: 'studio-simulation-fallback',
        warning: err?.message,
        output: deterministicSpec,
      });
    }
  }

  // 6. GET /api/github/repo-files
  if (url.includes('/api/github/repo-files') && method === 'GET') {
    return res.status(200).json({
      files: buildNoviceLabsRepoFiles(),
    });
  }

  return res.status(404).json({ error: `Unhandled API route: ${method} ${url}` });
}
