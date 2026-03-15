# Drift Test — Cardiac Decoupling (MFA Method)

A SuuntoPlus app that measures aerobic efficiency drift during a timed run or ride. Based on the Maffetone (MFA) method: if your pace:HR ratio drops more than 5% between the first and second halves of a steady-effort session, your aerobic base needs work.

## How It Works

**Efficiency Factor (EF)** = metric / HR
- Running: metric = speed (m/s)
- Cycling: metric = power (W)

**Drift %** = ((EF_first_half − EF_second_half) / EF_first_half) × 100

## Test Phases

```
WARMUP → 1st HALF → 2nd HALF → DONE
```

| Phase    | What happens                                      |
|----------|---------------------------------------------------|
| WARMUP   | Countdown to test start. Get to your MAF HR zone. |
| 1st HALF | Accumulates EF data. Hold steady effort.          |
| 2nd HALF | Accumulates EF data. Live drift % starts showing. |
| DONE     | Final drift result displayed.                     |

## Reading the Result

- **≤ 5%** → "GOOD" — aerobic base is solid
- **> 5%** → "DRIFT!" — aerobic base needs work

## Settings

| Setting         | Range     | Default | Description                    |
|-----------------|-----------|---------|--------------------------------|
| Mode            | 0–1       | 0       | 0 = Running (speed), 1 = Cycling (power) |
| Warmup          | 5–30 min  | 15      | Warmup duration before test    |
| Test Duration   | 20–120 min| 60      | Total test time (split in half)|
| MAF Target      | 100–180   | 140     | Target heart rate (bpm)        |

## Display Layout

```
┌─────────────────┐
│     WARMUP      │  ← phase
│      DRIFT      │
│      --         │  ← drift % (large)
│       %         │
│      --         │  ← status
│  HR    PACE/W   │  ← live HR + pace or watts
│ TIME     MAF    │  ← countdown + MAF target
└─────────────────┘
```

## Dual Mode

- **Running mode**: reads Speed sensor, displays pace as min:sec/km
- **Cycling mode**: reads Power sensor (e.g. Bulcan e-bike), displays watts
