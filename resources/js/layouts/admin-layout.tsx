import Brand from '@/components/marketplace/brand';
import MenuIcon from '@/components/marketplace/menu-icon';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Link, usePage } from '@inertiajs/react';
import {
    FolderTree,
    LayoutDashboard,
    LogOut,
    Package,
    ScrollText,
    Sprout,
    Star,
    Store,
    Users,
} from 'lucide-react';
import { type ReactNode, useState } from 'react';

const sections = [
    { href: '/admin', label: 'Evidencija', icon: LayoutDashboard, exact: true },
    { href: '/admin/proizvodjaci', label: 'Proizvođači', icon: Sprout },
    { href: '/admin/proizvodi', label: 'Proizvodi', icon: Package },
    { href: '/admin/kategorije', label: 'Kategorije', icon: FolderTree },
    { href: '/admin/korisnici', label: 'Korisnici', icon: Users },
    { href: '/admin/ocene', label: 'Ocene', icon: Star },
    { href: '/admin/logovi', label: 'Logovi', icon: ScrollText },
];

/**
 * Admin shell (task 14): a fixed left sidebar that stays put while the
 * section on the right changes, with the active item highlighted. The spec
 * allows the panel its own chrome, so it swaps the public header for this
 * rather than nesting inside it.
 */
export default function AdminLayout({ children, title }: { children: ReactNode; title: string }) {
    const { url } = usePage();
    const [menuOpen, setMenuOpen] = useState(false);

    const isActive = (section: (typeof sections)[number]) =>
        section.exact ? url === section.href : url.startsWith(section.href);

    const nav = (
        <nav className="space-y-1" aria-label="Admin sekcije">
            {sections.map((section) => (
                <Link
                    key={section.href}
                    href={section.href}
                    onClick={() => setMenuOpen(false)}
                    aria-current={isActive(section) ? 'page' : undefined}
                    className={cn(
                        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        isActive(section)
                            ? 'bg-olive-soft text-olive'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                >
                    <section.icon className="size-4 shrink-0" />
                    {section.label}
                </Link>
            ))}
        </nav>
    );

    return (
        <div className="bg-background paper-grain min-h-screen lg:flex">
            <aside className="border-border/70 bg-background/95 sticky top-0 z-40 border-b lg:h-screen lg:w-64 lg:shrink-0 lg:border-r lg:border-b-0">
                <div className="flex items-center justify-between gap-3 p-5">
                    <Brand />
                    <Button variant="outline" size="icon" className="lg:hidden" aria-label="Admin meni" onClick={() => setMenuOpen((o) => !o)}>
                        <MenuIcon open={menuOpen} />
                    </Button>
                </div>

                <div className={cn('px-3 pb-5', menuOpen ? 'block' : 'hidden lg:block')}>
                    {nav}

                    <div className="border-border/70 mt-5 border-t pt-4">
                        <Link
                            href="/"
                            className="text-muted-foreground hover:text-foreground flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors"
                        >
                            <Store className="size-4 shrink-0" />
                            Nazad na sajt
                        </Link>
                        <Link
                            href={route('logout')}
                            method="post"
                            as="button"
                            className="text-muted-foreground hover:text-destructive flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors"
                        >
                            <LogOut className="size-4 shrink-0" />
                            Odjava
                        </Link>
                    </div>
                </div>
            </aside>

            <main className="min-w-0 flex-1 px-5 py-8 sm:px-8 lg:px-12">
                <h1 className="font-serif text-3xl sm:text-4xl">{title}</h1>
                <div className="mt-8">{children}</div>
            </main>
        </div>
    );
}
