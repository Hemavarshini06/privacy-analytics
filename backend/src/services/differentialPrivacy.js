/**
 * Differential Privacy Engine
 * Implements the Laplace mechanism for epsilon-DP analytics.
 *
 * Core formula: Noisy Count = True Count + Laplace(0, sensitivity / epsilon)
 */

class DifferentialPrivacy {
  constructor(epsilon = 1.0, sensitivity = 1.0, mechanism = 'laplace') {
    if (epsilon <= 0) throw new Error('Epsilon must be positive');
    if (sensitivity <= 0) throw new Error('Sensitivity must be positive');
    this.epsilon = epsilon;
    this.sensitivity = sensitivity;
    this.mechanism = mechanism;
    this.scale = sensitivity / epsilon;
  }

  /**
   * Sample from Laplace distribution using inverse CDF method.
   * Laplace(0, b) where b = sensitivity/epsilon
   */
  laplaceSample(scale) {
    const u = Math.random() - 0.5;
    return -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
  }

  /**
   * Sample from Gaussian distribution using Box-Muller transform.
   */
  gaussianSample(sigma) {
    let u1, u2;
    do {
      u1 = Math.random();
      u2 = Math.random();
    } while (u1 === 0);
    return sigma * Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  }

  /**
   * Add calibrated noise to a true count.
   * Returns Math.max(0, rounded noisy count) to avoid negative counts.
   */
  addNoise(trueCount) {
    let noise;
    if (this.mechanism === 'laplace') {
      noise = this.laplaceSample(this.scale);
    } else {
      const sigma = this.scale * Math.sqrt(2 * Math.log(1.25 / 0.05));
      noise = this.gaussianSample(sigma);
    }
    const noisyCount = trueCount + noise;
    return {
      noisyCount: Math.max(0, Math.round(noisyCount)),
      noise: Math.round(noise * 100) / 100,
      noiseMagnitude: Math.abs(Math.round(noise * 100) / 100),
    };
  }

  /**
   * Apply DP noise to an entire funnel (array of stage objects).
   */
  noisyFunnel(stages) {
    return stages.map((stage) => {
      const enteredResult = this.addNoise(stage.entered || 0);
      const completedResult = this.addNoise(stage.completed || 0);
      return {
        ...stage,
        noisyEntered: enteredResult.noisyCount,
        noisyCompleted: completedResult.noisyCount,
        enteredNoise: enteredResult.noiseMagnitude,
        completedNoise: completedResult.noiseMagnitude,
        noisyConversionRate:
          enteredResult.noisyCount > 0
            ? Math.min(1, completedResult.noisyCount / enteredResult.noisyCount)
            : 0,
      };
    });
  }

  /**
   * Compute cumulative privacy loss for multiple queries.
   */
  computePrivacyLoss(numQueries = 1) {
    return this.epsilon * numQueries;
  }

  /**
   * Compare baseline (no noise) vs DP analytics for stages.
   */
  compareBaselineVsDP(stages) {
    const baseline = stages.map((s) => ({
      ...s,
      conversionRate: s.entered > 0 ? s.completed / s.entered : 0,
    }));

    const dpStages = this.noisyFunnel(stages);
    const dp = dpStages.map((s) => ({
      ...s,
      conversionRate: s.noisyConversionRate,
    }));

    // Compute overall error
    let totalError = 0;
    let count = 0;
    stages.forEach((stage, i) => {
      if (stage.entered > 0) {
        const baselineConv = stage.entered > 0 ? stage.completed / stage.entered : 0;
        const dpConv = dp[i].noisyConversionRate;
        totalError += Math.abs(baselineConv - dpConv);
        count++;
      }
    });

    const avgError = count > 0 ? totalError / count : 0;
    const errorPct = Math.round(avgError * 100 * 100) / 100;
    const accuracyPct = Math.round((100 - errorPct) * 100) / 100;

    return {
      baseline,
      dp,
      errorPct: Math.min(errorPct, 100),
      accuracyPct: Math.max(0, accuracyPct),
      epsilon: this.epsilon,
      mechanism: this.mechanism,
    };
  }

  /**
   * Classify privacy level based on epsilon value.
   */
  static getPrivacyLevel(epsilon) {
    if (epsilon < 1.0) return { level: 'high', label: 'High Privacy', color: 'green' };
    if (epsilon < 3.0) return { level: 'medium', label: 'Medium Privacy', color: 'yellow' };
    return { level: 'low', label: 'Low Privacy', color: 'red' };
  }

  /**
   * Estimate expected noise magnitude for a given epsilon and sensitivity.
   */
  static estimateNoiseMagnitude(epsilon, sensitivity = 1.0) {
    const scale = sensitivity / epsilon;
    // Expected absolute noise for Laplace = scale (= sensitivity/epsilon)
    return Math.round(scale * 100) / 100;
  }
}

/**
 * Factory function to create a DP engine from tenant privacy settings.
 */
const createEngine = (epsilon = 1.0, sensitivity = 1.0, mechanism = 'laplace') => {
  return new DifferentialPrivacy(epsilon, sensitivity, mechanism);
};

module.exports = { DifferentialPrivacy, createEngine };
