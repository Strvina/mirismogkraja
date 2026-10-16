import DemoBanner from '@/components/demo-banner';
import Brand from '@/components/marketplace/brand';
import LanguageSwitcher from '@/components/marketplace/language-switcher';
import MenuIcon from '@/components/marketplace/menu-icon';
import { Button } from '@/components/ui/button';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useScrollLock } from '@/hooks/use-scroll-lock';
import { t, tx } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Link, usePage } from '@inertiajs/react';
import {
    Award,
    BookOpen,
    CalendarHeart,
    FilePen,
    Flag,
    FolderTree,
    Gift,
    LayoutDashboard,
    LogOut,
    Megaphone,
    Package,
    ScrollText,
    SearchX,
    ShieldCheck,
    Sprout,
    Star,
    Store,
    Users,
    Wallet,
} from 'lucide-react';
import { type ReactNode, useEffect, useRef, useState } from 'react';

const sections = [
    { href: '/admin', label: tx('Evidencija'), icon: LayoutDashboard, exact: true },
    { href: '/admin/proizvodjaci', label: tx('Proizvođači'), icon: Sprout },
    { href: '/admin/sertifikati', label: tx('Sertifikati'), icon: ShieldCheck },
    { href: '/admin/zahtevi', label: tx('Zahtevi za izmenu'), icon: FilePen },
    { href: '/admin/proizvodi', label: tx('Proizvodi'), icon: Package },
    { href: '/admin/price', label: tx('Priče i recepti'), icon: BookOpen },
    { href: '/admin/oglasi', label: tx('Oglasi „Tražim”'), icon: Megaphone },
    { href: '/admin/kategorije', label: tx('Kategorije'), icon: FolderTree },
    { href: '/admin/korisnici', label: tx('Korisnici'), icon: Users },
    { href: '/admin/utisci', label: tx('Utisci'), icon: Star },
    { href: '/admin/prijave', label: tx('Prijave'), icon: Flag },
    { href: '/admin/clanarine', label: tx('Članarine'), icon: Wallet },
    { href: '/admin/isticanja', label: tx('Isticanja'), icon: Megaphone },
    { href: '/admin/kampanje', label: tx('Kampanje'), icon: CalendarHeart },
    { href: '/admin/preporuke', label: tx('Preporuke'), icon: Gift },
    { href: '/admin/nedelja', label: tx('Proizvođač nedelje'), icon: Award },
    { href: '/admin/pretrage', label: tx('Šta kupci traže'), icon: SearchX },
    { href: '/admin/logovi', label: tx('Logovi'), icon: ScrollText },
];

/**
 * Admin shell: a fixed left sidebar that stays put while the
 * section on the right changes, with the active item highlighted. The spec
 * allows the panel its own chrome, so it swaps the public header for this
 * rather than nesting inside it.
 */
export default function AdminLayout({ children, title }: { children: ReactNode; title: string }) {
    const { url } = usePage();
    const [menuOpen, setMenuOpen] = useState(false);
    // Only on a phone is the menu a panel over the page; from lg it is the sidebar.
    const phone = !useMediaQuery('(min-width: 64rem)');
    const menu = useRef<HTMLDivElement>(null);
    useScrollLock(menuOpen && phone, menu);

    useEffect(() => {
        if (!menuOpen) {
            return;
        }

        const close = (event: KeyboardEvent) => event.key === 'Escape' && setMenuOpen(false);

        window.addEventListener('keydown', close);

        return () => window.removeEventListener('keydown', close);
    }, [menuOpen]);

    // Derived from the URL, and matched a whole segment at a time so one
    // section's path can never light up a sibling whose path starts the same
    // way.
    const path = url.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
    const isActive = (section: (typeof sections)[number]) =>
        section.exact ? path === section.href : path === section.href || path.startsWith(`${section.href}/`);

    const nav = (
        <nav className="space-y-1" aria-label={t('Admin sekcije')}>
            {sections.map((section) => (
                <Link
                    key={section.href}
                    href={section.href}
                    onClick={() => setMenuOpen(false)}
                    aria-current={isActive(section) ? 'page' : undefined}
                    className={cn(
                        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        isActive(section) ? 'bg-olive-soft text-olive' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                >
                    <section.icon className="size-4 shrink-0" />
                    {t(section.label)}
                </Link>
            ))}
        </nav>
    );

    return (
        <div className="bg-background paper-grain min-h-screen lg:flex">
            <aside
                data-site-header
                className="border-border/70 bg-background/95 sticky top-0 z-40 border-b lg:h-screen lg:w-64 lg:shrink-0 lg:border-r lg:border-b-0"
            >
                <div className="flex items-center justify-between gap-3 p-5">
                    <Brand />
                    <div className="flex items-center gap-2">
                        <LanguageSwitcher />
                        <Button
                            variant="outline"
                            size="icon"
                            className="lg:hidden"
                            aria-label={t('Admin meni')}
                            aria-expanded={menuOpen}
                            aria-controls="admin-menu"
                            onClick={() => setMenuOpen((o) => !o)}
                        >
                            <MenuIcon open={menuOpen} />
                        </Button>
                    </div>
                </div>

                {/* On a phone the open menu is a panel of its own under the
                    header, scrolling by itself while the page stays put: all
                    twenty links did not fit, and folded into the sticky
                    header they pushed the page down and could not be reached. */}
                <div
                    id="admin-menu"
                    ref={menu}
                    className={cn(
                        'px-3 pb-5',
                        menuOpen
                            ? 'max-lg:bg-background block max-lg:fixed max-lg:inset-x-0 max-lg:top-20 max-lg:bottom-0 max-lg:z-40 max-lg:overflow-y-auto max-lg:overscroll-contain max-lg:border-t max-lg:pt-3'
                            : 'hidden lg:block',
                    )}
                >
                    {nav}

                    <div className="border-border/70 mt-5 border-t pt-4">
                        <Link
                            href="/"
                            className="text-muted-foreground hover:text-foreground flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors"
                        >
                            <Store className="size-4 shrink-0" />
                            {t('Nazad na sajt')}
                        </Link>
                        <Link
                            href={route('logout')}
                            method="post"
                            as="button"
                            className="text-muted-foreground hover:text-destructive flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors"
                        >
                            <LogOut className="size-4 shrink-0" />
                            {t('Odjava')}
                        </Link>
                    </div>
                </div>
            </aside>

            <main className="min-w-0 flex-1 px-5 py-8 sm:px-8 lg:px-12">
                {/* Edge to edge across the main column, above the title. */}
                <DemoBanner className="-mx-5 -mt-8 mb-8 sm:-mx-8 lg:-mx-12" />
                <h1 className="font-serif text-3xl sm:text-4xl">{title}</h1>
                <div className="mt-8">{children}</div>
            </main>
        </div>
    );
}
