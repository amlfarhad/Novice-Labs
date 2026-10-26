# Novice Labs — 150-Agent Autonomous AAA Game Studio

**Novice Labs** is a full-scale agentic AAA game studio architecture comprising **150 specialized autonomous agents** organized across **12 core game development departments**, governed by a **3-Tier Hierarchical Orchestrator** (Studio Head -> 12 Department Team Orchestrators -> 150 Specialist Employees) and a **Multi-Model Array** using a single unified `GEMINI_API_KEY`.

## Multi-Model Array & Zero Cost-Cutting Policy

Each Department's **Team Orchestrator** dynamically assigns models from the Novice Labs Model Array strictly according to capability and modality—**never downgrading to smaller models for cost**:

| Model ID | Modality | Team Orchestrator Assignment Rule |
| :--- | :--- | :--- |
| `gemini-4-argon` | Flagship Deep Reasoning & Code | Assigned to Studio Head, all 12 Team Orchestrators, Systems Architects, Level Designers, Engine/Gameplay Programmers, Screenwriters & QA Analysts (~84% of studio). |
| `lyria-3-pro-preview` | Full-Length Music Score (Audio) | Assigned by Audio Team Orchestrator (`NL-091`) for full orchestral scores, noir jazz themes & multi-layer adaptive combat stems. |
| `lyria-3-clip-preview` | 30s Musical Stingers & Beds | Assigned by Audio Team Orchestrator (`NL-091`) for combat stingers, discovery fanfares & biome soundscapes. |
| `gemini-3.8-flash-tts` | Expressive Multi-Speaker Voice | Assigned to Voice Direction & Dialogue Mastering (`NL-097`) for character voice synthesis. |
| `gemini-nano-banana-2.1` | 4K Concept & Turnaround LookDev | Assigned to Concept Art (`NL-058`), Hero/Creature Sculptors (`NL-040`, `NL-041`) & PBR Material LookDev (`NL-054`). |
| `gemini-3.8-flash` | Sub-Second Real-Time Speed ONLY | Strictly reserved ONLY for tasks requiring sub-second real-time speed (e.g., live packet routing, 120Hz reticle updates, ping probes). |

## Studio Headcount Breakdown (150 Agents Across 12 Departments)

| # | Department | Lead / Team Orchestrator | Headcount | Folder Path |
| :- | :--- | :--- | :---: | :--- |
| 01 | **Executive Direction & Studio Production** | `NL-001` (ORCH-EXEC-01) | **10** | `agents/01-executive-production/` |
| 02 | **Game Systems & Mechanics Design** | `NL-011` (ORCH-SYS-02) | **14** | `agents/02-game-systems-design/` |
| 03 | **Level Design & World Building** | `NL-025` (ORCH-LVL-03) | **14** | `agents/03-level-world-design/` |
| 04 | **Character Design, Sculpting & Rigging** | `NL-039` (ORCH-CHAR-04) | **12** | `agents/04-character-design-rigging/` |
| 05 | **Environment, Concept & 3D Asset Pipeline** | `NL-051` (ORCH-ENV3D-05) | **16** | `agents/05-environment-3d-art/` |
| 06 | **Narrative, World Lore & Cinematics** | `NL-067` (ORCH-NARR-06) | **12** | `agents/06-narrative-cinematics/` |
| 07 | **Animation, Motion Capture & Kinematics** | `NL-079` (ORCH-ANIM-07) | **12** | `agents/07-animation-mocap/` |
| 08 | **Audio, Adaptive Music & Sound Design** | `NL-091` (ORCH-AUDIO-08) | **12** | `agents/08-audio-music-sound/` |
| 09 | **Core Engine, Rendering & Pipeline Tools** | `NL-103` (ORCH-ENG-09) | **16** | `agents/09-engine-rendering-tools/` |
| 10 | **Gameplay, AI Systems & Network Engineering** | `NL-119` (ORCH-GAME-10) | **14** | `agents/10-gameplay-ai-netcode/` |
| 11 | **UI/UX Architecture, HUD & Technical Art** | `NL-133` (ORCH-UIUX-11) | **10** | `agents/11-ui-ux-tech-art/` |
| 12 | **Quality Assurance, Telemetry & LiveOps** | `NL-143` (ORCH-QA-12) | **8** | `agents/12-qa-playtest-liveops/` |
| | **TOTAL STUDIO ROSTER** | **12 Team Orchestrators** | **150 Agents** | `agents/` |

## 1-Click Vercel Deployment

This repository contains **both** the complete runnable **React 19 + Vite + TypeScript + Serverless API Web Application** (`src/`, `api/index.ts`, `package.json`, `vercel.json`) and all **150 Autonomous Agent Markdown Specifications** (`agents/`) and **12 Department Manifests** (`departments/`).

1. Import this repository (`Novice-Labs`) at **[vercel.com/new](https://vercel.com/new)**.
2. Add your `GEMINI_API_KEY` in Vercel **Environment Variables** (used across `gemini-4-argon`, `lyria-3-pro-preview`, `lyria-3-clip-preview`, `gemini-3.8-flash-tts`, `gemini-nano-banana-2.1`, and `gemini-3.8-flash`).
3. Click **Deploy** — Vercel automatically builds the Vite frontend (`npm run build` -> `dist/`) and mounts the serverless studio orchestrator at `/api/*`.

## Featured Production Directive: *Batman: The Long Halloween* (Cloud-Streamed AAA)

- **Playable Scope**: Strictly **Batman** as sole playable character across all 13 Holiday Chapters (*Crime* through *Punishment*), combining deep Noir Detective forensics with next-gen *Batman: Arkham* Freeflow v4 combat, Predator stealth, and Grapnel-Boost-to-Cape-Glide traversal.
- **2.5D Comic-Panel Cutscenes**: Authentic Tim Sale high-contrast noir comic panels flipping and layering in 2.5D parallax space (zero AI video slop).
- **Collector-Grade 3D Character Pipeline & Cel-Shaded LookDev**: Internet-sourced 92k-triangle AAA Batman 3D rig (`NL-059`, `NL-110`) + collector-grade 82k–88k triangle custom 3D sculpts for Harvey Dent/Two-Face, Carmine Falcone, Catwoman, Calendar Man, Gordon, and the Rogue Gallery (`NL-039`..`NL-050`), unified under a custom Stylized Cel-Shaded Chiaroscuro & Sumi-Ink BRDF (`NL-057`, `NL-074`, `NL-104`).
- **Cloud-Cached Native AAA Browser Streaming**: Native C++20/Vulkan/UE5 build with 92% pre-warmed cloud NVMe pakchunk caches streamed to the browser via WebRTC (zero Three.js).
