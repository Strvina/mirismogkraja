import { Button } from '@/components/ui/button';
import AdminLayout from '@/layouts/admin-layout';
import { type User } from '@/types';
import { Head, router } from '@inertiajs/react';

const ALL_ROLES = ['buyer', 'seller', 'admin'];

export default function AdminUsersIndex({ users }: { users: User[] }) {
    const toggleRole = (user: User, role: string) => {
        const current = (user.roles ?? []).map((r) => r.name);
        const next = current.includes(role) ? current.filter((r) => r !== role) : [...current, role];
        router.patch(route('admin.users.roles', user.id), { roles: next }, { preserveScroll: true });
    };

    const toggleBlock = (user: User) => {
        router.patch(route('admin.users.block', user.id), {}, { preserveScroll: true });
    };

    return (
        <AdminLayout title="Korisnici">
            <Head title="Korisnici" />

            <div className="flex flex-col gap-4">

                <div className="space-y-2">
                    {users.map((user) => {
                        const roleNames = (user.roles ?? []).map((r) => r.name);
                        return (
                            <div key={user.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
                                <div>
                                    <p className="font-medium">{user.name}</p>
                                    <p className="text-muted-foreground text-xs">{user.email}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {ALL_ROLES.map((role) => (
                                        <button
                                            key={role}
                                            onClick={() => toggleRole(user, role)}
                                            className={`rounded-full px-2 py-1 text-xs ${
                                                roleNames.includes(role) ? 'bg-primary text-primary-foreground' : 'bg-muted'
                                            }`}
                                        >
                                            {role}
                                        </button>
                                    ))}
                                </div>
                                <Button variant={user.blocked_at ? 'outline' : 'destructive'} size="sm" onClick={() => toggleBlock(user)}>
                                    {user.blocked_at ? 'Odblokiraj' : 'Blokiraj'}
                                </Button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </AdminLayout>
    );
}
