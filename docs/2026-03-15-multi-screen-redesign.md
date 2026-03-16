# Drift Test Multi-Screen Redesign

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace single-screen drift-test with a 3-screen flow (warmup/test/done) that makes full use of the watch display in each phase.

**Architecture:** Use the climb-logger's `currentTemplate` + `unload('_cm')` pattern. Each phase gets its own HTML template with a focused layout. `evaluate()` handles time-based auto-transitions; `onLap()` handles manual warmup skip. Pause/start lifecycle callbacks prevent timer drift.

**Tech Stack:** SuuntoPlus JS runtime, setText() for dynamic text, `<eval>` with built-in outputFormats for numeric display.

**Resolves:** Issues #1 (multi-screen), #2 (lap hijack), #3 (pause), #4 (pre-start), #6 (unused outputs)

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `warmup.html` | Create | Warmup screen — countdown, HR, MAF, mode, skip hint |
| `test.html` | Create | Test screen — live drift %, status, HR, pace/watts, countdown |
| `done.html` | Create | Results screen — final drift, verdict, HR comparison |
| `main.js` | Rewrite | Multi-screen logic, lifecycle callbacks, setText() updates |
| `manifest.json` | Modify | Update template list, clean unused outputs |
| `main.html` | Delete | Replaced by 3 new templates |

## Outputs (manifest `out`)

Only outputs consumed by `<eval>` tags need to remain:

| Output | Used in | Format |
|--------|---------|--------|
| `countdown` | warmup.html, test.html | `Duration_FourdigitsFixed` |
| `mafDisplay` | warmup.html | raw number |

All other dynamic text (phase label, drift %, status, pace, HR averages) uses `setText()` from main.js.

---

## Chunk 1: HTML Templates

### Task 1: Create warmup.html

**Files:**
- Create: `drift-test/warmup.html`

Layout (top to bottom):
- Title "DRIFT TEST" + mode label (RUN/BIKE) via setText
- Hero countdown timer via `<eval>` Duration
- HR (live sensor) + MAF target side by side
- "LAP TO SKIP" hint at bottom

- [ ] **Step 1: Write warmup.html**

```html
<uiView>
  <div id="drifttest">

    <!-- Title + mode -->
    <div class="cm-fg" style="width:100%;height:16%">
      <div class="cm-mid" style="top:calc(35% - 50%e); left:calc(50% - 50%e); font-size: 12px;">DRIFT TEST</div>
      <div id="modeLabel" class="cm-mid" style="top:calc(75% - 50%e); left:calc(50% - 50%e); font-size: 14px;">RUNNING</div>
    </div>

    <!-- Countdown (hero) -->
    <div class="f-num" style="top:calc(38% - 50%e); left:calc(50% - 50%e); font-size: 56px;">
      <eval input="/Zapp/{zapp_index}/Output/countdown" outputFormat="Duration_FourdigitsFixed" default="--" />
    </div>
    <div class="cm-mid" style="top:calc(50% - 50%e); left:calc(50% - 50%e); font-size: 11px;">WARMUP</div>

    <!-- Separator -->
    <div class="cm-mid p-hc" style="top:58%;width:70%;height:1px;opacity:0.4"></div>

    <!-- HR + MAF side by side -->
    <div class="cm-mid" style="top:calc(63% - 50%e); left:calc(30% - 50%e); font-size: 11px;">HR</div>
    <div class="f-num" style="top:calc(71% - 50%e); left:calc(30% - 50%e); font-size: 28px;">
      <eval input="/Activity/Move/-1/Heartrate/Current" outputFormat="HeartRate_Fourdigits" default="--" />
    </div>

    <div class="cm-mid" style="top:calc(63% - 50%e); left:calc(70% - 50%e); font-size: 11px;">MAF</div>
    <div class="f-num" style="top:calc(71% - 50%e); left:calc(70% - 50%e); font-size: 28px;">
      <eval input="/Zapp/{zapp_index}/Output/mafDisplay" default="140" />
    </div>

    <!-- Skip hint -->
    <div class="cm-mid" style="top:calc(88% - 50%e); left:calc(50% - 50%e); font-size: 11px; opacity:0.5;">LAP TO SKIP</div>

  </div>
</uiView>
```

- [ ] **Step 2: Verify in simulator** — should show static layout with countdown and HR fields

---

### Task 2: Create test.html

**Files:**
- Create: `drift-test/test.html`

Layout: half label, drift % hero, status, HR + pace side by side, countdown at bottom.

- [ ] **Step 1: Write test.html**

```html
<uiView>
  <div id="drifttest">

    <!-- Half label -->
    <div class="cm-fg" style="width:100%;height:16%">
      <div class="cm-mid" style="top:calc(35% - 50%e); left:calc(50% - 50%e); font-size: 12px;">DRIFT TEST</div>
      <div id="halfLabel" class="cm-mid" style="top:calc(75% - 50%e); left:calc(50% - 50%e); font-size: 14px;">1st HALF</div>
    </div>

    <!-- Drift % (hero) -->
    <div id="driftVal" class="f-num" style="top:calc(34% - 50%e); left:calc(50% - 50%e); font-size: 52px;">--</div>
    <div class="cm-mid" style="top:calc(45% - 50%e); left:calc(50% - 50%e); font-size: 12px;">% DRIFT</div>

    <!-- Status -->
    <div id="statusLabel" style="top:calc(52% - 50%e); left:calc(50% - 50%e); font-size: 18px;">--</div>

    <!-- Separator -->
    <div class="cm-mid p-hc" style="top:59%;width:70%;height:1px;opacity:0.4"></div>

    <!-- Vertical separator -->
    <div class="cm-mid p-hc" style="top:61%;width:2px;height:14%;opacity:0.4"></div>

    <!-- HR + Pace/Watts -->
    <div class="cm-mid" style="top:calc(63% - 50%e); left:calc(26% - 50%e); font-size: 11px;">HR</div>
    <div class="f-num" style="top:calc(70% - 50%e); left:calc(26% - 50%e); font-size: 24px;">
      <eval input="/Activity/Move/-1/Heartrate/Current" outputFormat="HeartRate_Fourdigits" default="--" />
    </div>

    <div class="cm-mid" style="top:calc(63% - 50%e); left:calc(74% - 50%e); font-size: 11px;">PACE/W</div>
    <div id="efLabel" class="f-num" style="top:calc(70% - 50%e); left:calc(74% - 50%e); font-size: 24px;">--</div>

    <!-- Countdown -->
    <div class="cm-mid" style="top:calc(81% - 50%e); left:calc(50% - 50%e); font-size: 11px;">REMAINING</div>
    <div class="f-num" style="top:calc(88% - 50%e); left:calc(50% - 50%e); font-size: 18px;">
      <eval input="/Zapp/{zapp_index}/Output/countdown" outputFormat="Duration_FourdigitsFixed" default="--" />
    </div>

  </div>
</uiView>
```

- [ ] **Step 2: Verify in simulator** — static layout check

---

### Task 3: Create done.html

**Files:**
- Create: `drift-test/done.html`

Layout: verdict, drift % hero, HR 1st vs 2nd comparison.

- [ ] **Step 1: Write done.html**

```html
<uiView>
  <div id="drifttest">

    <!-- Title -->
    <div class="cm-fg" style="width:100%;height:16%">
      <div class="cm-mid" style="top:calc(35% - 50%e); left:calc(50% - 50%e); font-size: 12px;">DRIFT TEST</div>
      <div class="cm-mid" style="top:calc(75% - 50%e); left:calc(50% - 50%e); font-size: 14px;">COMPLETE</div>
    </div>

    <!-- Drift % (hero) -->
    <div id="driftFinal" class="f-num" style="top:calc(34% - 50%e); left:calc(50% - 50%e); font-size: 56px;">--</div>
    <div class="cm-mid" style="top:calc(46% - 50%e); left:calc(50% - 50%e); font-size: 12px;">% DRIFT</div>

    <!-- Verdict -->
    <div id="verdictLabel" style="top:calc(54% - 50%e); left:calc(50% - 50%e); font-size: 20px;">--</div>

    <!-- Separator -->
    <div class="cm-mid p-hc" style="top:62%;width:70%;height:1px;opacity:0.4"></div>

    <!-- HR 1st vs 2nd -->
    <div class="cm-mid" style="top:calc(67% - 50%e); left:calc(30% - 50%e); font-size: 10px;">AVG HR 1st</div>
    <div id="hr1Label" class="f-num" style="top:calc(75% - 50%e); left:calc(30% - 50%e); font-size: 24px;">--</div>

    <div class="cm-mid" style="top:calc(67% - 50%e); left:calc(70% - 50%e); font-size: 10px;">AVG HR 2nd</div>
    <div id="hr2Label" class="f-num" style="top:calc(75% - 50%e); left:calc(70% - 50%e); font-size: 24px;">--</div>

    <!-- EF change -->
    <div class="cm-mid" style="top:calc(86% - 50%e); left:calc(50% - 50%e); font-size: 11px; opacity:0.6;">
      AEROBIC BASE: <span id="baseLabel">--</span>
    </div>

  </div>
</uiView>
```

- [ ] **Step 2: Verify in simulator** — static layout check

---

## Chunk 2: main.js Rewrite

### Task 4: Rewrite main.js with multi-screen logic

**Files:**
- Rewrite: `drift-test/main.js`

Key changes from current code:
- `currentTemplate` variable + `getUserInterface()` returns it
- `onLap()` for warmup skip (no more `onEvent` + `<userInput>`)
- `onExerciseStart()` / `onExercisePause()` / `onExerciseContinue()` lifecycle
- Auto-transition via `unload('_cm')` when phase changes
- `setText()` for all dynamic labels per screen

- [ ] **Step 1: Write the new main.js**

```javascript
/**
 * Drift Test — Cardiac Decoupling (MFA Method)
 *
 * 3 screens: WARMUP → TEST → DONE
 * Compares pace:HR (or power:HR) efficiency factor between
 * first and second halves of a timed run/ride.
 * Drift >5% = aerobic base needs work.
 */

var currentTemplate = "warmup";

var testMode = 0;       // 0 = running (speed), 1 = cycling (power)
var warmupSec = 900;    // 15 min default
var halfwaySec = 2700;  // warmup + half test
var endSec = 4500;      // warmup + full test
var mafTarget = 140;

var totalSeconds = 0;
var exerciseStarted = 0;
var isPaused = 0;

// Phase: 0=WARMUP, 1=1st HALF, 2=2nd HALF, 3=DONE
var phase = 0;

// First half accumulators
var hrSum1 = 0;
var metricSum1 = 0;
var count1 = 0;

// Second half accumulators
var hrSum2 = 0;
var metricSum2 = 0;
var count2 = 0;

function getUserInterface() {
  return { template: currentTemplate };
}

function onLoad(_input, output) {
  var settings = localStorage.getObject("appSettings");
  if (settings) {
    testMode = settings.testMode || 0;
    var warmupMin = settings.warmupDuration || 15;
    var testMin = settings.testDuration || 60;
    mafTarget = settings.mafTarget || 140;

    warmupSec = warmupMin * 60;
    halfwaySec = warmupSec + testMin * 30;
    endSec = warmupSec + testMin * 60;
  }

  output.countdown = warmupSec;
  output.mafDisplay = mafTarget;
}

function onExerciseStart(_input, _output) {
  exerciseStarted = 1;
}

function onExercisePause(_input, _output) {
  isPaused = 1;
}

function onExerciseContinue(_input, _output) {
  isPaused = 0;
}

function onLap(_input, _output) {
  // Lap during warmup = skip to test
  if (phase === 0 && exerciseStarted) {
    totalSeconds = warmupSec;
  }
}

function evaluate(input, output) {
  if (!exerciseStarted || isPaused) {
    return;
  }

  totalSeconds++;

  // Read HR
  var hrRaw = input.Heartrate || 0;
  var hr = hrRaw * 60;

  // Read metric based on mode
  var metric;
  if (testMode === 1) {
    metric = input.Power || 0;
  } else {
    metric = input.Speed || 0;
  }

  // Determine phase
  var prevPhase = phase;

  if (totalSeconds < warmupSec) {
    phase = 0;
    output.countdown = warmupSec - totalSeconds;
  } else if (totalSeconds < halfwaySec) {
    phase = 1;
    output.countdown = endSec - totalSeconds;
    if (hr > 0 && metric > 0) {
      hrSum1 += hr;
      metricSum1 += metric;
      count1++;
    }
  } else if (totalSeconds < endSec) {
    phase = 2;
    output.countdown = endSec - totalSeconds;
    if (hr > 0 && metric > 0) {
      hrSum2 += hr;
      metricSum2 += metric;
      count2++;
    }
  } else {
    phase = 3;
    output.countdown = 0;
  }

  // Calculate drift
  var driftVal = -1;
  if (count1 > 0 && count2 > 0) {
    var ef1 = (metricSum1 / count1) / (hrSum1 / count1);
    var ef2 = (metricSum2 / count2) / (hrSum2 / count2);
    driftVal = ((ef1 - ef2) / ef1) * 100;
  }

  // Handle phase transitions
  if (prevPhase === 0 && phase >= 1) {
    currentTemplate = "test";
    unload('_cm');
    return;
  }
  if (prevPhase < 3 && phase === 3) {
    currentTemplate = "done";
    unload('_cm');
    return;
  }

  // Update screen via setText based on current template
  if (currentTemplate === "warmup") {
    setText("#modeLabel", testMode === 0 ? "RUNNING" : "CYCLING");
  } else if (currentTemplate === "test") {
    setText("#halfLabel", phase === 1 ? "1st HALF" : "2nd HALF");

    var driftText = driftVal < 0 ? "--" : driftVal.toFixed(1);
    setText("#driftVal", driftText);

    if (driftVal < 0) {
      setText("#statusLabel", "--");
    } else if (driftVal <= 5) {
      setText("#statusLabel", "GOOD");
    } else {
      setText("#statusLabel", "DRIFT!");
    }

    // Pace/Watts
    if (metric > 0 && testMode === 1) {
      setText("#efLabel", Math.round(metric) + "W");
    } else if (metric > 0.1 && testMode === 0) {
      var paceSec = Math.round(1000 / metric);
      var mins = Math.floor(paceSec / 60);
      var secs = paceSec % 60;
      setText("#efLabel", mins + ":" + (secs < 10 ? "0" : "") + secs);
    } else {
      setText("#efLabel", "--");
    }
  } else if (currentTemplate === "done") {
    var finalDrift = driftVal < 0 ? "--" : driftVal.toFixed(1);
    setText("#driftFinal", finalDrift);

    if (driftVal < 0) {
      setText("#verdictLabel", "NO DATA");
    } else if (driftVal <= 5) {
      setText("#verdictLabel", "GOOD");
    } else {
      setText("#verdictLabel", "DRIFT!");
    }

    if (count1 > 0) {
      setText("#hr1Label", Math.round(hrSum1 / count1));
    }
    if (count2 > 0) {
      setText("#hr2Label", Math.round(hrSum2 / count2));
    }

    if (driftVal >= 0) {
      setText("#baseLabel", driftVal <= 5 ? "SOLID" : "NEEDS WORK");
    }
  }

  output.mafDisplay = mafTarget;
}

function getSummaryOutputs(_input, _output) {
  var items = [];

  if (count1 > 0 && count2 > 0) {
    var ef1 = (metricSum1 / count1) / (hrSum1 / count1);
    var ef2 = (metricSum2 / count2) / (hrSum2 / count2);
    var drift = ((ef1 - ef2) / ef1) * 100;
    items.push({ id: "drift", name: "Drift", value: drift.toFixed(1) + "%" });
  }

  if (count1 > 0) {
    items.push({ id: "hr1", name: "Avg HR 1st", format: "HeartRate_Fourdigits", value: Math.round(hrSum1 / count1) });
  }

  if (count2 > 0) {
    items.push({ id: "hr2", name: "Avg HR 2nd", format: "HeartRate_Fourdigits", value: Math.round(hrSum2 / count2) });
  }

  return items;
}
```

- [ ] **Step 2: Commit** — `feat: rewrite main.js for multi-screen flow`

---

### Task 5: Update manifest.json

**Files:**
- Modify: `drift-test/manifest.json`

Changes:
- Template list: replace `main.html` with `warmup.html`, `test.html`, `done.html`
- Remove unused outputs: `phase`, `status`, `driftPct`, `efMetric`
- Keep: `countdown`, `mafDisplay`

- [ ] **Step 1: Update manifest**

Templates section becomes:
```json
"template": [
  { "name": "warmup.html" },
  { "name": "test.html" },
  { "name": "done.html" }
]
```

Out section becomes:
```json
"out": [
  { "name": "countdown" },
  { "name": "mafDisplay" }
]
```

- [ ] **Step 2: Delete main.html** — no longer needed

- [ ] **Step 3: Commit** — `feat: update manifest for 3-screen layout`

---

## Chunk 3: Verification

### Task 6: Simulator testing

- [ ] **Step 1: Open simulator** — verify warmup screen shows countdown, HR, MAF, mode
- [ ] **Step 2: Start exercise** — verify countdown begins ticking
- [ ] **Step 3: Press lap** — verify transition to test screen
- [ ] **Step 4: Wait or adjust warmup to 1min** — verify auto-transition works
- [ ] **Step 5: Verify test screen** — drift %, status, HR, pace updating
- [ ] **Step 6: Verify 1st→2nd half transition** — half label changes
- [ ] **Step 7: Verify done screen** — final results display
- [ ] **Step 8: Test pause/resume** — verify timer stops during pause

### Task 7: Final commit and push

- [ ] **Step 1: Clean up** — remove old main.html if not already deleted
- [ ] **Step 2: Final commit** — `feat: drift-test multi-screen redesign (closes #1, #2, #3, #4, #6)`
- [ ] **Step 3: Push to remote** — `git push`
