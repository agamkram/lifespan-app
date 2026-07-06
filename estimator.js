/**
 * Death Clock — transparent life expectancy estimator.
 * Baseline: U.S. period life tables, 2021 (NCHS NVSR 72-12).
 * Adjustments: published hazard ratios / years-of-life-lost estimates.
 */
(function (root) {
  "use strict";

  const CURRENT_YEAR = 2026;
  const LIFE_TABLE_SOURCE = "NCHS NVSR 72-12 (2021 U.S. period life tables)";

  // e_x remaining years — interpolated from published CDC 2021 anchor ages.
  const LIFE_TABLE = {
    male: [
      56.3, 55.4, 54.4, 53.5, 52.6, 51.7, 50.8, 49.9, 49.0, 48.1, 47.2, 46.3, 45.4, 44.5,
      43.6, 42.7, 41.8, 40.9, 40.0, 39.1, 38.2, 37.3, 36.4, 35.5, 34.6, 33.7, 32.8, 31.9,
      31.0, 30.1, 29.2, 28.3, 27.4, 26.5, 25.6, 24.7, 23.8, 22.9, 22.0, 21.1, 20.2, 19.3,
      18.4, 18.1, 17.8, 17.6, 17.3, 17.0, 15.6, 14.2, 12.8, 11.4, 10.0, 9.3, 8.6, 7.8, 7.1,
      6.4, 5.8, 5.3, 4.7, 4.2, 3.6, 3.2, 2.8, 2.5, 2.1, 1.7, 1.5, 1.3, 1.1, 0.9, 0.7, 0.6,
      0.5, 0.5, 0.4, 0.3,
    ],
    female: [
      61.6, 60.6, 59.6, 58.7, 57.8, 56.9, 56.0, 55.1, 54.2, 53.3, 52.4, 51.5, 50.6, 49.7,
      48.8, 47.9, 47.0, 46.1, 45.2, 44.3, 43.4, 42.5, 41.6, 40.7, 39.8, 38.9, 38.0, 37.1,
      36.2, 35.3, 34.4, 33.5, 32.6, 31.7, 30.8, 29.9, 29.0, 28.1, 27.2, 26.3, 25.4, 24.5,
      23.6, 22.8, 22.0, 21.3, 20.5, 19.7, 18.8, 17.9, 17.0, 16.1, 15.2, 14.4, 13.6, 12.8,
      12.0, 11.2, 10.5, 9.8, 9.0, 8.3, 7.6, 7.0, 6.4, 5.7, 5.1, 4.5, 4.0, 3.5, 3.0, 2.5, 2.0,
      1.7, 1.5, 1.2, 1.0, 0.7,
    ],
  };

  const VO2_THRESHOLDS = {
    male: [
      { maxAge: 29, cuts: [42, 46, 52, 56, 62] },
      { maxAge: 39, cuts: [39, 43, 49, 53, 58] },
      { maxAge: 49, cuts: [36, 40, 45, 49, 54] },
      { maxAge: 59, cuts: [32, 36, 41, 45, 50] },
      { maxAge: 69, cuts: [28, 32, 37, 41, 45] },
      { maxAge: 120, cuts: [25, 29, 34, 38, 42] },
    ],
    female: [
      { maxAge: 29, cuts: [35, 39, 44, 48, 53] },
      { maxAge: 39, cuts: [32, 36, 41, 45, 49] },
      { maxAge: 49, cuts: [28, 32, 37, 41, 45] },
      { maxAge: 59, cuts: [25, 29, 34, 38, 42] },
      { maxAge: 69, cuts: [22, 26, 31, 35, 39] },
      { maxAge: 120, cuts: [20, 24, 28, 32, 36] },
    ],
  };

  const VO2_LABELS = [
    "Poor",
    "Below Average",
    "Average",
    "Above Average",
    "Excellent",
    "Elite",
  ];

  const VO2_ADJUSTMENTS = {
    Poor: -4.0,
    "Below Average": -2.0,
    Average: 0,
    "Above Average": 2.0,
    Excellent: 3.5,
    Elite: 5.0,
  };

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

  function bmiCategory(bmi) {
    if (bmi < 18.5) return { label: "Underweight", key: "underweight" };
    if (bmi < 25) return { label: "Normal", key: "normal" };
    if (bmi < 30) return { label: "Overweight", key: "overweight" };
    if (bmi < 35) return { label: "Obese I", key: "obese1" };
    if (bmi < 40) return { label: "Obese II", key: "obese2" };
    return { label: "Obese III", key: "obese3" };
  }

  function bmiAdjustment(bmi) {
    if (bmi < 18.5) return -1.5;
    if (bmi < 25) return 0;
    if (bmi < 30) return -0.5;
    if (bmi < 35) return -1.5;
    if (bmi < 40) return -3.0;
    return -5.0;
  }

  function vo2Category(vo2, age, sex) {
    const bands = VO2_THRESHOLDS[sex === "female" ? "female" : "male"];
    const band = bands.find((b) => age <= b.maxAge) || bands[bands.length - 1];
    const [poor, below, avg, above, exc] = band.cuts;
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

  function estimate(inputs) {
    const age = clamp(Number(inputs.age) || 42, 18, 95);
    const sex = inputs.sex === "female" ? "female" : "male";
    const vo2 = clamp(Number(inputs.vo2) || 38, 18, 70);
    const bmi = clamp(Number(inputs.bmi) || 25, 15, 45);
    const smoking = inputs.smoking || "never";
    const bp = inputs.bp || "optimal";
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

    const formula = [
      `R = e${age}(${sex === "male" ? "M" : "F"}) + Δfitness + ΔBMI + Δsmoke + ΔBP + Δdiabetes + Δdiet`,
      `e${age} = ${base.toFixed(1)} yr (${LIFE_TABLE_SOURCE})`,
      `Δfitness = ${formatSigned(deltaVo2)} (${vo2Cat})`,
      `ΔBMI = ${formatSigned(deltaBmi)} (${bmiCat.label})`,
      `Δsmoke = ${formatSigned(deltaSmoke)}`,
      `ΔBP = ${formatSigned(deltaBp)}`,
      `Δdiabetes = ${formatSigned(deltaDiabetes)}`,
      `Δdiet = ${formatSigned(deltaDiet)}`,
      `R = ${remaining.toFixed(1)} yr → death age ${deathAge}, year ${deathYear}`,
    ].join(" · ");

    return {
      age,
      sex,
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
    bmiCategory,
    vo2Category,
    VO2_LABELS,
    CURRENT_YEAR,
    LIFE_TABLE_SOURCE,
  };
})(typeof window !== "undefined" ? window : globalThis);