# Multi-Scene Rotation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add three battle scenes that rotate automatically at the start of each wave.

**Architecture:** Store immutable scene definitions in `js/map.js`, let `GameMap` load a scene by wave index, and trigger the load from `Game._enterWave()`. Preserve player progression while clearing transient battle objects during a scene change.

**Tech Stack:** HTML5 Canvas, classic JavaScript, Python Playwright tests.

---

### Task 1: Define scene behavior with a failing test

**Files:**
- Modify: `test/e2e_test.py`

1. Assert that three scenes exist and wave 1 starts on the first scene.
2. Force wave completion and assert that wave 2 loads the second scene.
3. Assert score, lives, and player upgrades survive the transition while bullets and power-ups do not.
4. Run `python test/e2e_test.py` and confirm the new checks fail because scene metadata does not exist.

### Task 2: Add reusable scene definitions

**Files:**
- Modify: `js/map.js`

1. Replace the single map constant with three named scene definitions.
2. Add `GameMap.loadScene(index)` and expose the active scene metadata.
3. Preserve base-area carving and base-ring construction for every scene.
4. Validate every scene is 20 columns by 15 rows.

### Task 3: Rotate scenes with waves

**Files:**
- Modify: `js/game.js`

1. Load `index % sceneCount` in `_enterWave()`.
2. Clear bullets, power-ups, spawn warnings, and particles during a scene transition.
3. Preserve score, lives, star tier, and timed upgrades.
4. Add the scene name to the wave-transition overlay and HUD.

### Task 4: Verify the complete game

**Files:**
- Modify: `README.md`

1. Document automatic scene rotation.
2. Run `python test/e2e_test.py` and confirm all checks pass.
3. Run a focused browser smoke test for all three scene names and console errors.
4. Review `git diff` for unrelated changes.
