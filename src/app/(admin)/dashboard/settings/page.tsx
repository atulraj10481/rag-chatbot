import WhiteLabelForm from '@/components/admin/white-label-form';
import { Settings } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="space-y-8 max-w-6xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">White-Label Settings</h1>
          <p className="text-sm text-slate-500 mt-1">
            Customize chatbot name, brand colors, welcome messages, and model routing strategy.
          </p>
        </div>
        <span className="text-xs font-medium text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-full px-3 py-1.5 flex items-center gap-1.5">
          <Settings className="h-3 w-3" />
          Phase 5 · Branding
        </span>
      </div>

      <WhiteLabelForm />
    </div>
  );
}
