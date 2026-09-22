import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { type SharedData, type User } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ChevronDown, Heart, LayoutDashboard, LogOut, MessageCircle, Package, Sprout, UserRound } from 'lucide-react';
import { useState } from 'react';
import MenuIcon from './menu-icon';

interface MenuLink {
    href: string;
    label: string;
    icon: typeof UserRound;
    badge?: number;
    mobileOnly?: boolean;
}

/**
 * The header's account menu. On phones it doubles as the site menu, since
 * the inline nav collapses into it - hence the browse links marked
 * mobileOnly.
 */
export default function AccountMenu({ user }: { user: User }) {
    const { unreadMessages } = usePage<SharedData>().props;
    const [open, setOpen] = useState(false);

    const isAdmin = user.roles?.some((role) => role.name === 'admin') ?? false;

    const browseLinks: MenuLink[] = [
        { href: route('marketplace.producers.index'), label: 'Proizvođači', icon: Sprout, mobileOnly: true },
        { href: route('marketplace.products.index'), label: 'Proizvodi', icon: Package, mobileOnly: true },
    ];

    const accountLinks: MenuLink[] = [
        { href: route('messages.index'), label: 'Poruke', icon: MessageCircle, badge: unreadMessages },
        { href: route('favorites.index'), label: 'Omiljeni', icon: Heart },
        { href: route('producers.index'), label: 'Moji proizvođači', icon: Sprout },
        { href: route('profile.edit'), label: 'Moj nalog', icon: UserRound },
    ];

    if (isAdmin) {
        accountLinks.push({ href: route('admin.dashboard'), label: 'Admin panel', icon: LayoutDashboard });
    }

    const renderLink = (link: MenuLink) => (
        <DropdownMenuItem key={link.href} asChild className={link.mobileOnly ? 'md:hidden' : undefined}>
            <Link href={link.href} className="cursor-pointer justify-between gap-3 py-2">
                <span className="flex items-center gap-2.5">
                    <link.icon className="text-muted-foreground size-4" />
                    {link.label}
                </span>
                {Boolean(link.badge) && (
                    <span className="bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 text-[0.65rem] font-semibold tabular-nums">
                        {link.badge! > 99 ? '99+' : link.badge}
                    </span>
                )}
            </Link>
        </DropdownMenuItem>
    );

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <span className="md:hidden">
                        <MenuIcon open={open} />
                    </span>
                    <span className="hidden max-w-24 truncate md:inline">{user.name.split(' ')[0]}</span>
                    <ChevronDown className={`hidden size-3.5 transition-transform duration-300 md:inline ${open ? 'rotate-180' : ''}`} />
                    {unreadMessages > 0 && <span className="bg-primary size-1.5 rounded-full md:hidden" aria-hidden />}
                    <span className="sr-only">Meni</span>
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" sideOffset={10} className="w-60 p-1.5">
                <div className="flex items-center gap-3 px-2 py-2.5">
                    {user.avatar_path ? (
                        <img src={`/storage/${user.avatar_path}`} alt="" className="size-9 shrink-0 rounded-full object-cover" />
                    ) : (
                        <span className="bg-olive-soft text-olive grid size-9 shrink-0 place-items-center rounded-full text-sm font-semibold">
                            {user.name.charAt(0).toUpperCase()}
                        </span>
                    )}
                    <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{user.name}</p>
                        <p className="text-muted-foreground truncate text-xs">{user.email}</p>
                    </div>
                </div>

                <DropdownMenuSeparator />

                <div className="md:hidden">
                    {browseLinks.map(renderLink)}
                    <DropdownMenuSeparator />
                </div>

                {accountLinks.map(renderLink)}

                <DropdownMenuSeparator />

                <DropdownMenuItem asChild>
                    <Link href={route('logout')} method="post" as="button" className="text-destructive w-full cursor-pointer gap-2.5 py-2">
                        <LogOut className="size-4" />
                        Odjava
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
