import { redirect } from 'next/navigation';

export default function AdminUsersLegacyRedirect() {
  redirect('/dashboard/users');
}
