'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { toast } from 'sonner';

export function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error('Error logging out');
    } else {
      router.push('/login');
      router.refresh();
    }
  };

  return (
    <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2 text-xs h-8 text-muted-foreground hover:text-foreground">
      <LogOut className="h-3 w-3" />
      Logout
    </Button>
  );
}
