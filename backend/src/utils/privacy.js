// Differential Privacy Utilities
// Laplace Mechanism: Noisy Count = Actual Count + Laplace(0, sensitivity/epsilon)

/**
 * Validate that an epsilon parameter is mathematically sound and positive.
 */
function validateEpsilon(epsilon) {
  const eps = parseFloat(epsilon);
  if (isNaN(eps) || !isFinite(eps)) {
    throw new Error('Epsilon must be a valid finite number');
  }
  if (eps <= 0) {
    throw new Error('Epsilon must be positive (greater than 0)');
  }
  return eps;
}

/**
 * Generate a Laplace distributed random variable
 * Using inverse CDF method: Laplace(0, b) = -b * sign(U) * ln(1 - 2|U|)
 * where U is uniform on [-0.5, 0.5]
 */
function laplaceNoise(sensitivity, epsilon) {
  const sens = sensitivity !== undefined ? parseFloat(sensitivity) : 1.0;
  if (isNaN(sens) || sens <= 0) throw new Error('Sensitivity must be positive');
  const eps = validateEpsilon(epsilon);
  
  const b = sens / eps;
  // Uniform in [-0.5, 0.5] avoiding exact boundaries
  const u = Math.random() - 0.5;
  const clampedU = Math.max(-0.4999999999, Math.min(0.4999999999, u));
  return -b * Math.sign(clampedU) * Math.log(1 - 2 * Math.abs(clampedU));
}

/**
 * Apply Laplace mechanism to a count query
 * Ensures noisy count CANNOT become negative (floor at 0)
 * @param {number} actualCount - The true count
 * @param {number} epsilon - Privacy budget parameter (smaller = more private)
 * @param {number} sensitivity - Global sensitivity (default 1 for count queries)
 * @returns {object} { noisyCount, noiseAdded, epsilon, ... }
 */
function applyLaplaceMechanism(actualCount, epsilon, sensitivity = 1) {
  const eps = validateEpsilon(epsilon);
  const validCount = Math.max(0, Math.round(parseFloat(actualCount) || 0));
  const noise = laplaceNoise(sensitivity, eps);
  // Ensure non-negative count
  const noisyCount = Math.max(0, Math.round(validCount + noise));

  return {
    actualCount: validCount,
    noisyCount,
    noiseAdded: noise,
    epsilon: eps,
    sensitivity,
    scale: sensitivity / eps,
    privacyLevel: getPrivacyLevel(eps),
  };
}

/**
 * Calculate Mean Absolute Error (MAE) between two arrays of numbers
 */
function calculateMAE(actualCounts, noisyCounts) {
  if (!Array.isArray(actualCounts) || !Array.isArray(noisyCounts)) {
    throw new Error('Inputs must be arrays');
  }
  if (actualCounts.length === 0) return 0;
  if (actualCounts.length !== noisyCounts.length) {
    throw new Error('Array length mismatch for MAE calculation');
  }

  const sumError = actualCounts.reduce((sum, actual, idx) => {
    return sum + Math.abs(actual - noisyCounts[idx]);
  }, 0);

  return parseFloat((sumError / actualCounts.length).toFixed(2));
}

/**
 * Compute accuracy metrics between actual and noisy counts
 */
function computeAccuracy(actualCounts, noisyCounts) {
  if (actualCounts.length !== noisyCounts.length) throw new Error('Array length mismatch');
  if (actualCounts.length === 0) {
    return {
      meanAbsoluteError: "0.00",
      meanRelativeError: "0.00",
      accuracyPercent: "100.00",
      errorPercent: "0.00",
    };
  }
  
  const errors = actualCounts.map((a, i) => Math.abs(a - noisyCounts[i]));
  const relativeErrors = actualCounts.map((a, i) => 
    a > 0 ? (Math.abs(a - noisyCounts[i]) / a) * 100 : 0
  );
  
  const meanAbsError = errors.reduce((s, e) => s + e, 0) / errors.length;
  const meanRelError = relativeErrors.reduce((s, e) => s + e, 0) / relativeErrors.length;
  const accuracy = Math.max(0, 100 - meanRelError);

  return {
    meanAbsoluteError: meanAbsError.toFixed(2),
    meanRelativeError: meanRelError.toFixed(2),
    accuracyPercent: accuracy.toFixed(2),
    errorPercent: meanRelError.toFixed(2),
  };
}

/**
 * Multi-epsilon evaluation across 0.1, 0.5, 1.0
 */
function evaluateMultiEpsilon(stageCounts, epsilons = [0.1, 0.5, 1.0], iterations = 15) {
  const actuals = stageCounts.map(s => (typeof s === 'number' ? s : s.count || 0));

  const evaluations = epsilons.map(eps => {
    validateEpsilon(eps);
    const theoreticalScale = 1.0 / eps; // E[|Laplace|] = b = 1/eps

    // Run multiple trials to obtain statistically robust empirical metrics
    const iterationMAEs = [];
    const lastTrialNoisy = [];

    for (let it = 0; it < iterations; it++) {
      const trialNoisy = actuals.map(act => applyLaplaceMechanism(act, eps).noisyCount);
      iterationMAEs.push(calculateMAE(actuals, trialNoisy));
      if (it === iterations - 1) {
        lastTrialNoisy.push(...trialNoisy);
      }
    }

    const empiricalMAE = parseFloat(
      (iterationMAEs.reduce((a, b) => a + b, 0) / iterations).toFixed(2)
    );
    const acc = computeAccuracy(actuals, lastTrialNoisy);

    return {
      epsilon: eps,
      privacyLevel: getPrivacyLevel(eps),
      theoreticalMAE: parseFloat(theoreticalScale.toFixed(2)),
      empiricalMAE,
      accuracyPercent: parseFloat(acc.accuracyPercent),
      errorPercent: parseFloat(acc.errorPercent),
      noisyCounts: lastTrialNoisy,
    };
  });

  return evaluations;
}

/**
 * Get privacy level label based on epsilon
 */
function getPrivacyLevel(epsilon) {
  if (epsilon <= 0.1) return 'Very High Privacy (ε=0.1)';
  if (epsilon <= 0.5) return 'High Privacy (ε=0.5)';
  if (epsilon <= 1.0) return 'Standard Privacy (ε=1.0)';
  if (epsilon <= 2.0) return 'Moderate Privacy (ε=2.0)';
  return 'Low Privacy (ε>2.0)';
}

/**
 * Compute privacy budget warning level
 */
function getBudgetWarning(used, total) {
  const u = Math.max(0, parseFloat(used) || 0);
  const t = Math.max(0.1, parseFloat(total) || 10.0);
  const ratio = u / t;

  if (ratio >= 0.9) return { level: 'critical', message: 'Privacy budget nearly exhausted (≥90%)!' };
  if (ratio >= 0.7) return { level: 'warning', message: 'Privacy budget running low (≥70%)' };
  if (ratio >= 0.5) return { level: 'moderate', message: 'Privacy budget at 50%' };
  return { level: 'ok', message: 'Privacy budget healthy' };
}

/**
 * Check for failure cases
 */
function checkFailureCases(data) {
  const warnings = [];
  const total = data.totalSessions !== undefined ? data.totalSessions : 0;
  const consent = data.consentRate !== undefined ? data.consentRate : 1.0;
  const eps = data.epsilon !== undefined ? data.epsilon : 1.0;
  
  if (total < 100) {
    warnings.push({
      type: 'low_traffic',
      severity: 'warning',
      message: `Low traffic warning: Only ${total} sessions detected (<100). Noise may dominate actual trends.`,
    });
  }
  
  if (consent < 0.5) {
    warnings.push({
      type: 'no_consent',
      severity: 'warning',
      message: `Low consent data: Only ${(consent * 100).toFixed(1)}% of sessions have consent. Analytics may have selection bias.`,
    });
  }
  
  if (eps < 0.1) {
    warnings.push({
      type: 'very_small_epsilon',
      severity: 'caution',
      message: `Very small epsilon (${eps}): High variance noise added. Counts may have high inaccuracy.`,
    });
  }

  return warnings;
}

module.exports = { 
  validateEpsilon,
  laplaceNoise, 
  applyLaplaceMechanism,
  calculateMAE,
  computeAccuracy, 
  evaluateMultiEpsilon,
  getPrivacyLevel, 
  getBudgetWarning, 
  checkFailureCases 
};
