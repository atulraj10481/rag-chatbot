'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createUserAction } from '@/app/actions/admin';
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
import { PlusCircle, Loader2, Check } from 'lucide-react';

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

export function CreateUserModal() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>(['general']);
  const [role, setRole] = useState('employee');
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

  async function onSubmit(formData: FormData) {
    if (selectedDepartments.length === 0) {
      toast.error('Please select at least one department.');
      return;
    }

    setLoading(true);
    formData.append('role', role);
    formData.append('departments', JSON.stringify(selectedDepartments));

    const result = await createUserAction(formData);
    
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(result.message);
      setOpen(false);
      setSelectedDepartments(['general']);
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="gap-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-500/20" />}>
        <PlusCircle className="h-4 w-4" />
        Create New User
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Create User Account</DialogTitle>
          <DialogDescription>
            Provision an account and assign their role clearance and multi-department partitions.
          </DialogDescription>
        </DialogHeader>
        <form action={onSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-300">Email Address</label>
            <Input name="email" type="email" placeholder="staff@company.com" required className="bg-white/5 border-white/10 text-white rounded-xl" />
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-300">Temporary Password</label>
            <Input name="password" type="text" placeholder="e.g. TempPass123!" required minLength={6} className="bg-white/5 border-white/10 text-white rounded-xl" />
            <p className="text-[11px] text-slate-500">They can change this from their dashboard later.</p>
          </div>

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
            <p className="text-[11px] text-slate-500">The assistant will query across all selected departments simultaneously.</p>
          </div>

          <div className="flex justify-end pt-4 border-t border-white/5">
            <Button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl h-10">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
