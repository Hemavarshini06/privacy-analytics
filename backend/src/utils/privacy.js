// Differential Privacy Utilities
// Laplace Mechanism: Noisy Count = Actual Count + Laplace(0, sensitivity/epsilon)

/**
 * Generate a Laplace distributed random variable
 * Using inverse CDF method: Laplace(0, b) = -b * sign(U) * ln(1 - 2|U|)
 * where U is uniform on [-0.5, 0.5]
 */
function laplaceNoise(sensitivity, epsilon) {
  if (epsilon <= 0) throw new Error('Epsilon must be positive');
  const b = sensitivity / epsilon;
  const u = Math.random() - 0.5;
  return -b * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
}

/**
 * Apply Laplace mechanism to a count query
 * @param {number} actualCount - The true count
 * @param {number} epsilon - Privacy budget parameter (smaller = more private)
 * @param {number} sensitivity - Global sensitivity (default 1 for count queries)
 * @returns {object} { noisyCount, noiseAdded, epsilon }
 */
function applyLaplaceMechanism(actualCount, epsilon, sensitivity = 1) {
  const noise = laplaceNoise(sensitivity, epsilon);
  const noisyCount = Math.max(0, Math.round(actualCount + noise));
  return {
    actualCount,
    noisyCount,
    noiseAdded: noise,
    epsilon,
    sensitivity,
    scale: sensitivity / epsilon,
    privacyLevel: getPrivacyLevel(epsilon),
  };
}

/**
 * Compute accuracy metrics between actual and noisy counts
 */
function computeAccuracy(actualCounts, noisyCounts) {
  if (actualCounts.length !== noisyCounts.length) throw new Error('Array length mismatch');
  
  const errors = actualCounts.map((a, i) => Math.abs(a - noisyCounts[i]));
  const relativeErrors = actualCounts.map((a, i) => 
    a > 0 ? Math.abs(a - noisyCounts[i]) / a * 100 : 0
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
 * Get privacy level label based on epsilon
 */
function getPrivacyLevel(epsilon) {
  if (epsilon <= 0.1) return 'Very High Privacy';
  if (epsilon <= 0.5) return 'High Privacy';
  if (epsilon <= 1.0) return 'Standard Privacy';
  if (epsilon <= 2.0) return 'Moderate Privacy';
  return 'Low Privacy';
}

/**
 * Compute privacy budget warning level
 */
function getBudgetWarning(used, total) {
  const ratio = used / total;
  if (ratio >= 0.9) return { level: 'critical', message: 'Privacy budget nearly exhausted!' };
  if (ratio >= 0.7) return { level: 'warning', message: 'Privacy budget running low' };
  if (ratio >= 0.5) return { level: 'moderate', message: 'Privacy budget at 50%' };
  return { level: 'ok', message: 'Privacy budget healthy' };
}

/**
 * Check for failure cases
 */
function checkFailureCases(data) {
  const warnings = [];
  
  if (data.totalSessions < 100) {
    warnings.push({
      type: 'low_traffic',
      severity: 'warning',
      message: `Low traffic warning: Only ${data.totalSessions} sessions detected. Results may be unreliable.`,
    });
  }
  
  if (data.consentRate < 0.5) {
    warnings.push({
      type: 'no_consent',
      severity: 'warning',
      message: `Low consent data: Only ${(data.consentRate * 100).toFixed(1)}% of sessions have consent. Analytics may be skewed.`,
    });
  }
  
  if (data.epsilon < 0.1) {
    warnings.push({
      type: 'very_small_epsilon',
      severity: 'caution',
      message: `Very small epsilon (${data.epsilon}): Noise will be very high, results will be highly inaccurate.`,
    });
  }

  return warnings;
}

module.exports = { 
  laplaceNoise, 
  applyLaplaceMechanism, 
  computeAccuracy, 
  getPrivacyLevel, 
  getBudgetWarning, 
  checkFailureCases 
};
