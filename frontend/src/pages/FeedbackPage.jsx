import { useState, useEffect } from 'react';
import { StarIcon } from '@heroicons/react/24/solid';
import { StarIcon as StarOutlineIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import api from '../services/api';

export default function FeedbackPage() {
  const [ratings, setRatings] = useState({
    abandonment: 0,
    privacy: 0,
    overall: 0
  });
  const [comments, setComments] = useState('');
  const [useCase, setUseCase] = useState('ecommerce');
  const [recommend, setRecommend] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [communityStats, setCommunityStats] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.feedback.list();
        setCommunityStats(res.data.averages);
      } catch (e) {
        console.error('Failed to load community stats', e);
      }
    };
    fetchStats();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!ratings.overall) {
      toast.error('Please provide at least an overall rating');
      return;
    }
    
    try {
      await api.feedback.submit({
        abandonment_useful: ratings.abandonment,
        privacy_sufficient: ratings.privacy,
        satisfaction: ratings.overall,
        comments,
        use_case: useCase,
        would_recommend: recommend
      });
      setSubmitted(true);
      toast.success('Thank you for your feedback!');
      
      // Refresh stats
      const res = await api.feedback.list();
      setCommunityStats(res.data.averages);
    } catch (error) {
      console.error('Submit feedback error', error);
      toast.error('Failed to submit feedback');
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
            className="focus:outline-none transition-transform hover:scale-110"
          >
            {star <= value ? (
              <StarIcon className="h-8 w-8 text-yellow-400" />
            ) : (
              <StarOutlineIcon className="h-8 w-8 text-slate-600 hover:text-yellow-400/50" />
            )}
          </button>
        ))}
      </div>
    );
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto mt-12 glass-panel p-12 text-center animate-fadeIn shadow-2xl">
        <div className="h-20 w-20 bg-success-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <StarIcon className="h-10 w-10 text-success-500" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-4">Feedback Received</h2>
        <p className="text-slate-400 text-lg mb-8">
          Thank you for helping us improve PrivacyLens. Your insights are invaluable as we build the future of privacy-preserving analytics.
        </p>
        <button 
          onClick={() => {
            setSubmitted(false);
            setRatings({ abandonment: 0, privacy: 0, overall: 0 });
            setComments('');
          }}
          className="text-primary-400 hover:text-primary-300 font-medium"
        >
          Submit another response
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto animate-fadeIn pb-12">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Help us improve PrivacyLens</h2>
        <p className="text-slate-400">Your feedback drives our product roadmap. All responses are kept confidential.</p>
      </div>

      <div className="glass-panel p-8 shadow-xl">
        <form onSubmit={handleSubmit} className="space-y-8">
          
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-700 pb-4">
              <label className="text-white font-medium mb-2 sm:mb-0 text-lg">Was the abandonment insight useful?</label>
              <StarRating 
                name="abandonment" 
                value={ratings.abandonment} 
                onChange={(name, val) => setRatings({...ratings, [name]: val})} 
              />
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-700 pb-4">
              <label className="text-white font-medium mb-2 sm:mb-0 text-lg">Did the privacy settings feel sufficient?</label>
              <StarRating 
                name="privacy" 
                value={ratings.privacy} 
                onChange={(name, val) => setRatings({...ratings, [name]: val})} 
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-700 pb-4">
              <label className="text-white font-medium mb-2 sm:mb-0 text-lg">Overall satisfaction with the platform <span className="text-red-500">*</span></label>
              <StarRating 
                name="overall" 
                value={ratings.overall} 
                onChange={(name, val) => setRatings({...ratings, [name]: val})} 
              />
            </div>
          </div>

          <div>
            <label className="block text-white font-medium mb-2">Primary Use Case</label>
            <select
              value={useCase}
              onChange={(e) => setUseCase(e.target.value)}
              className="block w-full rounded-md border-0 py-3 px-4 bg-slate-900/80 text-white shadow-sm ring-1 ring-inset ring-slate-700 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6"
            >
              <option value="ecommerce">E-Commerce Checkout Funnel</option>
              <option value="saas">SaaS User Onboarding</option>
              <option value="healthcare">Healthcare Form Submissions (HIPAA)</option>
              <option value="finance">Financial Application Process</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-white font-medium mb-2">Additional Comments or Feature Requests</label>
            <textarea
              rows={4}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="block w-full rounded-md border-0 py-3 px-4 bg-slate-900/80 text-white shadow-sm ring-1 ring-inset ring-slate-700 focus:ring-2 focus:ring-inset focus:ring-primary-500 sm:text-sm sm:leading-6 placeholder:text-slate-500"
              placeholder="What could we do better?"
            />
          </div>

          <div className="flex items-center">
            <button
              type="button"
              onClick={() => setRecommend(!recommend)}
              className={`${recommend ? 'bg-primary-600' : 'bg-slate-700'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none`}
            >
              <span className={`${recommend ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`} />
            </button>
            <span className="ml-3 text-sm text-slate-300">I would recommend PrivacyLens to a colleague</span>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              className="bg-primary-600 hover:bg-primary-500 text-white px-8 py-3 rounded-lg font-bold transition-all shadow-lg shadow-primary-500/25 active:scale-95"
            >
              Submit Feedback
            </button>
          </div>
        </form>
      </div>
      
      {/* Previous Ratings Display */}
      {communityStats && (
        <div className="mt-12 glass-panel p-6 border-dashed border-2 border-slate-700 opacity-70">
          <h3 className="text-sm font-bold uppercase text-slate-400 mb-4 tracking-wider">Community Averages</h3>
          <div className="flex flex-wrap gap-8">
            <div>
              <p className="text-xs text-slate-500 mb-1">Overall Satisfaction</p>
              <div className="flex items-center text-yellow-400 font-bold">
                <StarIcon className="h-5 w-5 mr-1" /> {communityStats.satisfaction || 0} / 5.0
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Privacy Confidence</p>
              <div className="flex items-center text-primary-400 font-bold">
                <StarIcon className="h-5 w-5 mr-1" /> {communityStats.privacy_sufficient || 0} / 5.0
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
