/**
 * Hamburger that morphs into an X: the outer bars slide to the middle and
 * rotate into the cross while the middle bar fades out.
 */
export default function MenuIcon({ open }: { open: boolean }) {
    const bar = 'absolute left-0 h-[1.5px] w-full rounded-full bg-current transition-all duration-300 ease-out';

    return (
        <span aria-hidden className="relative block size-4">
            <span className={`${bar} ${open ? 'top-1/2 -translate-y-1/2 rotate-45' : 'top-[3px]'}`} />
            <span className={`${bar} top-1/2 -translate-y-1/2 ${open ? 'scale-x-0 opacity-0' : 'opacity-100'}`} />
            <span className={`${bar} ${open ? 'top-1/2 -translate-y-1/2 -rotate-45' : 'top-[11px]'}`} />
        </span>
    );
}
