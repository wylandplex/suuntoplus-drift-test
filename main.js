var tpl = "s";
var mode = 0;
var maf = 140;
var watts = 150;
var sec = 0;
var phase = 0;
var h1 = 0;
var m1 = 0;
var c1 = 0;
var h2 = 0;
var m2 = 0;
var c2 = 0;

var go = function(t) {
  tpl = t;
  unload('_cm');
};

function getUserInterface() {
  return { template: tpl };
}

function onLoad(_input, output) {
  output.countdown = 900;
  output.maf = maf;
}

function onEvent(_input, _output, eventId) {
  if (eventId === 1) {
    mode = mode === 0 ? 1 : 0;
  } else if (eventId === 2) {
    maf = maf >= 190 ? 100 : maf + 10;
  } else if (eventId === 3) {
    watts = watts >= 350 ? 80 : watts + 10;
  } else if (eventId === 4) {
    go("w");
  } else if (eventId === 5) {
    sec = 900;
  }
}

function evaluate(input, output) {
  if (tpl === "s") {
    setText("#mn", mode === 0 ? "PACE" : "WATTS");
    setText("#mv", "" + maf);
    setText("#wl", mode === 1 ? "WATTS" : "-");
    setText("#wv", mode === 1 ? "" + watts : "-");
    return;
  }

  sec++;
  var hr = (input.Heartrate || 0) * 60;
  var met = mode === 0 ? (input.Speed || 1) : watts;

  if (sec <= 900) {
    output.countdown = 900 - sec;
    output.maf = maf;
    if (sec >= 900) { go("t"); }
  } else if (sec <= 2700) {
    phase = 1;
    output.countdown = 4500 - sec;
    if (hr > 0) { h1 += hr; m1 += met; c1++; }
  } else if (sec <= 4500) {
    phase = 2;
    output.countdown = 4500 - sec;
    if (hr > 0) { h2 += hr; m2 += met; c2++; }
  } else {
    phase = 3;
    output.countdown = 0;
  }

  if (tpl === "w" && sec >= 900) { go("t"); return; }
  if (tpl === "t" && phase === 3) { go("d"); return; }

  if (tpl === "t") {
    setText("#hl", phase === 1 ? "1st HALF" : "2nd HALF");
    if (mode === 1) {
      setText("#el", watts + "W");
    } else if (met > 0.1) {
      var ps = Math.round(1000 / met);
      var mm = Math.floor(ps / 60);
      var ss = ps % 60;
      setText("#el", mm + ":" + (ss < 10 ? "0" : "") + ss);
    } else {
      setText("#el", "--");
    }
  }

  if (tpl === "d") {
    var a1 = c1 > 0 ? h1 / c1 : 0;
    var a2 = c2 > 0 ? h2 / c2 : 0;
    var v1 = c1 > 0 ? m1 / c1 : 0;
    var v2 = c2 > 0 ? m2 / c2 : 0;
    var ok = a1 > 0 && a2 > 0 && v1 > 0 && v2 > 0;
    var dv = 0;
    if (ok) { dv = ((v1 / a1 - v2 / a2) / (v1 / a1)) * 100; }
    setText("#df", ok ? dv.toFixed(1) : "--");
    if (!ok) { setText("#vl", "NO DATA"); }
    else if (dv <= 5) { setText("#vl", "BASE SOLID"); }
    else if (dv <= 10) { setText("#vl", "ACCEPTABLE"); }
    else { setText("#vl", "NEEDS WORK"); }
    setText("#h1", c1 > 0 ? "" + Math.round(a1) : "--");
    setText("#h2", c2 > 0 ? "" + Math.round(a2) : "--");
    if (c1 > 0 && mode === 1) { setText("#p1", Math.round(v1) + "W"); }
    else if (c1 > 0 && v1 > 0.1) {
      var q1 = Math.round(1000 / v1);
      setText("#p1", Math.floor(q1 / 60) + ":" + (q1 % 60 < 10 ? "0" : "") + (q1 % 60));
    }
    if (c2 > 0 && mode === 1) { setText("#p2", Math.round(v2) + "W"); }
    else if (c2 > 0 && v2 > 0.1) {
      var q2 = Math.round(1000 / v2);
      setText("#p2", Math.floor(q2 / 60) + ":" + (q2 % 60 < 10 ? "0" : "") + (q2 % 60));
    }
  }
}
