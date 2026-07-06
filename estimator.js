/**
 * Death Clock — transparent life expectancy estimator.
 * Baseline: U.S. period life tables, 2023 (NCHS NVSR 74-06).
 * Adjustments: published hazard ratios / years-of-life-lost estimates.
 */
(function (root) {
  "use strict";

  const CURRENT_YEAR = 2026;
  const LIFE_TABLE_SOURCE = "NCHS NVSR 74-06 (2023 U.S. period life tables)";

  // e_x remaining years — ages 18–95 from CDC NVSR 74-06 Tables 2–3.
  const LIFE_TABLE = {
    male: [
      58.6, 57.7, 56.7, 55.8, 54.9, 53.9, 53.0, 52.1, 51.2, 50.3, 49.4, 48.4, 47.5, 46.6,
      45.7, 44.9, 44.0, 43.1, 42.2, 41.3, 40.4, 39.5, 38.6, 37.8, 36.9, 36.0, 35.1, 34.3,
      33.4, 32.5, 31.7, 30.8, 30.0, 29.1, 28.3, 27.4, 26.6, 25.8, 25.0, 24.2, 23.4, 22.6,
      21.9, 21.1, 20.4, 19.6, 18.9, 18.2, 17.5, 16.8, 16.1, 15.4, 14.7, 14.1, 13.4, 12.8,
      12.1, 11.5, 10.9, 10.3, 9.7, 9.1, 8.5, 8.0, 7.5, 7.0, 6.5, 6.1, 5.6, 5.2, 4.8, 4.5,
      4.1, 3.8, 3.5, 3.3, 3.0, 2.8,
    ],
    female: [
      63.7, 62.7, 61.8, 60.8, 59.8, 58.9, 57.9, 56.9, 56.0, 55.0, 54.0, 53.1, 52.1, 51.2,
      50.2, 49.3, 48.3, 47.4, 46.4, 45.5, 44.5, 43.6, 42.7, 41.7, 40.8, 39.9, 39.0, 38.0,
      37.1, 36.2, 35.3, 34.4, 33.5, 32.6, 31.7, 30.8, 29.9, 29.0, 28.2, 27.3, 26.5, 25.6,
      24.8, 23.9, 23.1, 22.3, 21.5, 20.7, 19.9, 19.1, 18.4, 17.6, 16.8, 16.1, 15.3, 14.6,
      13.9, 13.2, 12.5, 11.8, 11.1, 10.5, 9.9, 9.2, 8.7, 8.1, 7.6, 7.0, 6.5, 6.1, 5.6, 5.2,
      4.8, 4.5, 4.1, 3.8, 3.5, 3.3,
    ],
  };

  // Cooper Institute ACLS norms — ACSM GETP 11th ed. Table 4.7 (ml/kg/min).
  // Percentile breakpoints: 5, 10, 25, 50, 75, 90, 95 by age decade 20–29 … 70–79.
  const VO2_NORMS_SOURCE =
    "Cooper Institute ACLS / ACSM GETP 11th ed. Table 4.7";
  const COOPER_VO2_NORMS = {
    male: [
      { p: [5, 10, 25, 50, 75, 90, 95], v: [32.1, 35.4, 40.1, 48.0, 55.2, 61.8, 66.3] },
      { p: [5, 10, 25, 50, 75, 90, 95], v: [27.2, 30.2, 35.9, 42.4, 49.2, 56.5, 59.8] },
      { p: [5, 10, 25, 50, 75, 90, 95], v: [24.2, 26.8, 31.9, 37.8, 45.0, 52.1, 55.6] },
      { p: [5, 10, 25, 50, 75, 90, 95], v: [20.9, 22.8, 27.1, 32.6, 39.7, 45.6, 50.7] },
      { p: [5, 10, 25, 50, 75, 90, 95], v: [17.4, 19.8, 23.7, 28.2, 34.5, 40.3, 43.0] },
      { p: [5, 10, 25, 50, 75, 90, 95], v: [16.3, 17.1, 20.4, 24.4, 30.4, 36.6, 39.7] },
    ],
    female: [
      { p: [5, 10, 25, 50, 75, 90, 95], v: [21.7, 23.9, 30.5, 37.6, 44.7, 51.3, 56.0] },
      { p: [5, 10, 25, 50, 75, 90, 95], v: [19.0, 20.9, 25.3, 30.2, 36.1, 41.4, 45.8] },
      { p: [5, 10, 25, 50, 75, 90, 95], v: [17.0, 18.8, 22.1, 26.7, 32.4, 38.4, 41.7] },
      { p: [5, 10, 25, 50, 75, 90, 95], v: [16.0, 17.3, 19.9, 23.4, 27.6, 32.0, 35.9] },
      { p: [5, 10, 25, 50, 75, 90, 95], v: [13.4, 14.6, 17.2, 20.0, 23.8, 27.0, 29.4] },
      { p: [5, 10, 25, 50, 75, 90, 95], v: [13.1, 13.6, 15.6, 18.3, 20.8, 23.1, 24.1] },
    ],
  };
  const VO2_CATEGORY_PERCENTILES = [20, 40, 60, 80, 95];

  const VO2_LABELS = [
    "Poor",
    "Below Average",
    "Average",
    "Above Average",
    "Excellent",
    "Elite",
  ];

  const VO2_ADJUSTMENTS = {
    Poor: -5.0,
    "Below Average": -2.5,
    Average: 0,
    "Above Average": 2.0,
    Excellent: 4.0,
    Elite: 6.0,
  };

  const HEIGHT_IN_MIN = 48;
  const HEIGHT_IN_MAX = 84;
  const WEIGHT_LBS_MIN = 50;
  const WEIGHT_LBS_MAX = 400;

  const SMOKING_ADJ = { never: 0, former: -2.0, current: -8.0 };
  const BP_ADJ = { optimal: 0, normal: -0.5, elevated: -1.5, high: -3.5 };
  const DIABETES_ADJ = { none: 0, prediabetes: -1.0, type2: -2.5 };
  const DIET_ADJ = { excellent: 2.0, good: 1.0, average: 0, poor: -2.0 };

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function baseRemainingYears(age, sex) {
    const idx = clamp(Math.round(age), 18, 95) - 18;
    const table = sex === "female" ? LIFE_TABLE.female : LIFE_TABLE.male;
    return table[idx];
  }

  function calculateBmi(heightIn, weightLbs) {
    return (703 * weightLbs) / (heightIn * heightIn);
  }

  // Achievable BMI extremes from height/weight sliders (light+tall … heavy+short).
  function bmiRangeFromSliders() {
    return {
      min: calculateBmi(HEIGHT_IN_MAX, WEIGHT_LBS_MIN),
      max: calculateBmi(HEIGHT_IN_MIN, WEIGHT_LBS_MAX),
    };
  }

  const BMI_RANGE = bmiRangeFromSliders();

  function bmiCategory(bmi) {
    if (bmi < 18.5) return { label: "Underweight", key: "underweight" };
    if (bmi < 25) return { label: "Normal", key: "normal" };
    if (bmi < 30) return { label: "Overweight", key: "overweight" };
    if (bmi < 35) return { label: "Obese I", key: "obese1" };
    if (bmi < 40) return { label: "Obese II", key: "obese2" };
    return { label: "Obese III", key: "obese3" };
  }

  // U-shaped: lowest risk ~22–26; penalties rise for underweight and obesity.
  function bmiAdjustment(bmi) {
    if (bmi < 17) return -4.0;
    if (bmi < 18.5) return -2.5;
    if (bmi < 22) {
      const t = (bmi - 18.5) / 3.5;
      return -0.5 + t * 0.5;
    }
    if (bmi <= 26) return 0;
    if (bmi < 30) return -((bmi - 26) / 4);
    if (bmi < 35) return -1.0 - ((bmi - 30) / 5) * 1.5;
    if (bmi < 40) return -2.5 - ((bmi - 35) / 5) * 2.0;
    if (bmi < 45) return -4.5 - ((bmi - 40) / 5) * 2.0;
    return -6.5;
  }

  function vo2NormBandIndex(age) {
    if (age < 30) return 0;
    if (age < 40) return 1;
    if (age < 50) return 2;
    if (age < 60) return 3;
    if (age < 70) return 4;
    return 5;
  }

  function vo2AtPercentile(norms, targetPct) {
    const { p, v } = norms;
    if (targetPct <= p[0]) return v[0];
    if (targetPct >= p[p.length - 1]) return v[v.length - 1];
    for (let i = 0; i < p.length - 1; i += 1) {
      if (targetPct >= p[i] && targetPct <= p[i + 1]) {
        const t = (targetPct - p[i]) / (p[i + 1] - p[i]);
        return v[i] + t * (v[i + 1] - v[i]);
      }
    }
    return v[v.length - 1];
  }

  function vo2CategoryCuts(age, sex) {
    const norms =
      COOPER_VO2_NORMS[sex === "female" ? "female" : "male"][vo2NormBandIndex(age)];
    return VO2_CATEGORY_PERCENTILES.map((pct) => vo2AtPercentile(norms, pct));
  }

  function vo2Category(vo2, age, sex) {
    const [poor, below, avg, above, exc] = vo2CategoryCuts(age, sex);
    if (vo2 < poor) return VO2_LABELS[0];
    if (vo2 < below) return VO2_LABELS[1];
    if (vo2 < avg) return VO2_LABELS[2];
    if (vo2 < above) return VO2_LABELS[3];
    if (vo2 < exc) return VO2_LABELS[4];
    return VO2_LABELS[5];
  }

  function vo2Adjustment(category, age) {
    const base = VO2_ADJUSTMENTS[category] ?? 0;
    const ageScale = age >= 70 ? 0.75 : age >= 55 ? 0.9 : 1;
    return base * ageScale;
  }

  function formatSigned(value) {
    const rounded = Math.round(value * 10) / 10;
    if (rounded > 0) return `+${rounded}`;
    if (rounded < 0) return `${rounded}`;
    return "0";
  }

  function subscriptAge(age) {
    const digits = "₀₁₂₃₄₅₆₇₈₉";
    return String(age).replace(/\d/g, (d) => digits[d]);
  }

  function estimate(inputs) {
    const age = clamp(Number(inputs.age) || 42, 18, 95);
    const sex = inputs.sex === "female" ? "female" : "male";
    const heightIn = clamp(Number(inputs.heightIn) || 69, HEIGHT_IN_MIN, HEIGHT_IN_MAX);
    const weightLbs = clamp(Number(inputs.weightLbs) || 168, WEIGHT_LBS_MIN, WEIGHT_LBS_MAX);
    const vo2 = clamp(Number(inputs.vo2) || 38, 18, 70);
    const bmi = calculateBmi(heightIn, weightLbs);
    const smoking = inputs.smoking || "never";
    const bp = inputs.bp || "normal";
    const diabetes = inputs.diabetes || "none";
    const diet = inputs.diet || "average";

    const base = baseRemainingYears(age, sex);
    const vo2Cat = vo2Category(vo2, age, sex);
    const bmiCat = bmiCategory(bmi);

    const deltaVo2 = vo2Adjustment(vo2Cat, age);
    const deltaBmi = bmiAdjustment(bmi);
    const deltaSmoke = SMOKING_ADJ[smoking] ?? 0;
    const deltaBp = BP_ADJ[bp] ?? 0;
    const deltaDiabetes = DIABETES_ADJ[diabetes] ?? 0;
    const deltaDiet = DIET_ADJ[diet] ?? 0;

    const remaining = clamp(
      base + deltaVo2 + deltaBmi + deltaSmoke + deltaBp + deltaDiabetes + deltaDiet,
      0.5,
      75
    );

    const deathAge = Math.round(age + remaining);
    const deathYear = CURRENT_YEAR + Math.round(remaining);
    const ageSub = subscriptAge(age);
    const formula = `e${ageSub}=${base.toFixed(1)} + Δfit=${formatSigned(deltaVo2)} + ΔBMI=${formatSigned(deltaBmi)} + Δsmoke=${formatSigned(deltaSmoke)} + ΔBP=${formatSigned(deltaBp)} + ΔDM=${formatSigned(deltaDiabetes)} + Δdiet=${formatSigned(deltaDiet)}`;

    return {
      age,
      sex,
      heightIn,
      weightLbs,
      vo2,
      bmi,
      smoking,
      bp,
      diabetes,
      diet,
      base,
      vo2Category: vo2Cat,
      bmiCategory: bmiCat,
      adjustments: {
        vo2: deltaVo2,
        bmi: deltaBmi,
        smoking: deltaSmoke,
        bp: deltaBp,
        diabetes: deltaDiabetes,
        diet: deltaDiet,
      },
      remainingYears: remaining,
      deathAge,
      deathYear,
      formula,
    };
  }

  root.DeathEstimator = {
    estimate,
    calculateBmi,
    bmiRangeFromSliders,
    bmiCategory,
    vo2Category,
    vo2CategoryCuts,
    vo2AtPercentile,
    VO2_LABELS,
    VO2_NORMS_SOURCE,
    COOPER_VO2_NORMS,
    HEIGHT_IN_MIN,
    HEIGHT_IN_MAX,
    WEIGHT_LBS_MIN,
    WEIGHT_LBS_MAX,
    BMI_RANGE,
    CURRENT_YEAR,
    LIFE_TABLE_SOURCE,
  };
})(typeof window !== "undefined" ? window : globalThis);