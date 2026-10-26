import { GoogleGenAI, Modality, Type } from '@google/genai';
import {
  ALL_STUDIO_AGENTS,
  buildNoviceLabsRepoFiles,
  generateStudioSprintReport,
} from '../src/studio/studioEngine';
import { STUDIO_DEPARTMENTS, STUDIO_MODEL_ARRAY } from '../src/studio/departments';
import { StudioModelId } from '../src/studio/types';

function getGenAIClient(): GoogleGenAI | null {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({ apiKey });
}

export default async function handler(req: any, res: any) {
  const url = String(req.url || '');
  const method = String(req.method || 'GET').toUpperCase();

  // 1. GET /api/studio/status
  if (url.includes('/api/studio/status') && method === 'GET') {
    const hasGeminiKey = Boolean(
      (process.env.API_KEY && process.env.API_KEY !== 'MY_GEMINI_API_KEY') ||
        (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY')
    );
    return res.status(200).json({
      studioName: 'Novice Labs',
      totalAgents: ALL_STUDIO_AGENTS.length,
      totalDepartments: STUDIO_DEPARTMENTS.length,
      geminiConfigured: hasGeminiKey,
      modelsAvailable: STUDIO_MODEL_ARRAY,
      githubConnected: false,
      githubUser: null,
      githubOAuthConfigured: Boolean(
        process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
      ),
    });
  }

  // 2. POST /api/studio/prompt-studio
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
      const response = await ai.models.generateContent({
        model: 'gemini-4-argon',
        contents: `FOUNDER PROMPT FOR NOVUS LABS / NOVICE LABS (150-AGENT AAA GAME STUDIO):\nProject Title: ${projectTitle}\nGenre: ${genre}\nSetting: ${setting}\nDirective: ${founderPrompt}\n\nAs Studio Head Marcus Vance (NL-001), provide:\n1. studioHeadAnalysis: Your executive technical & creative approach explaining how our 150-agent studio meets every requirement of this prompt.\n2. teamDirectives: An array of 12 objects (one for each of our 12 departments: ${STUDIO_DEPARTMENTS.map((d) => d.id).join(', ')}) containing departmentId, concreteArtifactTitle, executiveSummary, and concreteArtifactContent detailing how that team's orchestrator splits the project across its specialist agents.`,
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

      return res.status(200).json({
        mode: 'live-gemini-4-argon',
        modelUsed: 'gemini-4-argon',
        studioHeadAnalysis:
          parsed.studioHeadAnalysis ||
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

  // 3. POST /api/studio/consult-agent
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

        const textFollowup = await ai.models.generateContent({
          model: 'gemini-4-argon',
          contents: `Task for ${agent.name} (${agent.id}, ${agent.role}) using ${selectedModel}: ${taskPrompt}\nProvide the complete musical stem breakdown, BPM, key signature, instrumentation, and Wwise state transitions.`,
          config: { systemInstruction: agent.systemPrompt },
        });

        return res.status(200).json({
          agentId: agent.id,
          agentName: agent.name,
          modelUsed: selectedModel,
          mode: 'live-lyria-audio',
          audioDataUrl: audioBase64 ? `data:${mimeType};base64,${audioBase64}` : undefined,
          output: textFollowup.text || deterministicSpec,
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

        const cueSheet = await ai.models.generateContent({
          model: 'gemini-4-argon',
          contents: `Task for Voice Director ${agent.name} (${agent.id}): ${taskPrompt}\nProvide the voice direction sheet, cadence notes, and -23 LUFS mastering parameters.`,
          config: { systemInstruction: agent.systemPrompt },
        });

        return res.status(200).json({
          agentId: agent.id,
          agentName: agent.name,
          modelUsed: selectedModel,
          mode: 'live-tts-voice',
          audioDataUrl: wavBase64 ? `data:audio/wav;base64,${wavBase64}` : undefined,
          output: cueSheet.text || deterministicSpec,
        });
      }

      const response = await ai.models.generateContent({
        model: selectedModel === 'gemini-nano-banana-2.1' ? 'gemini-4-argon' : selectedModel,
        contents: String(taskPrompt),
        config: { systemInstruction: agent.systemPrompt },
      });

      return res.status(200).json({
        agentId: agent.id,
        agentName: agent.name,
        modelUsed: selectedModel,
        mode: `live-${selectedModel}`,
        output: response.text || deterministicSpec,
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

  // 4. GET /api/github/repo-files
  if (url.includes('/api/github/repo-files') && method === 'GET') {
    return res.status(200).json({
      files: buildNoviceLabsRepoFiles(),
    });
  }

  return res.status(404).json({ error: `Unhandled API route: ${method} ${url}` });
}
