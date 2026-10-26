import { GoogleGenAI, Modality, Type } from '@google/genai';
import {
  ALL_STUDIO_AGENTS,
  buildNoviceLabsRepoFiles,
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
      sourceComicMounted: '/assets/aistudio/Batman_-_The_Long_Halloween_Deluxe_Edition__under_100_MB__b993ad16.pdf',
      sourceComicPages: 386,
    });
  }

  // 2. POST /api/studio/prompt-studio (Live Studio Head NL-001 Decomposition on gemini-4-argon)
  if (url.includes('/api/studio/prompt-studio') && method === 'POST') {
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
Mounted Source Comic Asset: /assets/aistudio/Batman_-_The_Long_Halloween_Deluxe_Edition__under_100_MB__b993ad16.pdf (386 pages)
Founder Directive: ${founderPrompt}

As Studio Head Marcus Vance (NL-001) with Creative Director Elena Rostova (NL-002), write a concrete 4-5 sentence executive architectural charter explaining how our 12 Department Team Orchestrators and 150 specialist agents will build this full AAA game from scratch—covering the 13-Chapter comic adaptation, 2.5D motion-graphics comic-panel cutscenes pulled from the mounted PDF, the sourced 90k-polygon Batman rig + custom collector-grade Tim Sale cast, and the wasm64 + pthreads + WebGPU (WGSL) + 4KB Chunked OPFS Virtual File System + Cloud RTX streaming architecture.`,
        config: {
          systemInstruction: ALL_STUDIO_AGENTS[0].systemPrompt,
        },
      });

      return res.status(200).json({
        mode: `live-${modelUsed}`,
        modelUsed,
        studioHeadAnalysis: text,
      });
    } catch (err: any) {
      return res.status(500).json({
        error: `Studio Head NL-001 execution error: ${err?.message || 'Unknown error'}`,
      });
    }
  }

  // 3. POST /api/studio/execute-department (100% Live Per-Department Orchestration & Asset/Chapter Authoring)
  if (url.includes('/api/studio/execute-department') && method === 'POST') {
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
      return res.status(500).json({
        error: 'GEMINI_API_KEY is not configured.',
      });
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
Mounted Source Comic PDF: /assets/aistudio/Batman_-_The_Long_Halloween_Deluxe_Edition__under_100_MB__b993ad16.pdf (386 pages, Chapters I through XIII)
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
5. generatedThreeDAsset: A 3D character/environment/prop asset spec authored or conditioned by this department (assetId, assetName, category, targetTriangleBudget, formatSpec, textureMaps, pipelineStatus).
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

      return res.status(200).json({
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
  }

  // 4. POST /api/studio/steer (Live Founder Interjection & Course-Correction)
  if (url.includes('/api/studio/steer') && method === 'POST') {
    const {
      targetScope = 'studio',
      departmentId = 'executive-production',
      agentId = 'NL-001',
      steeringPrompt = '',
      projectTitle = '',
    } = req.body || {};

    if (!String(steeringPrompt).trim()) {
      return res.status(400).json({
        error: 'Please enter a steering directive to course-correct the studio.',
      });
    }

    const deptSpec =
      STUDIO_DEPARTMENTS.find((d) => d.id === (departmentId as DepartmentId)) ||
      STUDIO_DEPARTMENTS[0];
    const targetAgent =
      ALL_STUDIO_AGENTS.find((a) => a.id === agentId) || ALL_STUDIO_AGENTS[0];

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
          systemInstruction: leadAgentSystemPrompt(deptSpec.leadAgentId),
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

        return res.status(200).json({
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

        return res.status(200).json({
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

      return res.status(200).json({
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
  }

  // 6. POST /api/studio/cloud-frame (Live Cloud GPU RTX UE5.5 Frame Synthesis via gemini-nano-banana-2.1)
  if (url.includes('/api/studio/cloud-frame') && method === 'POST') {
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
          return res.status(200).json({
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
  }

  // 7. GET /api/github/repo-files
  if (url.includes('/api/github/repo-files') && method === 'GET') {
    return res.status(200).json({
      files: buildNoviceLabsRepoFiles(),
    });
  }

  return res.status(404).json({ error: `Unhandled API route: ${method} ${url}` });
}

function leadAgentSystemPrompt(agentId: string): string {
  const found = ALL_STUDIO_AGENTS.find((a) => a.id === agentId);
  return found ? found.systemPrompt : ALL_STUDIO_AGENTS[0].systemPrompt;
}
