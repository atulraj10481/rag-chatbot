'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { updatePasswordAction } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { KeyRound, Loader2 } from 'lucide-react';

export function ChangePasswordModal() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(formData: FormData) {
    const password = formData.get('password') as string;
    const confirm = formData.get('confirm') as string;

    if (password !== confirm) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    const result = await updatePasswordAction(formData);
    
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(result.message);
      setOpen(false);
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" className="gap-2 text-xs h-8" />}>
        <KeyRound className="h-3 w-3" />
        Change Password
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Update Password</DialogTitle>
          <DialogDescription>
            Enter a new password for your account. It must be at least 6 characters.
          </DialogDescription>
        </DialogHeader>
        <form action={onSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">New Password</label>
            <Input name="password" type="password" required minLength={6} placeholder="••••••••" />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Confirm Password</label>
            <Input name="confirm" type="password" required minLength={6} placeholder="••••••••" />
          </div>

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Password'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
