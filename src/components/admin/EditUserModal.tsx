'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { updateUserAction, deleteUserAction } from '@/app/actions/admin';
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
import { Edit2, Loader2, Trash2, Check } from 'lucide-react';

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

interface EditUserModalProps {
  user: {
    id: string;
    email: string | null;
    role: string;
    department_id?: string;
    departments?: string[];
  };
}

export function EditUserModal({ user }: EditUserModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [role, setRole] = useState(user.role);
  
  // Initialize departments array safely
  const initialDepts = user.departments && user.departments.length > 0 
    ? user.departments 
    : [user.department_id || 'general'];
    
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>(initialDepts);
  const [password, setPassword] = useState('');
  const router = useRouter();

  const toggleDepartment = (dept: string) => {
    if (selectedDepartments.includes(dept)) {
      if (selectedDepartments.length === 1) {
        toast.error('User must have at least one department allocated.');
        return;
      }
      setSelectedDepartments(selectedDepartments.filter(d => d !== dept));
    } else {
      setSelectedDepartments([...selectedDepartments, dept]);
    }
  };

  async function onUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (selectedDepartments.length === 0) {
      toast.error('Please select at least one department.');
      return;
    }

    setLoading(true);
    
    const formData = new FormData();
    formData.append('userId', user.id);
    formData.append('role', role);
    formData.append('departments', JSON.stringify(selectedDepartments));
    if (password) formData.append('password', password);

    const result = await updateUserAction(formData);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(result.message);
      setOpen(false);
      router.refresh();
    }
    setLoading(false);
  }

  async function onDelete() {
    if (!confirm(`Are you sure you want to permanently delete user ${user.email || user.id}?`)) {
      return;
    }

    setDeleteLoading(true);
    const result = await deleteUserAction(user.id);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(result.message);
      setOpen(false);
      router.refresh();
    }
    setDeleteLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg" />}>
        <Edit2 className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Edit User Profile</DialogTitle>
          <DialogDescription>
            Modify role clearance and multi-department partitions for <span className="font-semibold text-slate-200">{user.email || user.id.slice(0, 8)}</span>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onUpdate} className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-300">Role Clearance</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="flex h-10 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 outline-none capitalize cursor-pointer"
            >
              <option value="employee" className="bg-slate-900 text-white">Employee (Staff Clearance)</option>
              <option value="manager" className="bg-slate-900 text-white">Manager (Management Clearance)</option>
              <option value="admin" className="bg-slate-900 text-white">Admin (Global Clearance)</option>
            </select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-300">Department Partitions</label>
              <span className="text-[11px] text-indigo-400 font-mono">{selectedDepartments.length} selected</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {DEPARTMENTS.map((dept) => {
                const isSelected = selectedDepartments.includes(dept);
                return (
                  <button
                    key={dept}
                    type="button"
                    onClick={() => toggleDepartment(dept)}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium capitalize border transition-all ${
                      isSelected
                        ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-200 shadow-[0_0_10px_rgba(99,102,241,0.15)]'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-slate-200'
                    }`}
                  >
                    <span>{dept}</span>
                    {isSelected && <Check className="h-3 w-3 text-indigo-400" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-300">Reset Password (Optional)</label>
            <Input
              type="password"
              placeholder="Leave blank to keep unchanged"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              className="bg-white/5 border-white/10 text-white rounded-xl"
            />
            <p className="text-[11px] text-slate-500">Type 6+ characters to overwrite this user's password.</p>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-white/5">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={onDelete}
              disabled={deleteLoading || loading}
              className="gap-1.5 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl"
            >
              {deleteLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              Delete User
            </Button>

            <Button type="submit" size="sm" disabled={loading || deleteLoading} className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-4">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
