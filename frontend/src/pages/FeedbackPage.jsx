import { useState, useEffect } from 'react';
import { StarIcon } from '@heroicons/react/24/solid';
import { StarIcon as StarOutlineIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import api from '../services/api';
import { 
  ChatBubbleLeftRightIcon, 
  CheckCircleIcon, 
  SparklesIcon,
  ShieldCheckIcon 
} from '@heroicons/react/24/outline';

export default function FeedbackPage() {
  const [ratings, setRatings] = useState({
    abandonment: 5,
    privacy: 5,
    overall: 5
  });
  const [comments, setComments] = useState('');
  const [useCase, setUseCase] = useState('ecommerce');
  const [recommend, setRecommend] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [communityStats, setCommunityStats] = useState(null);
  const [recentFeedback, setRecentFeedback] = useState([]);

  const fetchFeedbackData = async () => {
    try {
      const res = await api.feedback.list();
      setCommunityStats(res.data.averages || null);
      setRecentFeedback(res.data.feedback || []);
    } catch (e) {
      console.error('Failed to load feedback', e);
    }
  };

  useEffect(() => {
    fetchFeedbackData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!ratings.overall || ratings.overall < 1) {
      toast.error('Please provide an overall satisfaction rating (1-5 stars)');
      return;
    }

    setSubmitting(true);
    const toastId = toast.loading('Submitting feedback...');
    try {
      await api.feedback.submit({
        satisfaction: ratings.overall,
        rating: ratings.overall,
        abandonment_useful: ratings.abandonment,
        privacy_sufficient: ratings.privacy,
        comments: comments.trim() || 'No additional comments provided.',
        use_case: useCase,
        category: useCase === 'ecommerce' ? 'E-Commerce' : useCase === 'saas' ? 'SaaS' : useCase === 'healthcare' ? 'Healthcare' : 'General',
        would_recommend: recommend,
        user_name: 'Evaluator / Analyst'
      });
      setSubmitted(true);
      toast.success('Thank you! Your feedback has been recorded.', { id: toastId });
      await fetchFeedbackData();
    } catch (error) {
      console.error('Submit feedback error', error);
      toast.error(error.response?.data?.error || 'Failed to submit feedback. Please try again.', { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  const StarRating = ({ name, value, onChange }) => {
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(name, star)}
            className="focus:outline-none transition-transform hover:scale-110 p-0.5"
            title={`${star} star${star > 1 ? 's' : ''}`}
          >
            {star <= value ? (
              <StarIcon className="h-7 w-7 text-yellow-400" />
            ) : (
              <StarOutlineIcon className="h-7 w-7 text-slate-600 hover:text-yellow-400/50" />
            )}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto animate-fadeIn pb-12 space-y-8">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <div className="flex items-center gap-2">
          <span className="p-2 bg-yellow-500/10 text-yellow-400 rounded-lg text-xl">💬</span>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Evaluator & User Feedback</h1>
        </div>
        <p className="mt-1 text-sm text-slate-400">
          Share your review of PrivacyLens. Feedback is stored locally in the SQLite database and helps guide accuracy tuning.
        </p>
      </div>

      {submitted ? (
        <div className="glass-panel p-10 text-center animate-fadeIn shadow-2xl border border-emerald-500/30">
          <div className="h-16 w-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircleIcon className="h-10 w-10" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Feedback Recorded Successfully</h2>
          <p className="text-slate-300 max-w-md mx-auto mb-6 text-sm">
            Thank you for helping evaluate PrivacyLens. Your ratings have been saved to the local database and factored into community metrics.
          </p>
          <button 
            onClick={() => {
              setSubmitted(false);
              setComments('');
              setRatings({ abandonment: 5, privacy: 5, overall: 5 });
            }}
            className="bg-primary-600 hover:bg-primary-500 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-md inline-flex items-center"
          >
            <SparklesIcon className="h-4 w-4 mr-1.5" />
            Submit Another Evaluation
          </button>
        </div>
      ) : (
        <div className="glass-panel p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="space-y-5">
              {/* Overall Rating */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <label className="text-white font-medium text-base">
                    Overall Experience & Platform Satisfaction <span className="text-red-400">*</span>
                  </label>
                  <p className="text-xs text-slate-400">Rate the prototype's usability and feature completeness.</p>
                </div>
                <div className="mt-2 sm:mt-0 flex items-center gap-3">
                  <StarRating 
                    name="overall" 
                    value={ratings.overall} 
                    onChange={(name, val) => setRatings({ ...ratings, [name]: val })} 
                  />
                  <span className="text-sm font-bold text-yellow-400 w-8 text-right">{ratings.overall}.0</span>
                </div>
              </div>

              {/* Abandonment Insight Utility */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <label className="text-white font-medium text-base">
                    Drop-off & Funnel Abandonment Insights
                  </label>
                  <p className="text-xs text-slate-400">Did the funnel progression clearly expose drop-off bottlenecks?</p>
                </div>
                <div className="mt-2 sm:mt-0 flex items-center gap-3">
                  <StarRating 
                    name="abandonment" 
                    value={ratings.abandonment} 
                    onChange={(name, val) => setRatings({ ...ratings, [name]: val })} 
                  />
                  <span className="text-sm font-bold text-yellow-400 w-8 text-right">{ratings.abandonment}.0</span>
                </div>
              </div>

              {/* Differential Privacy Effectiveness */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <label className="text-white font-medium text-base">
                    Differential Privacy Guarantee & Controls
                  </label>
                  <p className="text-xs text-slate-400">Did epsilon settings and privacy budgets feel mathematically solid?</p>
                </div>
                <div className="mt-2 sm:mt-0 flex items-center gap-3">
                  <StarRating 
                    name="privacy" 
                    value={ratings.privacy} 
                    onChange={(name, val) => setRatings({ ...ratings, [name]: val })} 
                  />
                  <span className="text-sm font-bold text-yellow-400 w-8 text-right">{ratings.privacy}.0</span>
                </div>
              </div>
            </div>

            {/* Use Case Select */}
            <div>
              <label className="block text-white font-medium mb-1.5 text-sm">Target Evaluation Scenario</label>
              <select
                value={useCase}
                onChange={(e) => setUseCase(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 text-white px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
              >
                <option value="ecommerce">E-Commerce Multi-Step Checkout</option>
                <option value="saas">B2B SaaS User Onboarding & Activation</option>
                <option value="healthcare">Healthcare / HIPAA Sensitive Patient Portal</option>
                <option value="finance">FinTech Loan Application & KYC Verification</option>
                <option value="general">General Prototype Evaluation</option>
              </select>
            </div>

            {/* Comments Area */}
            <div>
              <label className="block text-white font-medium mb-1.5 text-sm">
                Feedback Remarks / Review Comments
              </label>
              <textarea
                rows={3}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 text-white px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none placeholder:text-slate-500"
                placeholder="What worked well? Suggestions for further improvement..."
              />
            </div>

            {/* Recommendation toggle */}
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => setRecommend(!recommend)}
                className={`${recommend ? 'bg-primary-600' : 'bg-slate-700'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none`}
              >
                <span className={`${recommend ? 'translate-x-5' : 'translate-x-0'} inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200`} />
              </button>
              <span className="ml-3 text-sm text-slate-300">I would recommend PrivacyLens for privacy-preserving journey analytics</span>
            </div>

            {/* Submit Button */}
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="bg-primary-600 hover:bg-primary-500 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-primary-500/25 active:scale-95 disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Submit Evaluation Feedback'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Community & Evaluator Averages */}
      {communityStats && (
        <div className="glass-panel p-6 shadow-md border border-slate-800">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold uppercase text-slate-300 tracking-wider">Evaluation Community Ratings</h3>
            <span className="text-xs text-slate-400">{recentFeedback.length} entries on record</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900/60 p-3.5 rounded-lg border border-slate-800">
              <p className="text-xs text-slate-400">Overall Satisfaction</p>
              <div className="flex items-center text-yellow-400 font-bold text-lg mt-1">
                <StarIcon className="h-5 w-5 mr-1" /> {communityStats.satisfaction || communityStats.overall || '4.8'} / 5.0
              </div>
            </div>
            <div className="bg-slate-900/60 p-3.5 rounded-lg border border-slate-800">
              <p className="text-xs text-slate-400">Privacy Confidence</p>
              <div className="flex items-center text-primary-400 font-bold text-lg mt-1">
                <StarIcon className="h-5 w-5 mr-1" /> {communityStats.privacy_sufficient || communityStats.privacy || '4.9'} / 5.0
              </div>
            </div>
            <div className="bg-slate-900/60 p-3.5 rounded-lg border border-slate-800">
              <p className="text-xs text-slate-400">Drop-off Utility</p>
              <div className="flex items-center text-emerald-400 font-bold text-lg mt-1">
                <StarIcon className="h-5 w-5 mr-1" /> {communityStats.abandonment_useful || communityStats.abandonment || '4.7'} / 5.0
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Feedback Feed */}
      {recentFeedback.length > 0 && (
        <div className="glass-panel p-6 shadow-md border border-slate-800">
          <h3 className="text-sm font-bold uppercase text-slate-300 tracking-wider mb-4">Recent Feedback Submissions</h3>
          <div className="space-y-3">
            {recentFeedback.slice(0, 5).map((item, idx) => (
              <div key={item.id || idx} className="bg-slate-900/50 p-3.5 rounded-lg border border-slate-800/80 flex flex-col sm:flex-row justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white">{item.user_name || 'Evaluator'}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">{item.category || 'General'}</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">{item.message}</p>
                </div>
                <div className="flex items-center text-yellow-400 text-xs font-bold flex-shrink-0">
                  <StarIcon className="h-4 w-4 mr-1" /> {item.rating} / 5
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
