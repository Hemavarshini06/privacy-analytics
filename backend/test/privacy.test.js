const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  validateEpsilon,
  laplaceNoise,
  applyLaplaceMechanism,
  calculateMAE,
  computeAccuracy,
  evaluateMultiEpsilon,
  getBudgetWarning,
  checkFailureCases
} = require('../src/utils/privacy');

describe('Differential Privacy Utilities - Review 2 Unit Tests', () => {

  // Test Suite 1: Laplace Noise Generation
  describe('1. Laplace Noise Generation', () => {
    test('should generate noise roughly centered at 0', () => {
      const samples = [];
      const numSamples = 2000;
      for (let i = 0; i < numSamples; i++) {
        samples.push(laplaceNoise(1, 1.0));
      }
      const mean = samples.reduce((acc, val) => acc + val, 0) / numSamples;
      // Mean should be close to 0 (within standard error tolerance ~0.15)
      assert.ok(Math.abs(mean) < 0.15, `Mean ${mean} should be centered near 0`);
    });

    test('smaller epsilon should generate larger dispersion/variance than larger epsilon', () => {
      const samplesEps01 = [];
      const samplesEps10 = [];
      const numSamples = 1000;
      
      for (let i = 0; i < numSamples; i++) {
        samplesEps01.push(Math.abs(laplaceNoise(1, 0.1)));
        samplesEps10.push(Math.abs(laplaceNoise(1, 1.0)));
      }
      
      const meanAbs01 = samplesEps01.reduce((a, b) => a + b, 0) / numSamples;
      const meanAbs10 = samplesEps10.reduce((a, b) => a + b, 0) / numSamples;

      // Theoretical mean absolute deviation for Laplace(0, b) is b = 1/eps
      // For eps=0.1, b=10; for eps=1.0, b=1
      assert.ok(
        meanAbs01 > meanAbs10 * 3,
        `Noise dispersion for eps=0.1 (${meanAbs01}) must be significantly larger than eps=1.0 (${meanAbs10})`
      );
    });

    test('should reject invalid or non-positive sensitivity', () => {
      assert.throws(() => laplaceNoise(0, 1.0), /Sensitivity must be positive/);
      assert.throws(() => laplaceNoise(-1, 1.0), /Sensitivity must be positive/);
    });
  });

  // Test Suite 2: Privacy Budget Calculations
  describe('2. Privacy Budget Calculations', () => {
    test('should return ok for ratio < 50%', () => {
      const result = getBudgetWarning(2.0, 10.0); // 20%
      assert.equal(result.level, 'ok');
      assert.ok(result.message.includes('healthy'));
    });

    test('should return moderate warning for ratio between 50% and 70%', () => {
      const result = getBudgetWarning(5.5, 10.0); // 55%
      assert.equal(result.level, 'moderate');
      assert.ok(result.message.includes('50%'));
    });

    test('should return warning for ratio between 70% and 90%', () => {
      const result = getBudgetWarning(7.5, 10.0); // 75%
      assert.equal(result.level, 'warning');
      assert.ok(result.message.includes('70%'));
    });

    test('should return critical warning for ratio >= 90%', () => {
      const result = getBudgetWarning(9.5, 10.0); // 95%
      assert.equal(result.level, 'critical');
      assert.ok(result.message.includes('90%'));
    });

    test('should handle edge cases like 0 budget consumed safely', () => {
      const result = getBudgetWarning(0, 10.0);
      assert.equal(result.level, 'ok');
    });
  });

  // Test Suite 3: Epsilon Validation
  describe('3. Epsilon Validation', () => {
    test('should accept valid positive numbers', () => {
      assert.equal(validateEpsilon(0.1), 0.1);
      assert.equal(validateEpsilon(0.5), 0.5);
      assert.equal(validateEpsilon(1.0), 1.0);
      assert.equal(validateEpsilon('2.5'), 2.5);
    });

    test('should reject zero epsilon', () => {
      assert.throws(() => validateEpsilon(0), /Epsilon must be positive/);
      assert.throws(() => validateEpsilon('0'), /Epsilon must be positive/);
    });

    test('should reject negative epsilon', () => {
      assert.throws(() => validateEpsilon(-0.5), /Epsilon must be positive/);
      assert.throws(() => validateEpsilon(-1), /Epsilon must be positive/);
    });

    test('should reject non-numeric and non-finite values', () => {
      assert.throws(() => validateEpsilon(NaN), /Epsilon must be a valid finite number/);
      assert.throws(() => validateEpsilon('invalid'), /Epsilon must be a valid finite number/);
      assert.throws(() => validateEpsilon(Infinity), /Epsilon must be a valid finite number/);
    });
  });

  // Test Suite 4: Small Cohort Edge Cases & Failure Warnings
  describe('4. Small Cohort Edge Cases', () => {
    test('should warn on low cohort traffic (<100 sessions)', () => {
      const warnings = checkFailureCases({ totalSessions: 42, consentRate: 0.9, epsilon: 1.0 });
      const lowTraffic = warnings.find(w => w.type === 'low_traffic');
      assert.ok(lowTraffic, 'Expected low_traffic warning for <100 sessions');
      assert.equal(lowTraffic.severity, 'warning');
      assert.ok(lowTraffic.message.includes('42'));
    });

    test('should warn on low consent rate (<50%)', () => {
      const warnings = checkFailureCases({ totalSessions: 500, consentRate: 0.35, epsilon: 1.0 });
      const noConsent = warnings.find(w => w.type === 'no_consent');
      assert.ok(noConsent, 'Expected no_consent warning for <50% consent');
      assert.equal(noConsent.severity, 'warning');
    });

    test('should warn on very small epsilon (<0.1)', () => {
      const warnings = checkFailureCases({ totalSessions: 1000, consentRate: 0.95, epsilon: 0.05 });
      const smallEps = warnings.find(w => w.type === 'very_small_epsilon');
      assert.ok(smallEps, 'Expected very_small_epsilon caution for epsilon < 0.1');
      assert.equal(smallEps.severity, 'caution');
    });

    test('should gracefully handle empty arrays in accuracy calculations', () => {
      assert.equal(calculateMAE([], []), 0);
      const acc = computeAccuracy([], []);
      assert.equal(acc.accuracyPercent, '100.00');
      assert.equal(acc.meanAbsoluteError, '0.00');
    });

    test('should throw error on mismatched array lengths in MAE', () => {
      assert.throws(() => calculateMAE([10, 20], [10]), /Array length mismatch/);
    });
  });

  // Test Suite 5: Non-Negative Noisy Count Guarantee
  describe('5. Non-Negative Count Guarantee', () => {
    test('noisy count must never be negative even with 0 actual count and aggressive epsilon', () => {
      // Run 500 trials with actual count = 0 and very small epsilon (high noise variance)
      for (let i = 0; i < 500; i++) {
        const result = applyLaplaceMechanism(0, 0.05);
        assert.ok(
          result.noisyCount >= 0,
          `Noisy count ${result.noisyCount} must be non-negative (trial ${i})`
        );
      }
    });

    test('noisy count must never be negative with small counts (e.g. 1 or 2)', () => {
      for (let i = 0; i < 200; i++) {
        const result = applyLaplaceMechanism(1, 0.1);
        assert.ok(
          result.noisyCount >= 0,
          `Noisy count ${result.noisyCount} must be non-negative`
        );
      }
    });
  });

  // Test Suite 6: Multi-Epsilon Evaluation (Review 2 Priority)
  describe('6. Multi-Epsilon Evaluation (0.1, 0.5, 1.0)', () => {
    test('evaluates across 0.1, 0.5, and 1.0 with accurate MAE calculations', () => {
      const stageCounts = [500, 420, 310, 260];
      const results = evaluateMultiEpsilon(stageCounts, [0.1, 0.5, 1.0], 10);

      assert.equal(results.length, 3);
      
      const eps01 = results.find(r => r.epsilon === 0.1);
      const eps05 = results.find(r => r.epsilon === 0.5);
      const eps10 = results.find(r => r.epsilon === 1.0);

      assert.ok(eps01 && eps05 && eps10);
      assert.equal(eps01.theoreticalMAE, 10.00); // 1 / 0.1 = 10
      assert.equal(eps05.theoreticalMAE, 2.00);  // 1 / 0.5 = 2
      assert.equal(eps10.theoreticalMAE, 1.00);  // 1 / 1.0 = 1

      // Theoretical and empirical MAE for eps=0.1 should exceed eps=1.0
      assert.ok(
        eps01.empiricalMAE > eps10.empiricalMAE,
        `Empirical MAE for eps=0.1 (${eps01.empiricalMAE}) must be higher than eps=1.0 (${eps10.empiricalMAE})`
      );

      // Verify all noisy counts in results are non-negative integers
      results.forEach(res => {
        res.noisyCounts.forEach(count => {
          assert.ok(count >= 0, 'Noisy count must be non-negative');
          assert.equal(Number.isInteger(count), true, 'Noisy count must be an integer');
        });
      });
    });
  });
});
