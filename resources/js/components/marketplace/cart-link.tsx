import { type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ShoppingCart } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

/**
 * Cart icon with a live item count (task 9). The badge gives a short pop
 * whenever the count grows, so adding something from a product page reads as
 * "it landed in the cart" without a disruptive animation.
 */
export default function CartLink({ className = '' }: { className?: string }) {
    const { cartCount } = usePage<SharedData>().props;
    const previousCount = useRef(cartCount);
    const [justAdded, setJustAdded] = useState(false);

    useEffect(() => {
        const grew = cartCount > previousCount.current;
        previousCount.current = cartCount;

        if (!grew) {
            return;
        }

        setJustAdded(true);
        const timer = setTimeout(() => setJustAdded(false), 600);

        return () => clearTimeout(timer);
    }, [cartCount]);

    return (
        <Link
            href={route('cart.index')}
            aria-label={cartCount > 0 ? `Korpa (${cartCount})` : 'Korpa'}
            className={`relative transition-opacity hover:opacity-70 ${className}`}
        >
            <ShoppingCart className="size-5" />

            {cartCount > 0 && (
                <span
                    aria-hidden
                    className={`bg-primary text-primary-foreground absolute -top-1.5 -right-2 grid min-w-4.5 place-items-center rounded-full px-1 text-[0.6rem] font-semibold tabular-nums transition-transform duration-300 ${
                        justAdded ? 'scale-125' : 'scale-100'
                    }`}
                >
                    {cartCount > 99 ? '99+' : cartCount}
                </span>
            )}
        </Link>
    );
}
