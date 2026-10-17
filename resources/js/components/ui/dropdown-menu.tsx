'use client';

import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { Check, ChevronRight, Circle } from 'lucide-react';
import * as React from 'react';
import { createPortal } from 'react-dom';

import { TOUCH_SCREEN, useMediaQuery } from '@/hooks/use-media-query';
import { holdTouchUntilItEnds, useScrollLock } from '@/hooks/use-scroll-lock';
import { cn } from '@/lib/utils';

/** The menu's own open state, for its parts: a tap opens it, a scroll of the page closes it. */
const MenuState = React.createContext<{ open: boolean; setOpen: (open: boolean) => void } | null>(null);

/**
 * Never Radix's modal mode. Its lock sets `overflow: hidden` on the body,
 * and with the overflow of html and body clipped (app.css) that makes the
 * body a scroll container of its own: the sticky header - and the menu's
 * button in it - jumps back to the top of the page, the menu with it, and
 * with a mouse the scrollbar goes and the page shifts sideways.
 *
 * Open or closed is kept here, whether or not the caller controls it, so
 * the trigger and the content can open and close it themselves.
 */
function DropdownMenu({ modal = false, open: controlled, defaultOpen = false, onOpenChange, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
    const [own, setOwn] = React.useState(defaultOpen);
    const open = controlled ?? own;

    const setOpen = React.useCallback(
        (next: boolean) => {
            if (controlled === undefined) {
                setOwn(next);
            }

            onOpenChange?.(next);
        },
        [controlled, onOpenChange],
    );

    const state = React.useMemo(() => ({ open, setOpen }), [open, setOpen]);

    return (
        <MenuState.Provider value={state}>
            <DropdownMenuPrimitive.Root modal={modal} open={open} onOpenChange={setOpen} {...props} />
        </MenuState.Provider>
    );
}

/**
 * Opens on a tap with a finger, not at the touch.
 *
 * Radix opens a menu the moment a pointer goes down on its button, which
 * for a mouse is a click. For a finger it is the start of whatever comes
 * next - and a scroll of the page that happened to start on a "Kategorija"
 * or "Sortiraj" button opened that menu and scrolled the page under it. A
 * tap is a click; a scroll never is. With a mouse, nothing changes.
 */
const DropdownMenuTrigger = React.forwardRef<
    React.ElementRef<typeof DropdownMenuPrimitive.Trigger>,
    React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Trigger>
>(({ onPointerDown, onClick, ...props }, ref) => {
    const menu = React.useContext(MenuState);
    // Read at the press: by the click, a touch outside the open menu may
    // already have closed it, and the tap would open it again.
    const press = React.useRef<{ finger: boolean; wasOpen: boolean }>({ finger: false, wasOpen: false });

    return (
        <DropdownMenuPrimitive.Trigger
            ref={ref}
            onPointerDown={(event) => {
                onPointerDown?.(event);
                press.current = { finger: event.pointerType === 'touch', wasOpen: menu?.open ?? false };

                // Radix steps aside for a prevented event; the click below decides instead.
                if (press.current.finger) {
                    event.preventDefault();
                }
            }}
            onClick={(event) => {
                onClick?.(event);

                if (press.current.finger && menu && !event.defaultPrevented) {
                    press.current.finger = false;
                    menu.setOpen(!press.current.wasOpen);
                }
            }}
            {...props}
        />
    );
});
DropdownMenuTrigger.displayName = DropdownMenuPrimitive.Trigger.displayName;

const DropdownMenuGroup = DropdownMenuPrimitive.Group;

const DropdownMenuPortal = DropdownMenuPrimitive.Portal;

const DropdownMenuSub = DropdownMenuPrimitive.Sub;

const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

const DropdownMenuSubTrigger = React.forwardRef<
    React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
    React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & {
        inset?: boolean;
    }
>(({ className, inset, children, ...props }, ref) => (
    <DropdownMenuPrimitive.SubTrigger
        ref={ref}
        className={cn(
            'flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden focus:bg-accent data-[state=open]:bg-accent [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
            inset && 'pl-8',
            className,
        )}
        {...props}
    >
        {children}
        <ChevronRight className="ml-auto" />
    </DropdownMenuPrimitive.SubTrigger>
));
DropdownMenuSubTrigger.displayName = DropdownMenuPrimitive.SubTrigger.displayName;

const DropdownMenuSubContent = React.forwardRef<
    React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
    React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
    <DropdownMenuPrimitive.SubContent
        ref={ref}
        className={cn(
            'z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
            className,
        )}
        {...props}
    />
));
DropdownMenuSubContent.displayName = DropdownMenuPrimitive.SubContent.displayName;

/**
 * Beside its button with a mouse; on a touch screen, a sheet from the foot
 * of the screen over a dimmed page, as a phone's own menus are.
 *
 * A menu floating by its button has to be placed again as the page moves,
 * and on the iPhone, where the address bar grows and shrinks with every
 * scroll, it landed in the wrong place or followed the page about. A sheet
 * at the foot of the screen has nothing to follow, is in reach of a thumb,
 * and its items are big enough for a finger.
 *
 * With a mouse it closes as soon as the page scrolls or the window changes
 * size, instead of trailing after its button.
 */
const DropdownMenuContent = React.forwardRef<
    React.ElementRef<typeof DropdownMenuPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, collisionPadding = 8, onPointerDownOutside, children, ...props }, ref) => {
    const touch = useMediaQuery(TOUCH_SCREEN);
    const menu = React.useContext(MenuState);
    const own = React.useRef<HTMLDivElement>(null);

    return (
        <>
            {/* The dimmed page behind a sheet: a touch on it closes the menu. */}
            {touch && menu?.open && createPortal(<SheetBackdrop />, document.body)}
            <DropdownMenuPrimitive.Portal>
                <DropdownMenuPrimitive.Content
                    ref={(node) => {
                        own.current = node;

                        if (typeof ref === 'function') {
                            ref(node);
                        } else if (ref) {
                            ref.current = node;
                        }
                    }}
                    data-sheet={touch ? '' : undefined}
                    sideOffset={sideOffset}
                    collisionPadding={collisionPadding}
                    onPointerDownOutside={(event) => {
                        onPointerDownOutside?.(event);

                        // A touch beside the menu closes it, and the rest of that touch is not a scroll.
                        if (event.detail.originalEvent.pointerType === 'touch') {
                            holdTouchUntilItEnds();
                        }
                    }}
                    // Never taller than the room left on screen, and scrolling inside
                    // itself when its items need more: on a phone, a long menu (an
                    // admin's) used to run off the bottom with its last items out of
                    // reach, and a drag over it pulled at the page behind instead.
                    className={cn(
                        'z-50 max-h-(--radix-dropdown-menu-content-available-height) min-w-[8rem] overflow-y-auto overscroll-contain rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
                        className,
                        // After the caller's classes, and over them: a sheet is the
                        // width of the screen whatever width the menu asked for.
                        touch &&
                            'z-[61]! w-full! max-w-none! min-w-0! max-h-[min(75dvh,36rem)]! rounded-t-2xl! rounded-b-none! border-x-0! border-b-0! p-2! pb-[calc(0.75rem+env(safe-area-inset-bottom))]! shadow-2xl! data-[state=open]:zoom-in-100! data-[state=closed]:zoom-out-100! data-[state=open]:slide-in-from-bottom-10 [&_[role^=menuitem]]:min-h-12 [&_[role^=menuitem]]:text-base',
                    )}
                    {...props}
                >
                    {/* Inside the content, so they are there exactly while the menu is open. */}
                    {touch ? <HoldPageStill panel={own} /> : <CloseWithThePage panel={own} />}
                    {children}
                </DropdownMenuPrimitive.Content>
            </DropdownMenuPrimitive.Portal>
        </>
    );
});
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;

/**
 * On a phone a drag on an open menu has to move the menu and nothing else.
 * Without a lock, whether it did was left to `overscroll-behavior`, which
 * Safari on the iPhone ignores for a menu that fits on the screen or is at
 * its end: at the top of a page that had just loaded there was nowhere for
 * the page to go, so the menu seemed fine; once the page had been scrolled,
 * the page moved instead. A drag beside the menu moved it too.
 */
function HoldPageStill({ panel }: { panel: React.RefObject<HTMLElement | null> }) {
    useScrollLock(true, panel);

    return null;
}

/**
 * The dimmed page behind a sheet. A touch on it closes the menu - and the
 * backdrop goes with it, mid-touch, so the rest of that touch is sent to an
 * element no longer in the page and never reaches a listener on the
 * document. Its own listener still hears it: the drag is refused here.
 */
function SheetBackdrop() {
    const backdrop = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const element = backdrop.current;
        const refuse = (event: TouchEvent) => event.cancelable && event.preventDefault();

        element?.addEventListener('touchmove', refuse, { passive: false });

        // Not taken off when it leaves the page: the touch that removed it is still going.
    }, []);

    return <div ref={backdrop} aria-hidden className="animate-in fade-in-0 fixed inset-0 z-[60] bg-black/40" />;
}

/** With a mouse: the page scrolled (not the menu itself) or the window changed - the menu goes. */
function CloseWithThePage({ panel }: { panel: React.RefObject<HTMLElement | null> }) {
    const menu = React.useContext(MenuState);

    React.useEffect(() => {
        if (!menu) {
            return;
        }

        const close = (event: Event) => {
            if (!(event.target instanceof Node && panel.current?.contains(event.target))) {
                menu.setOpen(false);
            }
        };

        window.addEventListener('scroll', close, { capture: true, passive: true });
        window.addEventListener('resize', close);

        return () => {
            window.removeEventListener('scroll', close, { capture: true });
            window.removeEventListener('resize', close);
        };
    }, [menu, panel]);

    return null;
}

const DropdownMenuItem = React.forwardRef<
    React.ElementRef<typeof DropdownMenuPrimitive.Item>,
    React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
        inset?: boolean;
    }
>(({ className, inset, ...props }, ref) => (
    <DropdownMenuPrimitive.Item
        ref={ref}
        className={cn(
            'relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden transition-colors focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
            inset && 'pl-8',
            className,
        )}
        {...props}
    />
));
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;

const DropdownMenuCheckboxItem = React.forwardRef<
    React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
    React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
    <DropdownMenuPrimitive.CheckboxItem
        ref={ref}
        className={cn(
            'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-hidden transition-colors focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50',
            className,
        )}
        checked={checked}
        {...props}
    >
        <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
            <DropdownMenuPrimitive.ItemIndicator>
                <Check className="h-4 w-4" />
            </DropdownMenuPrimitive.ItemIndicator>
        </span>
        {children}
    </DropdownMenuPrimitive.CheckboxItem>
));
DropdownMenuCheckboxItem.displayName = DropdownMenuPrimitive.CheckboxItem.displayName;

const DropdownMenuRadioItem = React.forwardRef<
    React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
    React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
    <DropdownMenuPrimitive.RadioItem
        ref={ref}
        className={cn(
            'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-hidden transition-colors focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50',
            className,
        )}
        {...props}
    >
        <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
            <DropdownMenuPrimitive.ItemIndicator>
                <Circle className="h-2 w-2 fill-current" />
            </DropdownMenuPrimitive.ItemIndicator>
        </span>
        {children}
    </DropdownMenuPrimitive.RadioItem>
));
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName;

const DropdownMenuLabel = React.forwardRef<
    React.ElementRef<typeof DropdownMenuPrimitive.Label>,
    React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & {
        inset?: boolean;
    }
>(({ className, inset, ...props }, ref) => (
    <DropdownMenuPrimitive.Label ref={ref} className={cn('px-2 py-1.5 text-sm font-semibold', inset && 'pl-8', className)} {...props} />
));
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName;

const DropdownMenuSeparator = React.forwardRef<
    React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
    React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => <DropdownMenuPrimitive.Separator ref={ref} className={cn('-mx-1 my-1 h-px bg-muted', className)} {...props} />);
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;

const DropdownMenuShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => {
    return <span className={cn('ml-auto text-xs tracking-widest opacity-60', className)} {...props} />;
};
DropdownMenuShortcut.displayName = 'DropdownMenuShortcut';

export {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuPortal,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
};
