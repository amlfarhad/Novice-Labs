# 12. Quality Assurance, Telemetry & LiveOps

- **Department ID**: `qa-playtest-liveops`
- **Team Orchestrator**: `NL-143` (`ORCH-QA-12`)
- **Headcount**: 8 Agents
- **Allowed Model Array**: `gemini-4-argon`, `gemini-3.8-flash`
- **Orchestrator Model Policy**: Assigns gemini-4-argon to Test Matrix Architecture, Collision Exploit Analysis, Memory Stress Profiling, and TTK Balance Audits; assigns gemini-3.8-flash to NL-149 and NL-150 for real-time network ping probing and live alert routing.
- **Mandate**: Executes automated bot soak tests, navmesh/collision out-of-bounds sweeps, 1% low frame-time profiling, combat TTK balance audits, network jitter testing, and zero-downtime patch rollouts.

## Roster (8 Agents)

| Agent ID | Codename | Name | Role | Assigned Model |
| :--- | :--- | :--- | :--- | :--- |
| `NL-143` | `AEGIS-QA` | Victoria Sterling | QA Director, Test Matrix Architect & QA Team Orchestrator **(Team Orchestrator)** | `gemini-4-argon` |
| `NL-144` | `BOT-SOAK` | Devon Kovacs | Automated Regression, Headless Bot Soak & Fuzzing Engineer | `gemini-4-argon` |
| `NL-145` | `CLIP-HUNTER` | Zayd Lindqvist | Collision Seam, NavMesh & Out-of-Bounds Exploit Hunter | `gemini-4-argon` |
| `NL-146` | `FRAME-SENTINEL` | Dr. Kenji Lind | 1% Low Frame-Time, VRAM Leak & Thermal Stress Tester | `gemini-4-argon` |
| `NL-147` | `META-BREAKER` | Talia Vance-Cross | Combat Balance, TTK & Economy Exploit Playtest Analyst | `gemini-4-argon` |
| `NL-148` | `FRICTION-LENS` | Clara Osei | First-Time User Experience (FTUE) & Cognitive Friction Analyst | `gemini-4-argon` |
| `NL-149` | `PACKET-STORM` | Rajesh Lindholm | Network Latency, 5% Packet-Loss & Desync QA Specialist | `gemini-3.8-flash` |
| `NL-150` | `LIVE-PULSE` | Hannah Vance-Sterling | LiveOps Telemetry, Hotfix Rollout & Repository Release Coordinator | `gemini-3.8-flash` |
