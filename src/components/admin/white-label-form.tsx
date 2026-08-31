'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Save, Copy, Check, Code, Shield, Building2, Globe } from 'lucide-react';

const DEPARTMENTS = [
  'general',
  'marketing',
  'finance',
  'sales',
  'operations',
  'hr',
  'tech',
  'admin',
];

export default function WhiteLabelForm() {
  const [chatbotName, setChatbotName] = useState('Company Assistant');
  const [welcomeMessage, setWelcomeMessage] = useState('Hi! How can I help you today?');
  const [primaryColor, setPrimaryColor] = useState('#3b82f6');
  const [modelPreference, setModelPreference] = useState('auto');
  const [similarityThreshold, setSimilarityThreshold] = useState('0.5');
  const [suggestedQuestions, setSuggestedQuestions] = useState('');
  const [isPublicChatEnabled, setIsPublicChatEnabled] = useState(false);
  const [allowedDomains, setAllowedDomains] = useState('');
  const [loading, setLoading] = useState(false);

  // Embed script generator state
  const [embedDept, setEmbedDept] = useState('general');
  const [embedTitle, setEmbedTitle] = useState('Company Assistant');
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState('https://your-domain.com');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }

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
          if (data.settings.allowed_domains) {
            setAllowedDomains(data.settings.allowed_domains.join('\n'));
          }
        }
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const parsedDomains = allowedDomains
        .split('\n')
        .map((d) => d.trim().replace(/^https?:\/\//, '').replace(/\/$/, ''))
        .filter((d) => d.length > 0);

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
          allowed_domains: parsedDomains,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save settings');
      toast.success('White-label & security configuration saved!');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generatedScriptCode = `<script\n  src="${origin}/embed.js"\n  data-department="${embedDept}"\n  data-title="${embedTitle || chatbotName}"\n  data-primary-color="${primaryColor}"\n  defer\n></script>`;

  const copyEmbedCode = () => {
    navigator.clipboard.writeText(generatedScriptCode);
    setCopied(true);
    toast.success(`Copied embed code for "${embedDept}" department!`);
    setTimeout(() => setCopied(false), 2500);
  };

  const fieldClass = "bg-white/5 border-white/10 text-slate-200 placeholder:text-slate-600 focus:border-indigo-500/40 focus:ring-indigo-500/10 rounded-xl";

  return (
    <div className="space-y-8 max-w-4xl">
      {/* 1. Department-Specific Embed Script Generator */}
      <div className="rounded-2xl bg-white/3 border border-white/8 overflow-hidden shadow-xl backdrop-blur-xl">
        <div className="p-5 border-b border-white/5 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Code className="h-4 w-4 text-indigo-400" />
              Department-Specific Embed Script Generator
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Generate customized floating widget scripts for SharePoint, Notion, or company wikis.</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            Intranet & Widget Integration
          </span>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-indigo-400" />
                Target Department Partition
              </label>
              <select
                value={embedDept}
                onChange={(e) => setEmbedDept(e.target.value)}
                className="flex h-10 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white focus:border-indigo-500/50 outline-none capitalize cursor-pointer"
              >
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept} className="bg-slate-900 text-white capitalize">
                    {dept} Department
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500">Widget queries strictly within the {embedDept} partition + general docs.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Widget Display Title</label>
              <Input
                value={embedTitle}
                onChange={(e) => setEmbedTitle(e.target.value)}
                placeholder="e.g. Sales Knowledge Hub"
                className={fieldClass}
              />
              <p className="text-[11px] text-slate-500">Header title shown on the floating popup chat.</p>
            </div>
          </div>

          {/* Generated Code Display Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Embed Script Snippet</label>
              <Button
                type="button"
                size="sm"
                onClick={copyEmbedCode}
                className="h-7 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg gap-1.5 px-3 shadow-sm"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied!' : 'Copy Embed Code'}
              </Button>
            </div>
            <pre className="p-4 rounded-xl bg-black/60 border border-white/10 text-xs font-mono text-indigo-300 overflow-x-auto selection:bg-indigo-500/40">
              {generatedScriptCode}
            </pre>
          </div>
        </div>
      </div>

      {/* 2. Chatbot Branding & Model Preferences */}
      <div className="rounded-2xl bg-white/3 border border-white/8 overflow-hidden shadow-xl backdrop-blur-xl">
        <div className="p-5 border-b border-white/5">
          <h2 className="text-sm font-semibold text-slate-200">Chatbot Branding & Engine Preferences</h2>
          <p className="text-xs text-slate-500 mt-0.5">Changes apply to the embedded widget and staff portals immediately after saving.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Chatbot Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Default Chatbot Name</label>
            <Input
              value={chatbotName}
              onChange={(e) => setChatbotName(e.target.value)}
              placeholder="e.g. Acme Enterprise Assistant"
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
              placeholder="Where can I find our vacation policy?&#10;How do I submit an expense report?"
              className={`${fieldClass} resize-none`}
            />
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
              className="w-full h-10 px-3 border border-white/10 rounded-xl text-sm bg-slate-900 text-slate-300 focus:border-indigo-500/40 focus:outline-none"
            >
              <option value="auto" className="bg-[#1a1a1a]">Auto Dynamic Routing (Recommended)</option>
              <option value="cheap" className="bg-[#1a1a1a]">Cheap — Gemini 2.0 Flash ($0.10/1M)</option>
              <option value="standard" className="bg-[#1a1a1a]">Standard — Llama 4 Scout ($0.20/1M)</option>
              <option value="premium" className="bg-[#1a1a1a]">Premium — Claude 3.5 Sonnet ($3.00/1M)</option>
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

          {/* Domain Whitelist (Allowed Domains) */}
          <div className="space-y-1.5 pt-2 border-t border-white/5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-emerald-400" />
              Allowed Origin Domains (Whitelisting)
            </label>
            <Textarea
              value={allowedDomains}
              onChange={(e) => setAllowedDomains(e.target.value)}
              rows={2}
              placeholder="company.internal&#10;sharepoint.company.com&#10;notion.so"
              className={`${fieldClass} font-mono text-xs resize-none`}
            />
            <p className="text-[11px] text-slate-500">Leave blank to permit embedding on all domains. Enter one domain per line to restrict where the script can load.</p>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl border-0 shadow-lg shadow-indigo-500/20 text-sm font-semibold gap-2"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                Saving Configuration…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                Save Settings & Whitelist
              </span>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
