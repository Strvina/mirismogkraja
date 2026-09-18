import { cn } from '@/lib/utils';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';

const sidebarNavItems: NavItem[] = [
    { title: 'Profil', url: '/settings/profile', icon: null },
    { title: 'Lozinka', url: '/settings/password', icon: null },
    { title: 'Izgled', url: '/settings/appearance', icon: null },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
    const { url } = usePage();

    return (
        <>
            <h1 className="font-serif text-4xl sm:text-5xl">Moj nalog</h1>
            <p className="text-muted-foreground mt-3 max-w-lg leading-7">
                Podesite svoje podatke, lozinku i izgled naloga.
            </p>

            <div className="mt-10 flex flex-col gap-10 lg:flex-row lg:gap-16">
                <aside className="lg:w-56">
                    <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:gap-1" aria-label="Podešavanja naloga">
                        {sidebarNavItems.map((item) => (
                            <Link
                                key={item.url}
                                href={item.url}
                                prefetch
                                className={cn(
                                    'rounded-md px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors',
                                    url.startsWith(item.url)
                                        ? 'bg-olive-soft text-olive'
                                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                                )}
                            >
                                {item.title}
                            </Link>
                        ))}
                    </nav>
                </aside>

                <section className="max-w-xl flex-1 space-y-12">{children}</section>
            </div>
        </>
    );
}
