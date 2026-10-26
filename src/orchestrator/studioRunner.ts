/**
 * Novice Labs — 150-Agent Hierarchical Multi-Model Orchestrator
 * Studio Head (NL-001) -> 12 Department Team Orchestrators -> 150 Specialist Agents
 * Uses a single unified process.env.GEMINI_API_KEY across:
 * - gemini-4-argon (Flagship Deep Reasoning & Architecture - Zero Cost-Cutting Policy)
 * - lyria-3-pro-preview & lyria-3-clip-preview (Google Lyria Music & Stingers)
 * - gemini-3.8-flash-tts (Multi-Speaker Voice Synthesis)
 * - gemini-nano-banana-2.1 (4K Turnaround & PBR LookDev)
 * - gemini-3.8-flash (Strictly reserved ONLY for sub-second speed tasks)
 */
import { GoogleGenAI } from "@google/genai";
import manifest from "../../studio.manifest.json";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: { headers: { "User-Agent": "aistudio-build" } },
});

export async function dispatchToStudioHeadAndTeams(founderPrompt: string) {
  // 1. Studio Head (NL-001 Marcus Vance) decomposes prompt into 12 Team Charters using gemini-4-argon
  const studioHeadResponse = await ai.models.generateContent({
    model: "gemini-4-argon",
    contents: founderPrompt,
    config: {
      systemInstruction:
        "You are Marcus Vance (NL-001), Studio Head of Novice Labs. Decompose the Founder's game directive into 12 concrete Department Charters for our 12 Team Orchestrators covering all 150 agents.",
    },
  });

  return {
    studioHeadId: "NL-001",
    modelUsed: "gemini-4-argon",
    charterPlan: studioHeadResponse.text,
    totalAgentsActivated: manifest.totalAgents,
  };
}
