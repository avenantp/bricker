import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileCode, Search, Filter, GitBranch } from 'lucide-react';
import { TemplateComposition, TemplateFragment } from '@/types/template';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export function TemplateLibrary() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [compositions, setCompositions] = useState<TemplateComposition[]>([]);
  const [fragments, setFragments] = useState<TemplateFragment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLanguage, setFilterLanguage] = useState<'all' | 'sql' | 'python' | 'scala'>('all');
  const [activeTab, setActiveTab] = useState<'compositions' | 'fragments'>('compositions');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    try {
      setLoading(true);

      // Load compositions
      const { data: compositionsData, error: compositionsError } = await supabase
        .from('template_compositions')
        .select('*')
        .order('created_at', { ascending: false });

      if (compositionsError) throw compositionsError;
      setCompositions(compositionsData || []);

      // Load fragments
      const { data: fragmentsData, error: fragmentsError } = await supabase
        .from('template_fragments')
        .select('*')
        .order('category', { ascending: true });

      if (fragmentsError) throw fragmentsError;
      setFragments(fragmentsData || []);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredCompositions = compositions.filter((comp) => {
    const matchesSearch = comp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comp.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLanguage = filterLanguage === 'all' || comp.language === filterLanguage;
    return matchesSearch && matchesLanguage;
  });

  const filteredFragments = fragments.filter((frag) => {
    const matchesSearch = frag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      frag.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLanguage = filterLanguage === 'all' || frag.language === filterLanguage;
    return matchesSearch && matchesLanguage;
  });

  return (
    <div className="h-screen flex flex-col bg-neutral-100 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Template Library</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Manage Jinja template compositions and reusable fragments
            </p>
          </div>
          <button
            onClick={() => navigate('/templates/new')}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 dark:text-gray-900 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Composition</span>
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <select
              value={filterLanguage}
              onChange={(e) => setFilterLanguage(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Languages</option>
              <option value="sql">SQL</option>
              <option value="python">Python</option>
              <option value="scala">Scala</option>
            </select>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mt-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('compositions')}
            className={`pb-2 px-1 font-medium transition-colors ${
              activeTab === 'compositions'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            Compositions ({filteredCompositions.length})
          </button>
          <button
            onClick={() => setActiveTab('fragments')}
            className={`pb-2 px-1 font-medium transition-colors ${
              activeTab === 'fragments'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            Fragments ({filteredFragments.length})
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Loading templates...</p>
            </div>
          </div>
        ) : activeTab === 'compositions' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCompositions.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <FileCode className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-400">No compositions found</p>
                <button
                  onClick={() => navigate('/templates/new')}
                  className="mt-4 text-primary-600 hover:text-primary-700 font-medium"
                >
                  Create your first composition
                </button>
              </div>
            ) : (
              filteredCompositions.map((composition) => (
                <div
                  key={composition.id}
                  onClick={() => navigate(`/templates/${composition.id}`)}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-primary-500 dark:hover:border-primary-400 hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">{composition.name}</h3>
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded">
                      {composition.language.toUpperCase()}
                    </span>
                  </div>
                  {composition.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                      {composition.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <GitBranch className="w-3 h-3" />
                      {composition.flow_data?.nodes?.length || 0} nodes
                    </span>
                    <span>
                      {new Date(composition.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredFragments.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <FileCode className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-400">No fragments found</p>
              </div>
            ) : (
              filteredFragments.map((fragment) => (
                <div
                  key={fragment.id}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-primary-500 dark:hover:border-primary-400 transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{fragment.name}</h3>
                    <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded">
                      {fragment.category}
                    </span>
                  </div>
                  {fragment.description && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                      {fragment.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span className="uppercase font-medium">{fragment.language}</span>
                    {fragment.is_system_template && (
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded">
                        System
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
