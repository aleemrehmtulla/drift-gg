# Scoring

Score range is 1–10. Based on **accuracy** (tempo match), **consistency** (tap regularity), and in hard mode, **engagement** (tap count).

---

## Input

The scoring function receives a target BPM, an array of tap timestamps (ms), and a difficulty. All computation happens from raw timestamps — no pre-processing.

Minimum **4 taps** required. Fewer returns a flat score of 1 with sentinel values (`driftMs: 9999`, `stdDevMs: 9999`).

## Derived metrics

### Intervals

Consecutive differences between tap timestamps:

```
intervals[i] = tapTimestamps[i + 1] - tapTimestamps[i]
```

For `n` taps, this produces `n - 1` intervals.

### Average interval & achieved BPM

```
avgInterval = sum(intervals) / intervals.length
achievedBpm = 60000 / avgInterval
```

### Drift

Absolute difference between achieved and target intervals, in ms:

```
targetInterval = 60000 / targetBpm
driftMs        = round(|targetInterval - avgInterval|)
```

### Deviation (fractional)

Drift normalized by the target interval. This is the primary accuracy metric — it's BPM-independent, so 3ms of drift at 80 BPM (0.4%) is treated differently from 3ms at 160 BPM (0.8%).

```
deviation = |avgInterval - targetInterval| / targetInterval
```

### Standard deviation

Population stddev of intervals from their own mean (not from the target). Measures internal consistency — a player tapping steadily at the wrong tempo still gets low stddev.

```
variance = sum((interval - avgInterval)² for each interval) / intervals.length
stdDevMs = sqrt(variance)
```

Note: this is population stddev (dividing by `n`, not `n-1`) since we have all the data, not a sample.

### Per-tap offsets

Each interval's signed deviation from the target interval, rounded to 0.1ms:

```
tapIntervalOffsets[i] = round((intervals[i] - targetInterval) × 10) / 10
```

Used for visualizing per-tap accuracy on the results screen — not used in score calculation.

---

## Easy mode

Phase durations: **6s listen, 6s tap**. BPM range: 80–160.

Bucket-based scoring. Accuracy and consistency are each scored 0–5 from threshold tables, then summed. No tap bonus. Final score is clamped to a minimum of 1.

```
score = max(1, accuracyPoints + consistencyPoints)
```

### Accuracy thresholds

| Deviation | Points |
|-----------|--------|
| < 2.5%   | 5      |
| < 6%     | 4      |
| < 11%    | 3      |
| < 20%    | 2      |
| < 35%    | 1      |
| ≥ 35%    | 0      |

First matching threshold wins (checked in order). At 120 BPM (500ms interval), 2.5% deviation = 12.5ms drift. At 80 BPM (750ms), 2.5% = 18.75ms. The percentage basis makes accuracy scale-independent across the BPM range, so faster tempos aren't inherently harder to score on.

### Consistency thresholds

| Std Dev | Points |
|---------|--------|
| < 25ms  | 5      |
| < 50ms  | 4      |
| < 80ms  | 3      |
| < 130ms | 2      |
| < 200ms | 1      |
| ≥ 200ms | 0      |

Unlike deviation, stddev thresholds are in absolute ms. This means consistency is slightly easier to nail at slower BPMs (25ms is 3.3% of a 750ms interval at 80 BPM, but 6.7% of a 375ms interval at 160 BPM). This is intentional for easy mode — slow songs should feel more forgiving.

### Easy mode score distribution

| Accuracy + Consistency | Score |
|------------------------|-------|
| 5 + 5                  | 10    |
| 5 + 4 or 4 + 5         | 9     |
| 4 + 4                  | 8     |
| ...                    | ...   |
| 0 + 0                  | 1 (clamped) |

A player who gets within a few percent of the BPM with reasonably steady taps will land 7–9. A perfect 10 requires <2.5% deviation *and* <25ms stddev — comfortable but not automatic.

---

## Hard mode

Phase durations: **4s listen, 4s tap**. BPM range: 80–160.

Continuous exponential decay — no buckets, every millisecond of error costs points. Adds a tap bonus for engagement.

### Formula

```
accuracy    = 7 × e^(-12 × deviation)
consistency = 3 × e^(-0.02 × stdDevMs)
tapBonus    = min(0.5, (intervals.length / expectedIntervals) × 0.5)
score       = clamp(round(accuracy + consistency + tapBonus), 1, 10)
```

### Accuracy component (0–7 points)

Exponential decay with rate `k = 12`, weight `w = 7`.

```
accuracy = 7 × e^(-12 × deviation)
```

The decay rate controls the curve's steepness. At `k = 12`:

| Deviation | e^(-12d) | Accuracy pts |
|-----------|----------|-------------|
| 0%        | 1.000    | 7.00        |
| 0.5%      | 0.942    | 6.59        |
| 1%        | 0.887    | 6.21        |
| 2%        | 0.787    | 5.51        |
| 3%        | 0.698    | 4.88        |
| 5%        | 0.549    | 3.84        |
| 10%       | 0.301    | 2.11        |
| 20%       | 0.091    | 0.64        |

The curve drops ~50% by 5% deviation and flattens near zero around 20%. This concentrates scoring resolution in the 0–5% range where most players actually land, while still differentiating a 10% player from a 20% player.

### Consistency component (0–3 points)

Exponential decay with rate `k = 0.02`, weight `w = 3`.

```
consistency = 3 × e^(-0.02 × stdDevMs)
```

| Std Dev | e^(-0.02s) | Consistency pts |
|---------|-----------|----------------|
| 0ms     | 1.000     | 3.00           |
| 10ms    | 0.819     | 2.46           |
| 15ms    | 0.741     | 2.22           |
| 25ms    | 0.607     | 1.82           |
| 40ms    | 0.449     | 1.35           |
| 60ms    | 0.301     | 0.90           |
| 80ms    | 0.202     | 0.61           |
| 120ms   | 0.091     | 0.27           |

The 7:3 weighting means accuracy dominates (~70% of a perfect score). A player who nails the tempo but taps sloppily can still score 7. A player with perfect consistency at the wrong tempo caps around 3–4. This matches the game's core loop — the challenge is hearing and reproducing the right BPM, not just tapping steadily.

The consistency decay (0.02) is deliberately slower than accuracy's. A player with 40ms stddev (fairly sloppy) still retains ~45% of their consistency points, so rhythm doesn't tank an otherwise decent attempt. But a metronomic player (sub-10ms) earns a real advantage — roughly +1.5 points over a 50ms player.

### Tap bonus (0–0.5 points)

Rewards engagement — how many beats you actually tapped vs. how many fit in the phase.

```
expectedIntervals = floor(phase2Duration / targetInterval)
tapRatio          = min(1, intervals.length / expectedIntervals)
tapBonus          = round(tapRatio × 0.5, 2)
```

Examples at 4s phase:

| BPM | Target interval | Expected intervals | Full bonus requires |
|-----|----------------|--------------------|---------------------|
| 80  | 750ms          | 5                  | 6 taps              |
| 100 | 600ms          | 6                  | 7 taps              |
| 120 | 500ms          | 8                  | 9 taps              |
| 140 | 428ms          | 9                  | 10 taps             |
| 160 | 375ms          | 10                 | 11 taps             |

The bonus is capped at 0.5 — enough to push across a rounding boundary (e.g., 8.4 → 9) but not enough to carry bad accuracy. Half engagement (e.g., 4 of 8 expected intervals) earns +0.25.

### Combined score table

Full engagement (max tap bonus) assumed:

| Deviation | Std Dev | Accuracy | Consistency | Tap bonus | Raw   | Score |
|-----------|---------|----------|-------------|-----------|-------|-------|
| 0%        | 0ms     | 7.00     | 3.00        | 0.50      | 10.50 | 10    |
| 0.5%      | 10ms    | 6.59     | 2.46        | 0.50      | 9.55  | 10    |
| 1%        | 15ms    | 6.21     | 2.22        | 0.50      | 8.93  | 9     |
| 1.5%      | 20ms    | 5.85     | 2.01        | 0.50      | 8.36  | 8     |
| 2%        | 25ms    | 5.51     | 1.82        | 0.50      | 7.83  | 8     |
| 3%        | 40ms    | 4.88     | 1.35        | 0.50      | 6.73  | 7     |
| 5%        | 50ms    | 3.84     | 1.10        | 0.50      | 5.44  | 5     |
| 7%        | 60ms    | 3.02     | 0.90        | 0.50      | 4.42  | 4     |
| 10%       | 80ms    | 2.11     | 0.61        | 0.50      | 3.22  | 3     |
| 15%       | 100ms   | 1.16     | 0.41        | 0.50      | 2.07  | 2     |
| 20%+      | 120ms+  | 0.64     | 0.27        | 0.50      | 1.41  | 1     |

Without full engagement, subtract up to 0.5 from the raw column. That shifts several boundaries down by one (e.g., a raw 9.55 → 9.05 still rounds to 9, but a raw 8.93 → 8.43 drops from 9 to 8).

---

## Design notes

### Why exponential decay

Linear scoring creates sharp cutoffs and doesn't model human perception well. A player at 1% deviation and 2% deviation should feel close in score, while a player at 1% and 10% should feel far apart. Exponential decay naturally compresses the top of the range (where small differences matter most) and spreads the bottom (where large deviations are all "bad").

### Why deviation % instead of absolute drift

A 5ms drift at 80 BPM (750ms interval) is 0.67% — negligible. The same 5ms at 160 BPM (375ms interval) is 1.33% — noticeable. Percentage deviation treats both BPMs fairly. Without this, fast songs would be significantly harder to score on.

### Why absolute stddev for consistency

The opposite choice: consistency is measured in absolute ms, not percentage. At fast tempos, a 25ms stddev represents a larger fraction of the beat interval and is genuinely harder to achieve. This is intentional — fast tempos *should* be harder to keep steady, and the scoring reflects that. The effect is modest across the 80–160 BPM range (stddev as % of interval ranges from 3.3% to 6.7% for the same 25ms threshold).

### Score boundaries

- **10**: sub-0.5% deviation, sub-10ms stddev, full engagement. ~2.5ms of drift at 120 BPM. Achievable on real hardware but requires a near-perfect run.
- **9**: sub-1% deviation. Consistent practice territory.
- **7–8**: 1.5–3% deviation. Good rhythm sense, room to improve.
- **5–6**: 3–5% deviation. Modal player range — close but not locked in.
- **3–4**: 7–10% deviation. Clearly off but still trying.
- **1–2**: 15%+ deviation. Not engaged or fundamentally wrong tempo.

### Constants reference

| Constant              | Value  | Used in    |
|-----------------------|--------|------------|
| `BPM_MIN`             | 80     | Both       |
| `BPM_MAX`             | 160    | Both       |
| `MIN_TAPS_TO_SCORE`   | 4      | Both       |
| `PHASE1` (easy)       | 6000ms | Easy       |
| `PHASE2` (easy)       | 6000ms | Easy       |
| `PHASE1` (hard)       | 4000ms | Hard       |
| `PHASE2` (hard)       | 4000ms | Hard       |
| `ACCURACY_WEIGHT`     | 7      | Hard       |
| `ACCURACY_DECAY`      | 12     | Hard       |
| `CONSISTENCY_WEIGHT`  | 3      | Hard       |
| `CONSISTENCY_DECAY`   | 0.02   | Hard       |
| `TAP_BONUS_MAX`       | 0.5    | Hard       |
| `TAP_DEBOUNCE_MS`     | 50     | Client     |
