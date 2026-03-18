var currentTemplate = "setup";
var testMode = 0;
var warmupMin = 15;
var testMin = 60;
var warmupSec = 900;
var halfwaySec = 2700;
var endSec = 4500;
var mafTarget = 140;
var manualWatts = 150;
var hasPowerMeter = 0;
var useManualWatts = 0;
var doneWatts1 = 150;
var doneWatts2 = 150;
var totalSeconds = 0;
var exerciseStarted = 1;
var isPaused = 0;
var phase = 0;
var hrSum1 = 0;
var metricSum1 = 0;
var count1 = 0;
var hrSum2 = 0;
var metricSum2 = 0;
var count2 = 0;

function getUserInterface() {
  return { template: currentTemplate };
}

function onLoad(_input, output) {
  output.countdown = warmupSec;
  output.mafDisplay = mafTarget / 60;
}

function onExerciseStart(_input, _output) { exerciseStarted = 1; }
function onExercisePause(_input, _output) { isPaused = 1; }
function onExerciseContinue(_input, _output) { isPaused = 0; }

function onEvent(_input, _output, eventId) {
  if (eventId === 1) {
    testMode = testMode === 0 ? 1 : 0;
  } else if (eventId === 2) {
    mafTarget = mafTarget >= 190 ? 100 : mafTarget + 10;
  } else if (eventId === 4) {
    warmupSec = warmupMin * 60;
    halfwaySec = warmupSec + testMin * 30;
    endSec = warmupSec + testMin * 60;
    doneWatts1 = manualWatts;
    doneWatts2 = manualWatts;
    currentTemplate = "warmup";
    unload('_cm');
  } else if (eventId === 5 && useManualWatts) {
    doneWatts1 += 5;
  } else if (eventId === 6 && useManualWatts) {
    if (doneWatts1 > 5) doneWatts1 -= 5;
  } else if (eventId === 7 && useManualWatts) {
    doneWatts2 += 5;
  } else if (eventId === 8 && useManualWatts) {
    if (doneWatts2 > 5) doneWatts2 -= 5;
  } else if (eventId === 10) {
    warmupMin = warmupMin >= 15 ? 5 : warmupMin + 5;
  } else if (eventId === 12) {
    testMin = testMin >= 70 ? 45 : testMin + 5;
  } else if (eventId === 14) {
    manualWatts = manualWatts >= 350 ? 80 : manualWatts + 10;
  }
}

function onLap(_input, _output) {
  if (currentTemplate === "warmup" && phase === 0) {
    totalSeconds = warmupSec;
  }
}

function evaluate(input, output) {
  if (!exerciseStarted) { return; }
  if (isPaused && currentTemplate !== "done") { return; }

  if (currentTemplate === "setup") {
    setText("#modeName", testMode === 0 ? "PACE" : "WATTS");
    setText("#warmupVal", warmupMin);
    setText("#testVal", testMin);
    setText("#mafVal", mafTarget);
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

  if (testMode === 1 && phase < 3 && input.Power > 0) { hasPowerMeter = 1; }

  var hrRaw = input.Heartrate || 0;
  var hr = hrRaw * 60;
  var metric;
  useManualWatts = 0;
  if (testMode === 0) {
    metric = input.Speed || 1;
  } else if (hasPowerMeter) {
    metric = input.Power || 0;
  } else {
    metric = manualWatts;
    useManualWatts = 1;
  }

  var prevPhase = phase;
  if (totalSeconds < warmupSec) {
    phase = 0;
    output.countdown = warmupSec - totalSeconds;
  } else if (totalSeconds < halfwaySec) {
    phase = 1;
    output.countdown = endSec - totalSeconds;
    if (hr > 0 && metric > 0) { hrSum1 += hr; metricSum1 += metric; count1++; }
  } else if (totalSeconds < endSec) {
    phase = 2;
    output.countdown = endSec - totalSeconds;
    if (hr > 0 && metric > 0) { hrSum2 += hr; metricSum2 += metric; count2++; }
  } else {
    phase = 3;
    output.countdown = 0;
  }

  if (prevPhase === 1 && phase === 2) { output.lapTrigger = 1; }
  if (prevPhase === 0 && phase >= 1) { currentTemplate = "test"; unload('_cm'); return; }
  if (prevPhase < 3 && phase === 3) { currentTemplate = "done"; unload('_cm'); return; }

  if (currentTemplate === "warmup") {
    setText("#modeLabel", testMode === 0 ? "PACE" : "WATTS " + manualWatts + "W");
  } else if (currentTemplate === "test") {
    setText("#halfLabel", phase === 1 ? "1st HALF" : "2nd HALF");
    if (metric > 0 && testMode === 1) {
      setText("#efLabel", Math.round(metric) + "W");
    } else if (metric > 0.1 && testMode === 0) {
      var ps = Math.round(1000 / metric);
      setText("#efLabel", Math.floor(ps / 60) + ":" + (ps % 60 < 10 ? "0" : "") + (ps % 60));
    } else {
      setText("#efLabel", "--");
    }
  } else if (currentTemplate === "done") {
    var a1 = count1 > 0 ? hrSum1 / count1 : 0;
    var a2 = count2 > 0 ? hrSum2 / count2 : 0;
    var m1 = useManualWatts ? doneWatts1 : (count1 > 0 ? metricSum1 / count1 : 0);
    var m2 = useManualWatts ? doneWatts2 : (count2 > 0 ? metricSum2 / count2 : 0);
    var ok = a1 > 0 && a2 > 0 && m1 > 0 && m2 > 0;
    var dv = 0;
    if (ok) { dv = ((m1 / a1 - m2 / a2) / (m1 / a1)) * 100; }
    setText("#driftFinal", ok ? dv.toFixed(1) : "--");
    if (ok) {
      var dc = dv <= 10 ? getStyle('css:.c-green', 'color') : getStyle('css:.c-red', 'color');
      setStyle('#driftFinal', 'color', dc);
      setStyle('#verdictLabel', 'color', dc);
    }
    if (!ok) { setText("#verdictLabel", "NO DATA"); }
    else if (dv <= 5) { setText("#verdictLabel", "AEROBIC BASE SOLID"); }
    else if (dv <= 10) { setText("#verdictLabel", "ACCEPTABLE"); }
    else { setText("#verdictLabel", "BASE NEEDS WORK"); }
    if (count1 > 0) {
      setText("#hr1Label", Math.round(a1));
      if (testMode === 1) { setText("#metric1Label", Math.round(m1) + "W"); }
      else if (m1 > 0.1) { var p1 = Math.round(1000 / m1); setText("#metric1Label", Math.floor(p1 / 60) + ":" + (p1 % 60 < 10 ? "0" : "") + (p1 % 60)); }
    }
    if (count2 > 0) {
      setText("#hr2Label", Math.round(a2));
      if (testMode === 1) { setText("#metric2Label", Math.round(m2) + "W"); }
      else if (m2 > 0.1) { var p2 = Math.round(1000 / m2); setText("#metric2Label", Math.floor(p2 / 60) + ":" + (p2 % 60 < 10 ? "0" : "") + (p2 % 60)); }
    }
    setText("#ascentLabel", "FLAT / INDOOR");
  }

  output.mafDisplay = mafTarget / 60;
}

