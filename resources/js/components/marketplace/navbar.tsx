import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { Heart, Package, Sprout } from 'lucide-react';
import { useState } from 'react';
import AccountMenu from './account-menu';
import Brand from './brand';
import MenuIcon from './menu-icon';
import MessagesLink from './messages-link';
import NotificationsBell from './notifications-bell';
import SearchForm from './search-form';

/**
 * The site's header: shared by every page except the admin panel, which has
 * its own shell. Sticky, so navigation and the inbox stay reachable no matter
 * how far down the page someone has scrolled.
 *
 * It's laid out in three parts - wordmark, where you can go, what you can do -
 * with a hairline rule separating the last two so browsing the catalog never
 * reads as the same kind of action as opening your own inbox. The current
 * section is underlined rather than merely coloured, so it survives at a
 * glance and without relying on colour alone.
 *
 * Below md the inline links and icon row would wrap onto several rows, so
 * they collapse into the account menu (or, for guests, a small menu of their
 * own) instead; messages keep their own button there since a waiting reply is
 * the one thing people check mid-browse.
 */
export default function Navbar() {
    const { auth } = usePage<SharedData>().props;
    const { url } = usePage();
    const [guestMenuOpen, setGuestMenuOpen] = useState(false);

    const sections = [
        { href: route('marketplace.producers.index'), paths: ['/proizvodjaci', '/proizvodjac'], label: 'Proizvođači', icon: Sprout },
        { href: route('marketplace.products.index'), paths: ['/proizvodi', '/proizvod'], label: 'Proizvodi', icon: Package },
    ];

    // The active section is derived from the current URL, never remembered
    // from what was clicked, so Back and Forward mark the right one too.
    //
    // Each section owns both its listing (/proizvodi) and a single entity
    // (/proizvod/{slug}), and the match has to stop at a path segment: a
    // plain startsWith would let /proizvodjac/mlekara match '/proizvod' as
    // well, leaving a producer's page with both sections underlined.
    const path = url.split(/[?#]/)[0].replace(/\/+$/, '') || '/';

    // Keep the header's field showing what the catalog is filtered by, so it
    // never contradicts the page under it.
    const searchTerm = new URLSearchParams(url.split('?')[1] ?? '').get('q');
    const isActive = (paths: string[]) => paths.some((candidate) => path === candidate || path.startsWith(`${candidate}/`));

    return (
        <header className="border-border bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-50 border-b backdrop-blur">
            <div className="mx-auto flex h-16 max-w-[1380px] items-center gap-4 px-5 sm:h-20 sm:px-8 lg:px-12">
                <Brand />

                <nav className="ml-6 hidden items-center gap-7 text-sm md:flex" aria-label="Glavna navigacija">
                    {sections.map((section) => {
                        const active = isActive(section.paths);

                        return (
                            <Link
                                key={section.href}
                                href={section.href}
                                aria-current={active ? 'page' : undefined}
                                className={cn(
                                    'group relative py-1 font-medium transition-colors',
                                    active ? 'text-foreground' : 'text-foreground/65 hover:text-foreground',
                                )}
                            >
                                {section.label}
                                {/* One underline for both states: it wipes in
                                    from the left on hover and stays put on the
                                    current section, so hovering the section
                                    you're already on doesn't redraw it.
                                    Transform-only, so it animates on the
                                    compositor. */}
                                <span
                                    aria-hidden
                                    className={cn(
                                        'bg-primary absolute -bottom-0.5 left-0 h-0.5 w-full origin-left rounded-full transition-transform duration-300 ease-out',
                                        active ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100 group-focus-visible:scale-x-100',
                                    )}
                                />
                            </Link>
                        );
                    })}
                </nav>

                {/* The one thing a visitor looking for something specific
                    reaches for first, so it sits in the header on every page
                    rather than only inside the catalog. */}
                <SearchForm target="/proizvodi" value={searchTerm} className="mx-6 hidden max-w-sm flex-1 lg:block" />

                <div className="ml-auto flex items-center gap-2 sm:gap-3">
                    {auth.user ? (
                        <>
                            <div className="mr-1 hidden items-center gap-4 md:flex">
                                <MessagesLink className="text-foreground/70 hover:text-foreground" />
                                <NotificationsBell className="text-foreground/70 hover:text-foreground" />
                                <Link
                                    href={route('favorites.index')}
                                    aria-label="Sačuvano"
                                    aria-current={isActive(['/omiljeni']) ? 'page' : undefined}
                                    className="text-foreground/70 hover:text-foreground transition-colors"
                                >
                                    <Heart className="size-5" />
                                </Link>
                                <span className="bg-border h-6 w-px" aria-hidden />
                            </div>

                            <AccountMenu user={auth.user} />
                        </>
                    ) : (
                        <>
                            <DropdownMenu open={guestMenuOpen} onOpenChange={setGuestMenuOpen}>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="icon" className="md:hidden" aria-label="Meni">
                                        <MenuIcon open={guestMenuOpen} />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" sideOffset={10} className="w-56 p-1.5">
                                    {sections.map((section) => (
                                        <DropdownMenuItem key={section.href} asChild>
                                            <Link href={section.href} className="cursor-pointer gap-2.5 py-2">
                                                <section.icon className="text-muted-foreground size-4" />
                                                {section.label}
                                            </Link>
                                        </DropdownMenuItem>
                                    ))}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild>
                                        <Link href={route('login')} className="cursor-pointer py-2">
                                            Prijava
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <Link href={route('register')} className="cursor-pointer py-2 font-medium">
                                            Otvori nalog
                                        </Link>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                                <Link href={route('login')}>Prijava</Link>
                            </Button>
                            <Button asChild size="sm" className="hidden sm:inline-flex">
                                <Link href={route('register')}>Otvori nalog</Link>
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}
