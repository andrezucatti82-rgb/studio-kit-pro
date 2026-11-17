# Modular Video Skills Implementation Plan

> For agentic workers: use superpowers:executing-plans to implement task by task. Skill application is checked with read-only subagent scenarios, as required by writing-skills.

**Goal:** Deliver one installable kit whose orchestrator routes precise site choices to focused video skills.

**Architecture:** Preserve the existing plugin IDs and runtime. Add five specialist sources, a shared deterministic routing contract, generated portable references, complete installation and consistent exports.

**Tech Stack:** Node 22+, existing JavaScript/Remotion/FFmpeg, Python packager, Chromium QA.

**Spec:** `docs/SKILL-SYSTEM-2.12.md`.

## Global Constraints

- Candidate 2.12.0; catalog 4.6; 1,220 styles/60 presenter directions/17 sectors.
- Update draft PR #20 only; no merge/deploy or paid external generation.
- Preserve original media, selected contributions/scopes, continuity and real approval evidence.
- Only the six kit skill IDs are modified/installed; external/personal skills remain separate.

## Review Focus

- Palette-only presenter references must not require presenter assets or activate avatar generation.
- Mixed advertisements/presenters must retain both roles and every selected scope.
- Legacy requests must import; supplied routing metadata cannot override computed routing.
- Fresh installers/packages must resolve all shared references and preserve unrelated skills.
- Chat-only handoffs and the brief-section URL must accurately expose next actions and execution limits.

## Tasks

- [x] Run baseline application scenarios against the current monolithic skill; identify routing/distribution gaps.
- [x] For each specialist, author the smallest role contract and check it with a read-only application scenario before the next specialist.
- [x] Add failing route/export/import tests; implement `AtlasSkillRouting.route(choice)` shared by browser and Node.
- [x] Convert `video-multimarcas` to a coordinator with concrete inputs, routing, handoff and continuity.
- [x] Add fresh-install and archive-reference tests; update installer, packager, plugin metadata, project bridges and doctor.
- [x] Integrate routing and readable intent summary in prompt, JSON, Page and site briefing; test real downloads and hash navigation.
- [x] Synchronize installation/version docs, prompts and packages; run typecheck, complete tests, validator and browser QA.
- [x] Prepare the verified changes/evidence for commit/push and PR #20 review; merge/deploy remain excluded.
