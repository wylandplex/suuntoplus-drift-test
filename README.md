# Drift Test

Cardiac decoupling test on your wrist. Run or ride at steady effort, get your drift % when done. Based on the Maffetone (MFA) method.

## How It Works

**Efficiency Factor (EF)** = metric / HR
- Running: metric = speed (m/s), displayed as pace
- Cycling: metric = power (W)

**Drift %** = ((EF₁ − EF₂) / EF₁) × 100

## Screen Flow

```
SETUP → WARMUP → TEST → DONE
```

### Setup

```
┌─────────────────┐
│   DRIFT TEST    │
│                 │
│      PACE       │  ← tap to toggle PACE/WATTS
│                 │
│   [ START ]     │
│                 │
│   MAF ♥ 140     │  ← auto-read from HR zones
└─────────────────┘
```

- **Tap mode**: toggle PACE / WATTS
- **In WATTS mode**: adjust manual watts with +/- buttons
- MAF target auto-populates from your HR Zone 2 upper boundary

### Warmup

Countdown timer. Stay below MAF HR. Live "SLOW DOWN" warning if HR goes too high (color-coded). Press lap to skip warmup.

### Test

Split into two halves. Hold steady effort. Shows live HR, pace/watts, countdown, and half indicator. Red warning if over MAF target.

### Done

```
┌─────────────────┐
│  DRIFT TEST     │
│    COMPLETE     │
│    % DRIFT      │
│     3.2         │  ← drift result (color-coded)
│ AVG HR 1st  2nd │
│   135       142 │
│  AEROBIC BASE   │
│     SOLID       │  ← verdict
└─────────────────┘
```

**Verdict:**
- **≤ 5%** (green) — aerobic base solid
- **5–10%** (yellow) — acceptable
- **> 10%** (red) — base needs work

**Terrain assessment:** Compares ascent between halves. Flags uneven elevation that may confound results.

**Manual watts:** If no power meter detected, adjust watts per half on the done screen.

## Settings

| Setting | Range | Default | Description |
|---------|-------|---------|-------------|
| Mode | 0–1 | 0 | 0 = Pace (running), 1 = Watts (cycling) |
| Manual Watts | 50–500 | 150 | For trainers without power broadcast |
| Warmup | 5–30 min | 15 | Warmup before test |
| Test Duration | 20–120 min | 60 | Total test time (split in half) |
| MAF Target | 100–180 bpm | 140 | Target heart rate |

## Development

Requires [SuuntoPlus Editor](https://marketplace.visualstudio.com/items?itemName=Suunto.suuntoplus-editor) for VS Code.

```bash
code drift-test/
# Test: Command Palette → "SuuntoPlus: Open SuuntoPlus Simulator"
# Deploy: Command Palette → "SuuntoPlus: Deploy to Watch"
```

## Version History

- **v1.1** — Multi-screen redesign (setup, warmup, test, done), terrain assessment, color-coded warnings, manual watts editing
- **v1.0** — Single-screen drift test with pace/power modes
