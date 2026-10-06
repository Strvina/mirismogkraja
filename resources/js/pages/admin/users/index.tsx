import Head from '@/components/head';
import Pagination, { type Paginated } from '@/components/marketplace/pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AdminLayout from '@/layouts/admin-layout';
import { ask } from '@/lib/confirm';
import { formatDate } from '@/lib/format';
import { t, tx } from '@/lib/i18n';
import { thumbUrl } from '@/lib/media';
import { cn } from '@/lib/utils';
import { type SharedData, type User } from '@/types';
import { router, usePage } from '@inertiajs/react';
import { Ban, Check, Search, Store } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

type Group = 'all' | 'sellers' | 'admins' | 'blocked';

type AdminUser = Pick<User, 'id' | 'name' | 'email' | 'avatar_path' | 'blocked_at' | 'created_at' | 'roles'> & { producers_count: number };

const GROUPS: { key: Group; label: string }[] = [
    { key: 'all', label: tx('Svi') },
    { key: 'sellers', label: tx('Proizvođači') },
    { key: 'admins', label: tx('Admini') },
    { key: 'blocked', label: tx('Blokirani') },
];

/** What each role lets someone do, said on the toggle itself. */
const ROLES: { name: string; label: string; hint: string }[] = [
    { name: 'buyer', label: tx('Kupac'), hint: tx('Piše proizvođačima, čuva omiljene, ostavlja utiske') },
    { name: 'seller', label: tx('Proizvođač'), hint: tx('Može da otvori i vodi stranicu proizvođača') },
    { name: 'admin', label: tx('Admin'), hint: tx('Pun pristup admin panelu') },
];

function Avatar({ user }: { user: AdminUser }) {
    if (user.avatar_path) {
        return <img src={thumbUrl(user.avatar_path)} alt="" loading="lazy" className="size-10 shrink-0 rounded-full object-cover" />;
    }

    return (
        <span className="bg-olive-soft text-olive grid size-10 shrink-0 place-items-center rounded-full text-sm font-semibold">
            {user.name.charAt(0).toUpperCase()}
        </span>
    );
}

export default function AdminUsersIndex({
    users,
    filters,
    counts,
}: {
    users: Paginated<AdminUser>;
    filters: { search: string | null; group: Group };
    counts: Record<Group, number>;
}) {
    const { auth } = usePage<SharedData>().props;
    const [search, setSearch] = useState(filters.search ?? '');

    const visit = (params: { search?: string | null; group?: Group }) => {
        const next = { search: filters.search, group: filters.group, ...params };

        router.get(
            route('admin.users.index'),
            { ...(next.search ? { search: next.search } : {}), ...(next.group !== 'all' ? { group: next.group } : {}) },
            { preserveState: true, preserveScroll: true },
        );
    };

    const submitSearch: FormEventHandler = (e) => {
        e.preventDefault();
        visit({ search });
    };

    const toggleRole = async (user: AdminUser, role: string) => {
        const current = (user.roles ?? []).map((r) => r.name);
        const adding = !current.includes(role);

        // Making someone an admin hands them everything; say so first.
        if (
            role === 'admin' &&
            adding &&
            !(await ask({
                title: t('Dati korisniku :name pun pristup admin panelu?', { name: user.name }),
                description: t('Moći će da odobrava, menja i briše sve na sajtu.'),
                confirmLabel: t('Dodeli'),
            }))
        ) {
            return;
        }

        router.patch(
            route('admin.users.roles', user.id),
            { roles: adding ? [...current, role] : current.filter((r) => r !== role) },
            { preserveScroll: true },
        );
    };

    const toggleBlock = async (user: AdminUser) => {
        if (
            user.blocked_at ||
            (await ask({
                title: t('Blokirati korisnika :name?', { name: user.name }),
                description: t('Neće moći da se prijavi dok ga ne odblokirate.'),
                confirmLabel: t('Blokiraj'),
                tone: 'danger',
            }))
        ) {
            router.patch(route('admin.users.block', user.id), {}, { preserveScroll: true });
        }
    };

    return (
        <AdminLayout title={t('Korisnici')}>
            <Head title={t('Korisnici')} />

            <div className="flex flex-col gap-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <nav aria-label={t('Grupe korisnika')} className="flex flex-wrap gap-1">
                        {GROUPS.map((group) => (
                            <button
                                key={group.key}
                                type="button"
                                onClick={() => visit({ group: group.key })}
                                className={cn(
                                    'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                                    filters.group === group.key ? 'bg-olive-soft text-olive' : 'text-muted-foreground hover:bg-muted',
                                )}
                            >
                                {t(group.label)}
                                <span className="bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-[0.65rem] tabular-nums">
                                    {counts[group.key]}
                                </span>
                            </button>
                        ))}
                    </nav>

                    <form onSubmit={submitSearch} role="search" className="relative w-full sm:w-72">
                        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" aria-hidden />
                        <Input
                            type="search"
                            aria-label={t('Pretraga korisnika')}
                            placeholder={t('Ime ili e-mail')}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9"
                        />
                    </form>
                </div>

                {users.data.length === 0 ? (
                    <p className="text-muted-foreground rounded-xl border border-dashed p-8 text-center text-sm">
                        {t('Nema korisnika za ovu pretragu.')}
                    </p>
                ) : (
                    <ul className="divide-border/70 bg-background divide-y overflow-hidden rounded-xl border">
                        {users.data.map((user) => {
                            const roleNames = (user.roles ?? []).map((r) => r.name);
                            const isMe = user.id === auth.user?.id;

                            return (
                                <li
                                    key={user.id}
                                    className={cn(
                                        'grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center',
                                        user.blocked_at && 'bg-destructive/5',
                                    )}
                                >
                                    <div className="flex min-w-0 items-center gap-3">
                                        <Avatar user={user} />
                                        <div className="min-w-0">
                                            <p className="flex flex-wrap items-center gap-2 font-medium">
                                                <span className="truncate">{user.name}</span>
                                                {isMe && (
                                                    <span className="bg-muted rounded-full px-2 py-0.5 text-[0.65rem] font-semibold">{t('Vi')}</span>
                                                )}
                                                {user.blocked_at && (
                                                    <span className="bg-destructive/10 text-destructive flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.65rem] font-semibold">
                                                        <Ban className="size-3" aria-hidden />
                                                        {t('Blokiran')}
                                                    </span>
                                                )}
                                            </p>
                                            <p className="text-muted-foreground truncate text-sm">{user.email}</p>
                                            <p className="text-muted-foreground mt-0.5 flex flex-wrap gap-x-3 text-xs">
                                                <span>{t('Član od :date', { date: formatDate(user.created_at) })}</span>
                                                {user.producers_count > 0 && (
                                                    <span className="flex items-center gap-1">
                                                        <Store className="size-3" aria-hidden />
                                                        {t('Proizvođača: :count', { count: user.producers_count })}
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('Uloge: :name', { name: user.name })}>
                                        {ROLES.map((role) => {
                                            const on = roleNames.includes(role.name);

                                            return (
                                                <button
                                                    key={role.name}
                                                    type="button"
                                                    aria-pressed={on}
                                                    title={t(role.hint)}
                                                    disabled={isMe && role.name === 'admin'}
                                                    onClick={() => toggleRole(user, role.name)}
                                                    className={cn(
                                                        'flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-60',
                                                        on
                                                            ? 'border-primary/30 bg-primary/10 text-primary'
                                                            : 'border-border text-muted-foreground hover:bg-muted',
                                                    )}
                                                >
                                                    {on && <Check className="size-3" aria-hidden />}
                                                    {t(role.label)}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {!isMe && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className={cn(!user.blocked_at && 'text-destructive hover:text-destructive')}
                                            onClick={() => toggleBlock(user)}
                                        >
                                            <Ban className="size-4" />
                                            {user.blocked_at ? t('Odblokiraj') : t('Blokiraj')}
                                        </Button>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}

                <Pagination meta={users} />
            </div>
        </AdminLayout>
    );
}
