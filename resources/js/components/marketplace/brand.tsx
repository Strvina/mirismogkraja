import { Link } from '@inertiajs/react';
import { Sprout } from 'lucide-react';

/**
 * The "Vrelina juga" wordmark, in the header and footer of every page.
 */
export default function Brand({ href = '/' }: { href?: string }) {
    return (
        <Link href={href} className="group inline-flex items-center gap-3" aria-label="Vrelina juga — početna">
            <span className="border-primary/30 bg-primary text-primary-foreground grid size-9 place-items-center rounded-full border">
                <Sprout className="size-4" />
            </span>
            <span className="text-foreground font-serif text-[1.08rem] leading-[1.05] font-semibold">
                Vrelina
                <br />
                <span className="text-primary">juga</span>
            </span>
        </Link>
    );
}
