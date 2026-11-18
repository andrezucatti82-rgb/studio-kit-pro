# Free VFX Toolchain Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Install and verify the free VFX tools, expose one coherent local workflow and distribute installation through the existing Studio Kit Pro bootstrap.

**Architecture:** Keep one public coordinator and seven internal modules. A portable manifest plus standard-library Python runner owns discovery, installation, tests and free execution; the existing Node bootstrap invokes it. The site keeps its current UI and consumes the updated installation metadata.

**Tech Stack:** Node 22+, Python 3.10+, FFmpeg, Blender, MLT, OS package managers, isolated Python/AI repositories.

**Spec:** docs/superpowers/specs/2026-11-18-free-vfx-toolchain-design.md

## Global Constraints

- Only genuinely free software/models; no paid APIs, subscriptions, trials or non-commercial-only tools.
- Preserve one public `video-multimarcas` entry, all seven internal modules and current interface updates from the concurrent session.
- The installer is `packaging/installer/setup-studio.mjs`; extend it rather than adding a competing bootstrap.
- Installed is distinct from smoke/inference passed; missing GPU must never become a false success.
- Existing Remotion is optional and its commercial terms are not labelled universally free; the new free execution uses FFmpeg/Blender/Python.
- Source commit first; generated downloads second with sourceReady true. Preserve all existing audiences and identities.

## Review Focus

- Unknown tool/profile/operation must fail before downloads or processes.
- Spaces/non-ASCII paths and existing outputs must not corrupt commands or overwrite originals.
- Unsupported OS, unavailable package manager or hardware must remain explicit blocked states.
- A diagnostic report from this machine must not be treated as the visitor's capabilities.
- Current remote interface changes must survive merge and publication.

## Task 1: Free registry, doctor and real local execution

Files: tools/free-vfx/manifest.json, tools/free-vfx/toolchain.py, tests/free-tools.test.mjs, scripts/free-tools.mjs.
Interfaces: Python CLI `plan|doctor|install|smoke|run`, `--root`, `--profile base|automation|ai|all-free`, `--tool ID`; JSON reports. `run --operation filter|matte|interpolate|upscale` uses validated args and explicit output.
- [x] Add failing behavioral tests: reject paid/unknown selections; plan only chooses requested free tools; missing binaries are missing; a real FFmpeg transform decodes and refuses existing output; JSON report cannot claim review approval.
- [x] Run tests, implement registry/runner, rerun to green.
- [x] Commit independently usable CLI.

## Task 2: Installation and evidence

Files: runner installation adapters, tools/free-vfx/requirements.txt, tests/free-tools.test.mjs, docs/vfx/free-toolchain-verification.json.
Interfaces: install reports per-tool states; native managers or Linux user extraction, isolated venv and source commits, model files retained under .studio-tools.
- [x] Test dry plan leaves filesystem unchanged, invalid source/command cannot escape allowlist, unsupported platform yields blocker.
- [x] Implement install sources with license terms; preserve existing installations; install compatible missing tools in current Linux environment.
- [x] Run technical smoke and actual AI inference where supported; retain failed and passed evidence without disguising hardware/model limitations.
- [x] Commit installer and sanitized evidence, never binaries/models/secrets.

## Task 3: Coordinator and package integration

Files: packaging/installer/setup-studio.mjs, scripts/package-skill.py, scripts/package-installer.py, package.json, relevant coordinator/modules/docs/manifests.
Interfaces: bootstrap `--free-tools base|all-free|none`; default all-free with honest partial-toolchain status; manifest and runner ship in runtime; one coordinator entry.
- [x] Add tests for option parsing/profile propagation, report separation, archive inclusion and canonical discovery invariants.
- [x] Implement bootstrap/doctor integration and free-only prompts, update portable references and existing package metadata.
- [x] Test targeted checks and complete npm test/check/validate suite; commit source.

## Task 4: Integration and release

Files: distribution artifacts and installation metadata, docs/free-vfx delivery receipt; existing site hosting source after obtaining its current revision.
- [x] Read latest remote main; merge only necessary changes, preserve concurrent UI. Re-run affected tests if merge changes source.
- [x] Commit clean source, regenerate existing packages/installer with fixed source SHA, verify hashes and sourceReady, commit distributions.
- [x] Push feature branch and integrate authorized GitHub update without force; repin merged source if necessary.
- [x] Publish exact latest main artifacts to authorized destinations, preserving site source/audience. Update existing private plugin and local installs. Verify readbacks or record concrete blockers.
- [x] Obtain fresh branch review, resolve important issues with reproducing tests, report exact installed/new/blocked states and publication URLs.
