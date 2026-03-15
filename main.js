/**
 * Drift Test — Cardiac Decoupling (MFA Method)
 *
 * Compares pace:HR (or power:HR) efficiency factor between
 * first and second halves of a timed run/ride.
 * Drift >5% = aerobic base needs work.
 * All outputs are numbers — templates handle string formatting.
 */

var testMode = 0;       // 0 = running (speed), 1 = cycling (power)
var warmupSec = 900;    // 15 min default
var halfwaySec = 2700;  // warmup + half test
var endSec = 4500;      // warmup + full test
var mafTarget = 140;

var totalSeconds = 0;

// First half accumulators
var hrSum1 = 0;
var metricSum1 = 0;
var count1 = 0;

// Second half accumulators
var hrSum2 = 0;
var metricSum2 = 0;
var count2 = 0;

function getUserInterface() {
  return { template: "main" };
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

function onEvent(_input, _output, eventId) {
  // Down button (event 1) during warmup = skip to test
  if (eventId === 1 && totalSeconds < warmupSec) {
    totalSeconds = warmupSec;
  }
}

function evaluate(input, output) {
  totalSeconds++;

  // Read HR (sensor reports Hz, multiply by 60 for bpm)
  var hrRaw = input.Heartrate || 0;
  var hr = hrRaw * 60;

  // Read metric based on mode
  var metric;
  if (testMode === 1) {
    metric = input.Power || 0;
  } else {
    metric = input.Speed || 0;
  }

  // Determine phase (0=WARMUP, 1=1st HALF, 2=2nd HALF, 3=DONE)
  var phaseNum;
  var countdownSec;

  if (totalSeconds < warmupSec) {
    phaseNum = 0;
    countdownSec = warmupSec - totalSeconds;
  } else if (totalSeconds < halfwaySec) {
    phaseNum = 1;
    countdownSec = endSec - totalSeconds;

    // Accumulate first half data
    if (hr > 0 && metric > 0) {
      hrSum1 += hr;
      metricSum1 += metric;
      count1++;
    }
  } else if (totalSeconds < endSec) {
    phaseNum = 2;
    countdownSec = endSec - totalSeconds;

    // Accumulate second half data
    if (hr > 0 && metric > 0) {
      hrSum2 += hr;
      metricSum2 += metric;
      count2++;
    }
  } else {
    phaseNum = 3;
    countdownSec = 0;
  }

  // Calculate drift percentage
  var driftVal = -1;   // -1 = no data
  var statusNum = 0;   // 0="--", 1="GOOD", 2="DRIFT!", 3="DONE"

  if (count1 > 0 && count2 > 0) {
    var avgHr1 = hrSum1 / count1;
    var avgMetric1 = metricSum1 / count1;
    var avgHr2 = hrSum2 / count2;
    var avgMetric2 = metricSum2 / count2;

    var ef1 = avgMetric1 / avgHr1;
    var ef2 = avgMetric2 / avgHr2;

    driftVal = ((ef1 - ef2) / ef1) * 100;

    if (phaseNum === 3) {
      statusNum = 3;
    } else if (driftVal <= 5) {
      statusNum = 1;
    } else {
      statusNum = 2;
    }
  } else if (phaseNum === 3) {
    statusNum = 3;
  }

  // Encode efMetric: positive=sec/km (running), negative=watts (cycling), 0=no data
  var efVal = 0;
  if (metric > 0 && testMode === 1) {
    efVal = -Math.round(metric);
  } else if (metric > 0.1 && testMode === 0) {
    efVal = Math.round(1000 / metric);
  }

  if (countdownSec < 0) countdownSec = 0;

  output.countdown = countdownSec;
  output.mafDisplay = mafTarget;

  // Update text labels via setText (outputFormat="script" not supported)
  var phases = ["WARMUP", "1st HALF", "2nd HALF", "DONE"];
  setText("#phaseLabel", phases[phaseNum]);

  var driftText = driftVal < 0 ? "--" : driftVal.toFixed(1);
  setText("#driftVal", driftText);

  var statuses = ["--", "GOOD", "DRIFT!", "DONE"];
  setText("#statusLabel", statuses[statusNum]);

  if (efVal === 0) {
    setText("#efLabel", "--");
  } else if (efVal < 0) {
    setText("#efLabel", (-efVal) + "W");
  } else {
    var mins = Math.floor(efVal / 60);
    var secs = efVal % 60;
    setText("#efLabel", mins + ":" + (secs < 10 ? "0" : "") + secs);
  }

  setText("#skipHint", phaseNum === 0 ? "DOWN TO SKIP" : "");
}

function getSummaryOutputs(input, output) {
  var items = [];

  // Drift result
  if (count1 > 0 && count2 > 0) {
    var ef1 = (metricSum1 / count1) / (hrSum1 / count1);
    var ef2 = (metricSum2 / count2) / (hrSum2 / count2);
    var drift = ((ef1 - ef2) / ef1) * 100;
    items.push({ id: "drift", name: "Drift", value: drift.toFixed(1) + "%" });
  }

  // Avg HR first half
  if (count1 > 0) {
    items.push({ id: "hr1", name: "Avg HR 1st", format: "HeartRate_Fourdigits", value: Math.round(hrSum1 / count1) });
  }

  // Avg HR second half
  if (count2 > 0) {
    items.push({ id: "hr2", name: "Avg HR 2nd", format: "HeartRate_Fourdigits", value: Math.round(hrSum2 / count2) });
  }

  return items;
}
