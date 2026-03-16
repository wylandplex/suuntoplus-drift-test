/**
 * Drift Test — Cardiac Decoupling (MFA Method)
 *
 * 4 screens: SETUP → WARMUP → TEST → DONE
 * Compares pace:HR (or power:HR) efficiency factor between
 * first and second halves of a timed run/ride.
 * Drift >5% = aerobic base needs work.
 */

var currentTemplate = "setup";

var testMode = 0;       // 0 = PACE (speed), 1 = WATTS (power)
var warmupSec = 900;    // 15 min default
var halfwaySec = 2700;  // warmup + half test
var endSec = 4500;      // warmup + full test
var mafTarget = 140;

var manualWatts = 150;
var hasPowerMeter = 0;
var useManualWatts = 0;
var doneWatts1 = 150;
var doneWatts2 = 150;

var ascentAtTestStart = 0;
var ascentAtHalfway = 0;
var ascentAtTestEnd = 0;

var totalSeconds = 0;
var exerciseStarted = 1;
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
    manualWatts = settings.manualWatts || 150;
    var warmupMin = settings.warmupDuration || 15;
    var testMin = settings.testDuration || 60;
    mafTarget = settings.mafTarget || 140;

    warmupSec = warmupMin * 60;
    halfwaySec = warmupSec + testMin * 30;
    endSec = warmupSec + testMin * 60;

    if (settings.debugMode) {
      warmupSec = 10;
      halfwaySec = 20;
      endSec = 30;
    }
  }

  doneWatts1 = manualWatts;
  doneWatts2 = manualWatts;

  output.countdown = warmupSec;
  output.mafDisplay = mafTarget / 60;
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

function onEvent(_input, _output, eventId) {
  // Setup: toggle PACE/WATTS
  if (eventId === 1) {
    testMode = testMode === 0 ? 1 : 0;
  // Setup: manual watts UP (+5W)
  } else if (eventId === 2) {
    manualWatts += 5;
  // Setup: manual watts DOWN (-5W)
  } else if (eventId === 3) {
    if (manualWatts > 5) manualWatts -= 5;
  // Setup: START → go to warmup
  } else if (eventId === 4) {
    doneWatts1 = manualWatts;
    doneWatts2 = manualWatts;
    currentTemplate = "warmup";
    unload('_cm');
  // Done: 1st-half watts UP (+5W)
  } else if (eventId === 5 && useManualWatts) {
    doneWatts1 += 5;
  // Done: 1st-half watts DOWN (-5W)
  } else if (eventId === 6 && useManualWatts) {
    if (doneWatts1 > 5) doneWatts1 -= 5;
  // Done: 2nd-half watts UP (+5W)
  } else if (eventId === 7 && useManualWatts) {
    doneWatts2 += 5;
  // Done: 2nd-half watts DOWN (-5W)
  } else if (eventId === 8 && useManualWatts) {
    if (doneWatts2 > 5) doneWatts2 -= 5;
  }
}

function onLap(_input, _output) {
  // Lap during warmup = skip to test (not during setup)
  if (currentTemplate === "warmup" && phase === 0) {
    totalSeconds = warmupSec;
  }
}

function evaluate(input, output) {
  if (!exerciseStarted || isPaused) {
    return;
  }

  // Setup screen: update display, don't count time
  if (currentTemplate === "setup") {
    // Auto-populate MAF from HR zone boundary (Zone 2 upper = Zone 3 lower)
    // Zone limits arrive in Hz (like HR sensor), convert to bpm
    var zoneVal = input.Zone3Limit || 0;
    if (zoneVal > 0) {
      mafTarget = Math.round(zoneVal * 60);
      output.mafDisplay = mafTarget / 60;
    }

    setText("#modeName", testMode === 0 ? "PACE" : "WATTS");
    if (testMode === 1) {
      setText("#wattsLabel", "WATTS");
      setText("#wattsValue", manualWatts);
    } else {
      setText("#wattsLabel", " ");
      setText("#wattsValue", " ");
    }
    return;
  }

  totalSeconds++;

  // Auto-detect power meter (WATTS mode, before done screen)
  if (testMode === 1 && phase < 3 && input.Power > 0) {
    hasPowerMeter = 1;
  }

  // Read HR
  var hrRaw = input.Heartrate || 0;
  var hr = hrRaw * 60;

  // Read metric based on mode
  var metric;
  useManualWatts = 0;
  if (testMode === 0) {
    metric = input.Speed || 0;
  } else if (hasPowerMeter) {
    metric = input.Power || 0;
  } else {
    metric = manualWatts;
    useManualWatts = 1;
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

  // Handle phase transitions
  if (prevPhase === 0 && phase >= 1) {
    ascentAtTestStart = input.Ascent || 0;
    currentTemplate = "test";
    unload('_cm');
    return;
  }
  if (prevPhase === 1 && phase === 2) {
    ascentAtHalfway = input.Ascent || 0;
  }
  if (prevPhase < 3 && phase === 3) {
    ascentAtTestEnd = input.Ascent || 0;
    currentTemplate = "done";
    unload('_cm');
    return;
  }

  // Update screen based on current template
  if (currentTemplate === "warmup") {
    var modeStr;
    if (testMode === 0) {
      modeStr = "PACE";
    } else if (hasPowerMeter) {
      modeStr = "WATTS AUTO";
    } else {
      modeStr = "WATTS " + manualWatts + "W";
    }
    setText("#modeLabel", hr > mafTarget ? "SLOW DOWN" : modeStr);
    if (hr > mafTarget) {
      setStyle('#hrWarn', 'visibility', 'VISIBLE');
      setStyle('#hrValue', 'color', getStyle('css:.c-red', 'color'));
      setStyle('#hrWarn', 'color', getStyle('css:.c-red', 'color'));
    } else if (hr >= mafTarget * 0.9) {
      setStyle('#hrWarn', 'visibility', 'hidden');
      setStyle('#hrValue', 'color', getStyle('css:.c-green', 'color'));
    } else {
      setStyle('#hrWarn', 'visibility', 'hidden');
      setStyle('#hrValue', 'color', getStyle('css:.f-num', 'color'));
    }
  } else if (currentTemplate === "test") {

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

    setText("#halfLabel", hr > mafTarget ? "SLOW DOWN" : (phase === 1 ? "1st HALF" : "2nd HALF"));
    if (hr > mafTarget) {
      setStyle('#hrWarn', 'visibility', 'VISIBLE');
      setStyle('#hrValue', 'color', getStyle('css:.c-red', 'color'));
      setStyle('#hrWarn', 'color', getStyle('css:.c-red', 'color'));
    } else if (hr >= mafTarget * 0.9) {
      setStyle('#hrWarn', 'visibility', 'hidden');
      setStyle('#hrValue', 'color', getStyle('css:.c-green', 'color'));
    } else {
      setStyle('#hrWarn', 'visibility', 'hidden');
      setStyle('#hrValue', 'color', getStyle('css:.f-num', 'color'));
    }
  } else if (currentTemplate === "done") {
    // Recalculate drift (supports live editing of manual watts)
    var avgHr1 = count1 > 0 ? hrSum1 / count1 : 0;
    var avgHr2 = count2 > 0 ? hrSum2 / count2 : 0;
    var avgMetric1, avgMetric2;

    if (useManualWatts) {
      avgMetric1 = doneWatts1;
      avgMetric2 = doneWatts2;
    } else {
      avgMetric1 = count1 > 0 ? metricSum1 / count1 : 0;
      avgMetric2 = count2 > 0 ? metricSum2 / count2 : 0;
    }

    var hasData = avgHr1 > 0 && avgHr2 > 0 && avgMetric1 > 0 && avgMetric2 > 0;
    var driftVal = 0;
    if (hasData) {
      var ef1 = avgMetric1 / avgHr1;
      var ef2 = avgMetric2 / avgHr2;
      driftVal = ((ef1 - ef2) / ef1) * 100;
    }

    setText("#driftFinal", hasData ? driftVal.toFixed(1) : "--");

    if (!hasData) {
      setText("#verdictLabel", "NO DATA");
    } else if (driftVal <= 5) {
      setText("#verdictLabel", "AEROBIC BASE SOLID");
      setStyle('#driftFinal', 'color', getStyle('css:.c-green', 'color'));
      setStyle('#verdictLabel', 'color', getStyle('css:.c-green', 'color'));
    } else if (driftVal <= 10) {
      setText("#verdictLabel", "ACCEPTABLE");
      setStyle('#driftFinal', 'color', getStyle('css:.c-yellow', 'color'));
      setStyle('#verdictLabel', 'color', getStyle('css:.c-yellow', 'color'));
    } else {
      setText("#verdictLabel", "BASE NEEDS WORK");
      setStyle('#driftFinal', 'color', getStyle('css:.c-red', 'color'));
      setStyle('#verdictLabel', 'color', getStyle('css:.c-red', 'color'));
    }

    if (count1 > 0) {
      setText("#hr1Label", Math.round(avgHr1));
      if (useManualWatts) {
        setText("#metric1Label", doneWatts1 + "W");
      } else if (testMode === 1) {
        setText("#metric1Label", Math.round(avgMetric1) + "W");
      } else if (avgMetric1 > 0.1) {
        var p1 = Math.round(1000 / avgMetric1);
        setText("#metric1Label", Math.floor(p1 / 60) + ":" + (p1 % 60 < 10 ? "0" : "") + (p1 % 60));
      }
    }
    if (count2 > 0) {
      setText("#hr2Label", Math.round(avgHr2));
      if (useManualWatts) {
        setText("#metric2Label", doneWatts2 + "W");
      } else if (testMode === 1) {
        setText("#metric2Label", Math.round(avgMetric2) + "W");
      } else if (avgMetric2 > 0.1) {
        var p2 = Math.round(1000 / avgMetric2);
        setText("#metric2Label", Math.floor(p2 / 60) + ":" + (p2 % 60 < 10 ? "0" : "") + (p2 % 60));
      }
    }

    // Terrain assessment per half
    var ascent1 = Math.round(ascentAtHalfway - ascentAtTestStart);
    var ascent2 = Math.round(ascentAtTestEnd - ascentAtHalfway);
    var totalAscent = ascent1 + ascent2;

    if (totalAscent <= 0) {
      setText("#ascentLabel", "FLAT / INDOOR");
      setStyle('#ascentLabel', 'color', getStyle('css:.c-green', 'color'));
    } else {
      var diff = ascent2 - ascent1;
      var tag = "";
      var ascentColor;
      if (Math.abs(diff) < 15) {
        tag = " OK";
        ascentColor = getStyle('css:.c-green', 'color');
      } else if (Math.abs(diff) < 40) {
        tag = diff > 0 ? " DRIFT+" : " DRIFT-";
        ascentColor = getStyle('css:.c-yellow', 'color');
      } else {
        tag = diff > 0 ? " DRIFT+" : " DRIFT-";
        ascentColor = getStyle('css:.c-red', 'color');
      }
      setText("#ascentLabel", ascent1 + "m | " + ascent2 + "m " + tag);
      setStyle('#ascentLabel', 'color', ascentColor);
    }
  }

  output.mafDisplay = mafTarget / 60;
}

function getSummaryOutputs(_input, _output) {
  var items = [];

  if (count1 > 0 && count2 > 0) {
    var avgHr1 = hrSum1 / count1;
    var avgHr2 = hrSum2 / count2;
    var avgMetric1, avgMetric2;

    if (useManualWatts) {
      avgMetric1 = doneWatts1;
      avgMetric2 = doneWatts2;
    } else {
      avgMetric1 = metricSum1 / count1;
      avgMetric2 = metricSum2 / count2;
    }

    var ef1 = avgMetric1 / avgHr1;
    var ef2 = avgMetric2 / avgHr2;
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
