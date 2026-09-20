import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ChevronDown, Heart, LogOut, Menu, MessageCircle } from 'lucide-react';
import Brand from './brand';
import CartLink from './cart-link';
import MessagesLink from './messages-link';

/**
 * The site's header: shared by every page except the admin panel, which has
 * its own shell. Sticky, so navigation and the cart stay reachable no matter
 * how far down the page someone has scrolled.
 *
 * Below md the inline links and icon row would wrap onto several rows, so
 * they collapse into a single menu instead; the cart keeps its own button
 * there since it's the one thing people reach for mid-browse.
 */
export default function Navbar() {
    const { auth, unreadMessages } = usePage<SharedData>().props;
    const isAdmin = auth.user?.roles?.some((role) => role.name === 'admin') ?? false;

    const accountLinks = [
        { href: route('profile.edit'), label: 'Moj nalog' },
        { href: route('orders.mine'), label: 'Moji upiti' },
        { href: route('producers.index'), label: 'Moji proizvođači' },
        { href: route('favorites.index'), label: 'Omiljeni' },
    ];

    return (
        <header className="border-border bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-50 border-b backdrop-blur">
            <div className="mx-auto flex h-16 max-w-[1380px] items-center justify-between gap-3 px-5 sm:h-20 sm:px-8 lg:px-12">
                <Brand />

                <nav className="hidden items-center gap-8 text-sm font-medium md:flex" aria-label="Glavna navigacija">
                    <Link href={route('marketplace.producers.index')} className="transition-opacity hover:opacity-70">
                        Proizvođači
                    </Link>
                    <Link href={route('marketplace.products.index')} className="transition-opacity hover:opacity-70">
                        Proizvodi
                    </Link>
                </nav>

                <div className="flex items-center gap-3">
                    {auth.user ? (
                        <>
                            <div className="hidden items-center gap-3 md:flex">
                                <MessagesLink className="text-foreground/80 hover:text-foreground" />
                                <Link
                                    href={route('favorites.index')}
                                    aria-label="Omiljeni"
                                    className="text-foreground/80 hover:text-foreground"
                                >
                                    <Heart className="size-5" />
                                </Link>
                            </div>

                            <CartLink className="text-foreground/80 hover:text-foreground" />

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="gap-1.5">
                                        <Menu className="size-4 md:hidden" />
                                        <span className="hidden md:inline">{auth.user.name.split(' ')[0]}</span>
                                        <ChevronDown className="hidden size-3.5 md:inline" />
                                        {unreadMessages > 0 && (
                                            <span className="bg-primary size-2 rounded-full md:hidden" aria-hidden />
                                        )}
                                        <span className="sr-only">Meni</span>
                                    </Button>
                                </DropdownMenuTrigger>

                                <DropdownMenuContent align="end" className="w-56">
                                    <DropdownMenuLabel className="md:hidden">{auth.user.name}</DropdownMenuLabel>

                                    <DropdownMenuItem asChild className="md:hidden">
                                        <Link href={route('marketplace.producers.index')}>Proizvođači</Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild className="md:hidden">
                                        <Link href={route('marketplace.products.index')}>Proizvodi</Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator className="md:hidden" />

                                    <DropdownMenuItem asChild>
                                        <Link href={route('messages.index')} className="justify-between">
                                            <span className="flex items-center gap-2">
                                                <MessageCircle className="size-4" />
                                                Poruke
                                            </span>
                                            {unreadMessages > 0 && (
                                                <span className="bg-primary text-primary-foreground rounded-full px-1.5 text-[0.65rem] font-semibold">
                                                    {unreadMessages > 99 ? '99+' : unreadMessages}
                                                </span>
                                            )}
                                        </Link>
                                    </DropdownMenuItem>

                                    {accountLinks.map((link) => (
                                        <DropdownMenuItem key={link.href} asChild>
                                            <Link href={link.href}>{link.label}</Link>
                                        </DropdownMenuItem>
                                    ))}

                                    {isAdmin && (
                                        <DropdownMenuItem asChild>
                                            <Link href={route('admin.dashboard')}>Admin panel</Link>
                                        </DropdownMenuItem>
                                    )}

                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild>
                                        <Link href={route('logout')} method="post" as="button" className="w-full">
                                            <LogOut className="size-4" />
                                            Odjava
                                        </Link>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </>
                    ) : (
                        <>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="icon" className="md:hidden" aria-label="Meni">
                                        <Menu className="size-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-52">
                                    <DropdownMenuItem asChild>
                                        <Link href={route('marketplace.producers.index')}>Proizvođači</Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <Link href={route('marketplace.products.index')}>Proizvodi</Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild>
                                        <Link href={route('register')}>Registracija</Link>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <Button asChild variant="outline" size="sm">
                                <Link href={route('login')}>Prijava</Link>
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}
