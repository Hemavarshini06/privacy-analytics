/**
 * Abandonment Detection Engine
 * Analyzes workflow stage events to detect bottlenecks,
 * risk stages, and generate actionable recommendations.
 */

const ABANDONMENT_THRESHOLD = 0.4; // 40%+ drop-off = bottleneck
const HIGH_RISK_THRESHOLD = 0.6;    // 60%+ drop-off = high risk
const LOW_TRAFFIC_THRESHOLD = 10;   // < 10 users = low traffic warning

/**
 * Stage-specific recommendation templates.
 */
const STAGE_RECOMMENDATIONS = {
  signup: [
    'Simplify the signup form — reduce fields to the minimum required.',
    'Add social login options (Google, GitHub) to reduce friction.',
    'Show a progress indicator to set expectations.',
  ],
  'profile setup': [
    'Break profile setup into smaller, optional steps.',
    'Allow users to skip non-essential fields and complete later.',
    'Add inline validation to reduce form errors.',
  ],
  verification: [
    'Streamline email verification — consider magic links instead of codes.',
    'Reduce verification timeout to prevent link expiry frustration.',
    'Add a clear resend verification option.',
  ],
  payment: [
    'Add trust badges (SSL, security seals) to increase confidence.',
    'Offer multiple payment options (card, PayPal, Apple Pay).',
    'Show a clear breakdown of what users are paying for.',
  ],
  completion: [
    'Add a celebratory completion screen to reinforce positive behavior.',
    'Immediately guide users to the first key action after completion.',
  ],
  default: [
    'Review this stage for unnecessary complexity.',
    'Consider A/B testing a simplified version of this step.',
    'Add contextual help (tooltips, FAQs) to reduce confusion.',
    'Analyze session recordings for this specific step.',
  ],
};

/**
 * Get recommendation for a stage by name.
 */
const getRecommendation = (stageName, abandonmentRate) => {
  const key = stageName.toLowerCase().trim();
  const templates = STAGE_RECOMMENDATIONS[key] || STAGE_RECOMMENDATIONS.default;
  const template = templates[Math.floor(Math.random() * templates.length)];
  const pct = Math.round(abandonmentRate * 100);
  return `"${stageName}" stage shows ${pct}% abandonment. ${template}`;
};

/**
 * Analyze stage-level abandonment data and generate insights.
 *
 * @param {Array} stages - Array of { stage_id, stage_name, stage_order, entered, completed, abandoned }
 * @returns {Object} Abandonment analysis with recommendations
 */
const analyzeAbandonment = (stages) => {
  if (!stages || stages.length === 0) {
    return {
      hasData: false,
      warning: 'No stage data available. Please simulate events first.',
      stages: [],
      highestDropStage: null,
      bottlenecks: [],
      riskStages: [],
      recommendations: [],
      overallCompletionRate: 0,
      totalEntered: 0,
      totalCompleted: 0,
    };
  }

  const sortedStages = [...stages].sort((a, b) => a.stage_order - b.stage_order);
  const totalEntered = sortedStages[0]?.entered || 0;
  const lastStage = sortedStages[sortedStages.length - 1];
  const totalCompleted = lastStage?.completed || 0;

  // Edge case: low traffic
  const warnings = [];
  if (totalEntered < LOW_TRAFFIC_THRESHOLD) {
    warnings.push(`Very low traffic detected (${totalEntered} users). Results may not be statistically significant.`);
  }

  // Compute per-stage metrics
  const enrichedStages = sortedStages.map((stage, idx) => {
    const entered = stage.entered || 0;
    const completed = stage.completed || 0;
    const abandoned = stage.abandoned || (entered - completed);
    const conversionRate = entered > 0 ? completed / entered : 0;
    const abandonmentRate = entered > 0 ? abandoned / entered : 0;

    // Stage-to-stage drop rate (how many who entered prev stage reached this one)
    const prevEntered = idx > 0 ? sortedStages[idx - 1].entered : entered;
    const stageDropRate = idx === 0 ? 0 : (prevEntered > 0 ? 1 - (entered / prevEntered) : 0);

    return {
      ...stage,
      entered,
      completed,
      abandoned: Math.max(0, abandoned),
      conversionRate: Math.round(conversionRate * 1000) / 1000,
      abandonmentRate: Math.round(abandonmentRate * 1000) / 1000,
      stageDropRate: Math.round(stageDropRate * 1000) / 1000,
      isBottleneck: abandonmentRate >= ABANDONMENT_THRESHOLD,
      isHighRisk: abandonmentRate >= HIGH_RISK_THRESHOLD,
    };
  });

  // Find highest drop-off stage
  let highestDropStage = null;
  let maxAbandonment = -1;
  enrichedStages.forEach((stage) => {
    if (stage.abandonmentRate > maxAbandonment) {
      maxAbandonment = stage.abandonmentRate;
      highestDropStage = stage;
    }
  });

  // Collect bottlenecks and risk stages
  const bottlenecks = enrichedStages.filter((s) => s.isBottleneck);
  const riskStages = enrichedStages.filter((s) => s.isHighRisk);

  // Generate recommendations
  const recommendations = [];

  if (highestDropStage && highestDropStage.abandonmentRate > 0.1) {
    recommendations.push({
      priority: 'critical',
      stage: highestDropStage.stage_name,
      message: getRecommendation(highestDropStage.stage_name, highestDropStage.abandonmentRate),
    });
  }

  bottlenecks
    .filter((s) => s.stage_id !== highestDropStage?.stage_id)
    .forEach((stage) => {
      recommendations.push({
        priority: 'high',
        stage: stage.stage_name,
        message: getRecommendation(stage.stage_name, stage.abandonmentRate),
      });
    });

  // General insight
  const overallCompletionRate = totalEntered > 0 ? totalCompleted / totalEntered : 0;
  if (overallCompletionRate < 0.3 && totalEntered >= LOW_TRAFFIC_THRESHOLD) {
    recommendations.push({
      priority: 'medium',
      stage: 'Overall',
      message: `Overall completion rate is ${Math.round(overallCompletionRate * 100)}%. Consider a comprehensive UX audit of the entire onboarding flow.`,
    });
  }

  return {
    hasData: true,
    stages: enrichedStages,
    highestDropStage,
    bottlenecks,
    riskStages,
    recommendations,
    overallCompletionRate: Math.round(overallCompletionRate * 1000) / 1000,
    overallAbandonmentRate: Math.round((1 - overallCompletionRate) * 1000) / 1000,
    totalEntered,
    totalCompleted,
    warnings,
  };
};

module.exports = { analyzeAbandonment, getRecommendation };
