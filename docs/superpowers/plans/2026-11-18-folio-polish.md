# Fólio interface polish implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement in this session.

**Goal:** Refine all existing mobile and desktop surfaces without changing the lime accent or user workflows.
**Architecture:** Add a focused shared component stylesheet after folio.css, reuse local fonts and existing DOM/state. Include it in the embedded Page builder.
**Tech Stack:** Static HTML, CSS, JavaScript; Playwright browser QA.
**Spec:** docs/superpowers/specs/2026-11-18-folio-polish-design.md

## Global Constraints
- Preserve #e2ff3b, all media, IDs, style contracts and saved choices.
- Keep menus in document flow and the header fixed; retain keyboard visibility handling.
- Use the shared 12/14/16/20/28 scale and minimum 44 px targets.
- No new dependencies or API usage.

## Review Focus
- Long translated/Portuguese action labels must wrap inside padding.
- Narrow 320 px menus must show all categories, with alignment retained.
- Font preview artwork must keep its own typography.
- Focus and browser zoom must survive glass/animation changes.
- Page embed must use the same styles and remain below its size budget.

### Task 1: Shared component refinement
**Files:** style-atlas/dist/folio-components.css; index.html; style-atlas/records/build_page.py.
**Interfaces:** Consumes existing DOM classes and CSS accent/type tokens; produces a shared visual layer, no new state or API.
- [x] Capture baseline mobile/desktop screens and run baseline suite.
- [x] Add consistent padding, typography, icon sizes, neutral depth and limited transparency.
- [x] Inspect all visible states; verify long labels, reduced motion/transparency, no overflow and preserved choices.
- [x] Run existing mobile, alignment, header, keyboard, gallery and search checks; update only geometry expectations intentionally changed by larger padding.
- [ ] Commit source changes.

### Task 2: Integration and delivery
**Files:** package outputs, Page visualization, existing Sites mirror, manual primary-domain staging ZIP.
**Interfaces:** Consumes validated source, produces pinned packages and publication receipts.
- [ ] Run required checks and obtain a whole-branch review.
- [ ] Merge source, regenerate pinned installers, verify distribution.
- [ ] Publish mirror/Page and refresh the primary-domain staging package; try hosting access once.
- [ ] Record actual publication status and user-facing result.
