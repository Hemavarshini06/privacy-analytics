import { useState, useEffect } from 'react';
import { 
  PlusIcon, 
  TrashIcon, 
  ChevronUpIcon,
  ChevronDownIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

export default function WorkflowPage() {
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newStage, setNewStage] = useState({ name: '', description: '' });

  const fetchStages = async () => {
    try {
      const res = await api.workflows.getStages();
      const stageList = Array.isArray(res.data) ? res.data : (res.data.stages || []);
      setStages(stageList);
    } catch (e) {
      console.error('Failed to load stages', e);
      toast.error('Failed to load workflow stages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStages();
  }, []);

  const moveStage = async (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= stages.length) return;
    
    const items = Array.from(stages);
    const [reorderedItem] = items.splice(index, 1);
    items.splice(newIndex, 0, reorderedItem);
    
    const updatedItems = items.map((item, idx) => ({
      ...item,
      stage_order: idx + 1
    }));
    
    setStages(updatedItems);
    
    try {
      const payload = updatedItems.map(item => ({ 
        stage_id: item.stage_id || item.id, 
        stage_order: item.stage_order 
      }));
      await api.workflows.reorderStages(payload);
      toast.success('Workflow order updated');
    } catch (e) {
      console.error('Reorder failed', e);
      toast.error('Failed to save new order');
      await fetchStages();
    }
  };

  const handleAddStage = async (e) => {
    e.preventDefault();
    if (!newStage.name) return;
    
    if (stages.length >= 10) {
      toast.error('Maximum 10 stages allowed per workflow');
      return;
    }

    try {
      const res = await api.workflows.createStage({
        stage_name: newStage.name,
        description: newStage.description,
        stage_order: stages.length + 1
      });
      const created = res.data.stage || res.data;
      setStages([...stages, created]);
      setNewStage({ name: '', description: '' });
      setIsAdding(false);
      toast.success('Stage added successfully');
    } catch (e) {
      console.error('Add stage failed', e);
      toast.error('Failed to add stage');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this stage?')) {
      try {
        await api.workflows.deleteStage(id);
        setStages(stages.filter(s => (s.stage_id || s.id) !== id));
        toast.success('Stage removed');
      } catch (e) {
        console.error('Delete stage failed', e);
        toast.error('Failed to delete stage');
      }
    }
  };

  if (loading) return <LoadingSpinner message="Loading Workflow Stages..." />;

  return (
    <div className="max-w-4xl mx-auto animate-fadeIn">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Workflow Builder</h2>
          <p className="text-slate-400">Define the sequential stages users take in your application.</p>
        </div>
        {!isAdding && stages.length < 10 && (
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors shadow-lg shadow-blue-500/20 text-sm font-medium"
          >
            <PlusIcon className="h-5 w-5 mr-1" />
            Add Stage
          </button>
        )}
      </div>

      {stages.length >= 10 && (
        <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-center">
          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 mr-3" />
          <p className="text-sm text-yellow-200">You have reached the maximum limit of 10 stages.</p>
        </div>
      )}

      {isAdding && (
        <div className="bg-slate-800/80 rounded-xl border border-slate-700 p-6 mb-8 shadow-xl">
          <h3 className="text-lg font-medium text-white mb-4">Add New Stage</h3>
          <form onSubmit={handleAddStage} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Stage Name</label>
              <input
                type="text"
                required
                value={newStage.name}
                onChange={e => setNewStage({...newStage, name: e.target.value})}
                className="w-full rounded-md border border-slate-700 py-2 px-3 bg-slate-900 text-white focus:ring-2 focus:ring-blue-500 sm:text-sm"
                placeholder="e.g., Checkout Started"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Description (Optional)</label>
              <input
                type="text"
                value={newStage.description}
                onChange={e => setNewStage({...newStage, description: e.target.value})}
                className="w-full rounded-md border border-slate-700 py-2 px-3 bg-slate-900 text-white focus:ring-2 focus:ring-blue-500 sm:text-sm"
                placeholder="What action triggers this stage?"
              />
            </div>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors text-sm font-medium"
              >
                Save Stage
              </button>
            </div>
          </form>
        </div>
      )}

      {stages.length === 0 ? (
        <div className="bg-slate-800/40 rounded-xl p-12 text-center border-dashed border-2 border-slate-700">
          <h3 className="text-lg font-medium text-white">No stages defined</h3>
          <p className="mt-2 text-sm text-slate-400">Add your first stage to start tracking workflow abandonment.</p>
          <button 
            onClick={() => setIsAdding(true)}
            className="mt-6 inline-flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors text-sm font-medium border border-slate-600"
          >
            <PlusIcon className="h-5 w-5 mr-1" />
            Add First Stage
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {stages.map((stage, index) => {
            const stageId = stage.stage_id || stage.id;
            const stageName = stage.stage_name || stage.name;
            return (
              <div
                key={stageId || index}
                className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 flex items-center justify-between transition-all hover:border-slate-600"
              >
                <div className="flex items-center flex-1">
                  <div className="flex flex-col mr-3">
                    <button
                      onClick={() => moveStage(index, -1)}
                      disabled={index === 0}
                      className="text-slate-400 hover:text-white disabled:opacity-20 transition-colors p-0.5"
                      title="Move Up"
                    >
                      <ChevronUpIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => moveStage(index, 1)}
                      disabled={index === stages.length - 1}
                      className="text-slate-400 hover:text-white disabled:opacity-20 transition-colors p-0.5"
                      title="Move Down"
                    >
                      <ChevronDownIcon className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div className="flex-shrink-0 h-8 w-8 bg-slate-900 text-blue-400 rounded-full flex items-center justify-center font-bold mr-4 border border-slate-700 text-sm">
                    {stage.stage_order || index + 1}
                  </div>
                  
                  <div>
                    <h4 className="text-md font-medium text-white">{stageName}</h4>
                    {stage.description && <p className="text-sm text-slate-400">{stage.description}</p>}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => handleDelete(stageId)}
                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
                    title="Delete stage"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
