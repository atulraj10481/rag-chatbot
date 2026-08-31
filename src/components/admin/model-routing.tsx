'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Settings, Cpu, Zap, Coins } from 'lucide-react';

export function AdminModelRoutingConfig({ initialSettings }: { initialSettings: any }) {
  const [fastModel, setFastModel] = useState(initialSettings?.fast_model || 'anthropic/claude-3-haiku');
  const [complexModel, setComplexModel] = useState(initialSettings?.complex_model || 'anthropic/claude-3.5-sonnet');
  const [isSaving, setIsSaving] = useState(false);

  const supabase = createClient();

  const handleSave = async () => {
    setIsSaving(true);
    
    // settings table is a singleton (id = 1)
    const { error } = await supabase
      .from('settings')
      .update({ 
        fast_model: fastModel,
        complex_model: complexModel
      })
      .eq('id', 1);

    setIsSaving(false);

    if (error) {
      toast.error('Failed to update routing settings');
    } else {
      toast.success('Model routing updated successfully');
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-6 border-b border-border/50 pb-4">
        <Settings className="text-primary" size={20} />
        <h2 className="text-lg font-semibold">Intelligent Model Routing</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Fast Model Setup */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-foreground/90 font-medium">
            <Zap size={18} className="text-yellow-500" />
            <h3>Triage / Intent Model (Fast & Cheap)</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Used for classifying user intent, routing queries, and answering simple chit-chat.
          </p>
          <select 
            value={fastModel} 
            onChange={(e) => setFastModel(e.target.value)}
            className="w-full p-2 bg-background border border-input rounded-md text-sm focus:ring-2 focus:ring-ring outline-none"
          >
            <option value="anthropic/claude-3-haiku">Claude 3 Haiku (Anthropic)</option>
            <option value="meta-llama/llama-3-8b-instruct">Llama 3 8B (Meta)</option>
            <option value="google/gemini-flash-1.5">Gemini 1.5 Flash (Google)</option>
            <option value="openai/gpt-4o-mini">GPT-4o Mini (OpenAI)</option>
          </select>
        </div>

        {/* Complex Model Setup */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-foreground/90 font-medium">
            <Cpu size={18} className="text-purple-500" />
            <h3>Synthesis Model (Complex Reasoning)</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Used for heavy RAG document synthesis, drawing conclusions, and generating canvas artifacts.
          </p>
          <select 
            value={complexModel} 
            onChange={(e) => setComplexModel(e.target.value)}
            className="w-full p-2 bg-background border border-input rounded-md text-sm focus:ring-2 focus:ring-ring outline-none"
          >
            <option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet (Anthropic)</option>
            <option value="openai/gpt-4o">GPT-4o (OpenAI)</option>
            <option value="google/gemini-1.5-pro">Gemini 1.5 Pro (Google)</option>
            <option value="meta-llama/llama-3-70b-instruct">Llama 3 70B (Meta)</option>
          </select>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Coins size={16} />
          <span>Intelligent routing saves ~60% on API costs.</span>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {isSaving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
}
