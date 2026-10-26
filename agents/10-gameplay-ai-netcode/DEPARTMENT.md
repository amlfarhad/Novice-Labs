# 10. Gameplay, AI Systems & Network Engineering

- **Department ID**: `gameplay-ai-netcode`
- **Team Orchestrator**: `NL-119` (`ORCH-GAME-10`)
- **Headcount**: 14 Agents
- **Allowed Model Array**: `gemini-4-argon`, `gemini-3.8-flash`
- **Orchestrator Model Policy**: Assigns gemini-4-argon to 13 Gameplay, GOAP AI, NavMesh, Server Netcode, and Serialization engineers; assigns gemini-3.8-flash strictly to NL-125 for sub-16ms client-side prediction tick delta verification.
- **Mandate**: Implements character movement controllers, ability execution machines, GOAP/behavior-tree AI agents, navmesh crowd steering, rollback/snapshot netcode, and save serialization.

## Roster (14 Agents)

| Agent ID | Codename | Name | Role | Assigned Model |
| :--- | :--- | :--- | :--- | :--- |
| `NL-119` | `GAMEPLAY-LEAD` | Damon Vance | Lead Gameplay Programmer & Gameplay Team Orchestrator **(Team Orchestrator)** | `gemini-4-argon` |
| `NL-120` | `KINEMATIC-CTRL` | Soren Lindholm | Character Controller & Swept-Capsule Movement Engineer | `gemini-4-argon` |
| `NL-121` | `ABILITY-GAS` | Kira Takahashi | Combat Hit-Detection & Gameplay Ability System (GAS) Engineer | `gemini-4-argon` |
| `NL-122` | `GOAP-TACTIC` | Dr. Aris Thorne | Behavior Tree, Utility AI & GOAP Runtime Programmer | `gemini-4-argon` |
| `NL-123` | `NAVMESH-RECAST` | Bram Lindqvist | NavMesh Generation, Dynamic Obstacles & Crowd Steering Engineer | `gemini-4-argon` |
| `NL-124` | `NET-AUTHORITY` | Marcus Vance-Chen | Dedicated Server, Snapshot Delta & Netcode Architect | `gemini-4-argon` |
| `NL-125` | `ROLLBACK-SYNC` | Elena Vance-Sato | Client-Side Prediction, Reconciliation & Lag Compensation Engineer | `gemini-3.8-flash` |
| `NL-126` | `SAVE-VAULT` | Henrik Solberg | Save System, Schema Migration & Deterministic Serialization Engineer | `gemini-4-argon` |
| `NL-127` | `QUEST-RUNTIME` | Mila Lindqvist | Quest State Machine, World-Flag & Dialogue Runtime Programmer | `gemini-4-argon` |
| `NL-128` | `LEDGER-BACKEND` | Darius Okafor | Inventory, Loot Generator & Economy Backend Programmer | `gemini-4-argon` |
| `NL-129` | `TETHER-FORCE` | Liam MacLeod | Physics Interaction, Telekinesis & Grapple Constraint Programmer | `gemini-4-argon` |
| `NL-130` | `FRUSTUM-GIMBAL` | Chloe Lindqvist | Camera System, Spring-Arm Collision & Lock-On Framing Programmer | `gemini-4-argon` |
| `NL-131` | `SANDBOX-MOD` | Dr. Tobias Vance | Modding API, Lua/WASM Scripting Sandbox & Data-Table Loader Engineer | `gemini-4-argon` |
| `NL-132` | `BALLISTIC-ARC` | Enzo Moretti | Vehicle Raycast-Suspension & Projectile Ballistics Programmer | `gemini-4-argon` |
