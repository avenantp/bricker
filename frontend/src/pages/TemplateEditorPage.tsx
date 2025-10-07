import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { TemplateComposer } from '@/components/Templates/TemplateComposer';
import { TemplateComposition, TemplateFragment } from '@/types/template';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useDevMode } from '@/hooks/useDevMode';
import { Loader2 } from 'lucide-react';

export function TemplateEditorPage() {
  const { compositionId } = useParams<{ compositionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDevMode } = useDevMode();
  const [composition, setComposition] = useState<TemplateComposition | null>(null);
  const [fragments, setFragments] = useState<TemplateFragment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [compositionId]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      // Load composition if editing existing
      if (compositionId && compositionId !== 'new') {
        const { data, error: compError } = await supabase
          .from('template_compositions')
          .select('*')
          .eq('id', compositionId)
          .single();

        if (compError) throw compError;
        setComposition(data);
      } else {
        // New composition - set default empty state
        setComposition(null);
      }

      // Load available fragments
      const { data: fragmentsData, error: fragError } = await supabase
        .from('template_fragments')
        .select('*')
        .order('category');

      if (fragError) throw fragError;
      setFragments(fragmentsData || []);
    } catch (err: any) {
      console.error('Error loading template data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(updatedComposition: TemplateComposition) {
    try {
      if (compositionId && compositionId !== 'new') {
        // Update existing
        const { error } = await supabase
          .from('template_compositions')
          .update({
            name: updatedComposition.name,
            description: updatedComposition.description,
            language: updatedComposition.language,
            flow_data: updatedComposition.flow_data,
          })
          .eq('id', compositionId);

        if (error) throw error;
      } else {
        // Create new
        const { data, error } = await supabase
          .from('template_compositions')
          .insert({
            name: updatedComposition.name,
            description: updatedComposition.description,
            language: updatedComposition.language,
            flow_data: updatedComposition.flow_data,
            created_by: user?.id || '',
            workspace_id: null, // TODO: Get from workspace context
          })
          .select()
          .single();

        if (error) throw error;

        // Navigate to the new composition
        navigate(`/templates/${data.id}`);
      }

      // Reload data
      await loadData();
    } catch (err: any) {
      console.error('Error saving composition:', err);
      alert(`Failed to save: ${err.message}`);
    }
  }

  async function handleClone(sourceComposition: TemplateComposition) {
    try {
      const { data, error } = await supabase
        .from('template_compositions')
        .insert({
          name: `${sourceComposition.name} (Copy)`,
          description: sourceComposition.description,
          language: sourceComposition.language,
          flow_data: sourceComposition.flow_data,
          cloned_from_id: sourceComposition.id,
          created_by: user?.id || '',
          workspace_id: null, // TODO: Get from workspace context
        })
        .select()
        .single();

      if (error) throw error;

      // Navigate to the cloned composition
      navigate(`/templates/${data.id}`);
    } catch (err: any) {
      console.error('Error cloning composition:', err);
      alert(`Failed to clone: ${err.message}`);
    }
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-neutral-100">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading template editor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-neutral-100">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
            <h2 className="text-lg font-semibold text-red-900 mb-2">Error Loading Template</h2>
            <p className="text-red-700">{error}</p>
            <button
              onClick={() => navigate('/templates')}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Back to Templates
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-neutral-100">
      <TemplateComposer
        composition={composition || undefined}
        fragments={fragments}
        onSave={handleSave}
        onClone={handleClone}
        isDevMode={isDevMode}
      />
    </div>
  );
}
