import Pagination, { type Paginated } from '@/components/marketplace/pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AdminLayout from '@/layouts/admin-layout';
import { t } from '@/lib/i18n';
import { type User } from '@/types';
import { Head, router } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

const ALL_ROLES = ['buyer', 'seller', 'admin'];

type AdminUser = Pick<User, 'id' | 'name' | 'email' | 'blocked_at' | 'roles'>;

export default function AdminUsersIndex({ users, filters }: { users: Paginated<AdminUser>; filters: { search: string | null } }) {
    const [search, setSearch] = useState(filters.search ?? '');

    const submitSearch: FormEventHandler = (e) => {
        e.preventDefault();
        router.get(route('admin.users.index'), search ? { search } : {}, { preserveState: true });
    };

    const toggleRole = (user: AdminUser, role: string) => {
        const current = (user.roles ?? []).map((r) => r.name);
        const next = current.includes(role) ? current.filter((r) => r !== role) : [...current, role];
        router.patch(route('admin.users.roles', user.id), { roles: next }, { preserveScroll: true });
    };

    const toggleBlock = (user: AdminUser) => {
        router.patch(route('admin.users.block', user.id), {}, { preserveScroll: true });
    };

    return (
        <AdminLayout title={t('Korisnici')}>
            <Head title={t('Korisnici')} />

            <div className="flex flex-col gap-4">
                <form onSubmit={submitSearch} role="search" className="flex max-w-md gap-2">
                    <Input
                        type="search"
                        aria-label={t('Pretraga korisnika')}
                        placeholder={t('Ime ili e-mail')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <Button type="submit" variant="outline">
                        {t('Traži')}
                    </Button>
                </form>

                {users.data.length === 0 && <p className="text-muted-foreground text-sm">{t('Nema korisnika za ovu pretragu.')}</p>}

                <div className="space-y-2">
                    {users.data.map((user) => {
                        const roleNames = (user.roles ?? []).map((r) => r.name);
                        return (
                            <div key={user.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
                                <div>
                                    <p className="font-medium">{user.name}</p>
                                    <p className="text-muted-foreground text-xs">{user.email}</p>
                                </div>
                                <div className="flex items-center gap-2" role="group" aria-label={`Uloge: ${user.name}`}>
                                    {ALL_ROLES.map((role) => (
                                        <button
                                            key={role}
                                            type="button"
                                            aria-pressed={roleNames.includes(role)}
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

                <Pagination meta={users} />
            </div>
        </AdminLayout>
    );
}
