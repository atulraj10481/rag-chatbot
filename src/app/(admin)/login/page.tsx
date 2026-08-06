'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Sparkles, Lock, Mail, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message);
      setLoading(false);
    } else {
      toast.success('Successfully logged in!');
      router.push('/dashboard');
      router.refresh();
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Check your email for the magic login link!');
    }
    setLoading(false);
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background p-4 relative overflow-hidden selection:bg-primary/30">
      {/* Background ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-500/10 blur-[140px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-purple-500/10 blur-[140px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm relative z-10"
      >
        {/* Logo / Brand Mark */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <div className="relative">
            <motion.div
              className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-500/30"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Sparkles className="h-6 w-6 text-white" />
            </motion.div>
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-400 border-2 border-background shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-white tracking-tight">Admin Portal</h1>
            <p className="text-xs text-slate-500 mt-0.5">Company RAG Chatbot Platform</p>
          </div>
        </div>

        {/* Auth Card */}
        <div className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl p-6">
          <Tabs defaultValue="password" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-white/5 border border-white/10 rounded-xl p-1">
              <TabsTrigger
                value="password"
                className="rounded-lg text-xs font-medium data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-sm text-slate-500 transition-all"
              >
                <Lock className="h-3 w-3 mr-1.5" />
                Password
              </TabsTrigger>
              <TabsTrigger
                value="magic"
                className="rounded-lg text-xs font-medium data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-sm text-slate-500 transition-all"
              >
                <Sparkles className="h-3 w-3 mr-1.5" />
                Magic Link
              </TabsTrigger>
            </TabsList>

            <TabsContent value="password">
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400">Email</label>
                  <Input
                    type="email"
                    placeholder="admin@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-indigo-500/50 focus:ring-indigo-500/20 rounded-xl h-10 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400">Password</label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-indigo-500/50 focus:ring-indigo-500/20 rounded-xl h-10 text-sm"
                  />
                </div>
                <motion.div whileTap={{ scale: 0.98 }}>
                  <Button
                    type="submit"
                    className="w-full h-10 bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-500 hover:to-purple-600 text-white rounded-xl border-0 shadow-lg shadow-indigo-500/20 text-sm font-medium transition-all"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <motion.span
                          className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                        />
                        Signing in…
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        Sign In <ArrowRight className="h-4 w-4" />
                      </span>
                    )}
                  </Button>
                </motion.div>
              </form>
            </TabsContent>

            <TabsContent value="magic">
              <form onSubmit={handleMagicLink} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400">Email</label>
                  <Input
                    type="email"
                    placeholder="admin@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-indigo-500/50 focus:ring-indigo-500/20 rounded-xl h-10 text-sm"
                  />
                </div>
                <motion.div whileTap={{ scale: 0.98 }}>
                  <Button
                    type="submit"
                    className="w-full h-10 bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-500 hover:to-purple-600 text-white rounded-xl border-0 shadow-lg shadow-indigo-500/20 text-sm font-medium"
                    disabled={loading}
                  >
                    {loading ? 'Sending link…' : (
                      <span className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Send Magic Link
                      </span>
                    )}
                  </Button>
                </motion.div>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        <p className="text-center text-[11px] text-slate-600 mt-4">
          Single-tenant secure access · Company internal use only
        </p>
      </motion.div>
    </div>
  );
}
