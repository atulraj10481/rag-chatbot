'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Save } from 'lucide-react';

export default function WhiteLabelForm() {
  const [chatbotName, setChatbotName] = useState('Company Assistant');
  const [welcomeMessage, setWelcomeMessage] = useState('Hi! How can I help you today?');
  const [primaryColor, setPrimaryColor] = useState('#3b82f6');
  const [modelPreference, setModelPreference] = useState('auto');
  const [similarityThreshold, setSimilarityThreshold] = useState('0.5');
  const [suggestedQuestions, setSuggestedQuestions] = useState('');
  const [isPublicChatEnabled, setIsPublicChatEnabled] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.settings) {
          setChatbotName(data.settings.chatbot_name || 'Company Assistant');
          setWelcomeMessage(data.settings.welcome_message || 'Hi! How can I help you today?');
          setPrimaryColor(data.settings.primary_color || '#3b82f6');
          setModelPreference(data.settings.model_preference || 'auto');
          setSimilarityThreshold(String(data.settings.similarity_threshold || 0.5));
          if (data.settings.suggested_questions) {
            setSuggestedQuestions(data.settings.suggested_questions.join('\n'));
          }
          if (data.settings.is_public_chat_enabled !== undefined) {
            setIsPublicChatEnabled(data.settings.is_public_chat_enabled);
          }
        }
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatbot_name: chatbotName,
          welcome_message: welcomeMessage,
          primary_color: primaryColor,
          model_preference: modelPreference,
          similarity_threshold: similarityThreshold,
          suggested_questions: suggestedQuestions.split('\n').map(q => q.trim()).filter(q => q.length > 0),
          is_public_chat_enabled: isPublicChatEnabled,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save settings');
      toast.success('White-label configuration saved!');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fieldClass = "bg-white/5 border-white/10 text-slate-200 placeholder:text-slate-600 focus:border-indigo-500/40 focus:ring-indigo-500/10 rounded-xl";

  return (
    <div className="max-w-2xl rounded-2xl bg-white/3 border border-white/8 overflow-hidden">
      <div className="p-5 border-b border-white/5">
        <h2 className="text-sm font-semibold text-slate-200">Chatbot Branding & Engine Preferences</h2>
        <p className="text-xs text-slate-500 mt-0.5">Changes apply to the embedded widget and chat page immediately after saving.</p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Chatbot Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Chatbot Name</label>
          <Input
            value={chatbotName}
            onChange={(e) => setChatbotName(e.target.value)}
            placeholder="e.g. Acme Support Bot"
            required
            className={fieldClass}
          />
        </div>

        {/* Welcome Message */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Welcome Greeting</label>
          <Textarea
            value={welcomeMessage}
            onChange={(e) => setWelcomeMessage(e.target.value)}
            rows={2}
            required
            className={`${fieldClass} resize-none`}
          />
        </div>

        {/* Suggested Questions */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Suggested Questions (One per line)</label>
          <Textarea
            value={suggestedQuestions}
            onChange={(e) => setSuggestedQuestions(e.target.value)}
            rows={3}
            placeholder="What is your return policy?&#10;How do I reset my password?"
            className={`${fieldClass} resize-none`}
          />
          <p className="text-[11px] text-slate-500">These will appear as quick-start options when a user opens a new chat.</p>
        </div>

        {/* Primary Color */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Primary Brand Color</label>
          <div className="flex gap-3 items-center">
            <div className="relative">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-10 w-14 rounded-xl cursor-pointer border border-white/10 bg-transparent p-1"
              />
            </div>
            <Input
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className={`w-36 font-mono text-sm ${fieldClass}`}
            />
            <div
              className="h-10 w-10 rounded-xl border border-white/10 shadow-lg flex-shrink-0"
              style={{ backgroundColor: primaryColor }}
              title="Preview"
            />
          </div>
        </div>

        {/* Model Preference */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">OpenRouter Model Preference</label>
          <select
            value={modelPreference}
            onChange={(e) => setModelPreference(e.target.value)}
            className="w-full h-10 px-3 border border-white/10 rounded-xl text-sm bg-white/5 text-slate-300 focus:border-indigo-500/40 focus:outline-none"
          >
            <option value="auto" className="bg-[#1a1a1a]">Auto Dynamic Routing (Recommended)</option>
            <option value="cheap" className="bg-[#1a1a1a]">Cheap — Gemini 2.0 Flash ($0.10/1M)</option>
            <option value="standard" className="bg-[#1a1a1a]">Standard — Llama 4 Scout ($0.20/1M)</option>
            <option value="premium" className="bg-[#1a1a1a]">Premium — Claude Sonnet 4 ($3.00/1M)</option>
          </select>
        </div>

        {/* Similarity Threshold */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Similarity Threshold</label>
            <span className="text-xs font-mono text-indigo-400 bg-indigo-400/10 px-2 py-0.5 rounded-full border border-indigo-400/20">{similarityThreshold}</span>
          </div>
          <input
            type="range"
            min="0.3"
            max="0.8"
            step="0.05"
            value={similarityThreshold}
            onChange={(e) => setSimilarityThreshold(e.target.value)}
            className="w-full cursor-pointer accent-indigo-500"
          />
          <p className="text-[11px] text-slate-600">Minimum cosine similarity required to include a document chunk as context.</p>
        </div>

        {/* Public Chat Access */}
        <div className="space-y-2 pt-2 border-t border-white/5">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isPublicChatEnabled}
              onChange={(e) => setIsPublicChatEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-white/5 text-indigo-500 focus:ring-indigo-500/20"
            />
            <div className="space-y-0.5">
              <span className="text-sm font-medium text-slate-200">Enable Public Chat Page</span>
              <p className="text-[11px] text-slate-500">If disabled, the /chat page will be restricted (widget will still work).</p>
            </div>
          </label>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-10 bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-500 hover:to-purple-600 text-white rounded-xl border-0 shadow-lg shadow-indigo-500/20 text-sm font-medium gap-2"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              Saving…
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Save Configuration
            </span>
          )}
        </Button>
      </form>
    </div>
  );
}
