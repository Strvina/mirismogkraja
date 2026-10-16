import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { FlaskConical } from 'lucide-react';

/**
 * On every page of a demo: that it is one, that the data is made up and
 * comes back after a restart, and where to sign in to see the other sides.
 */
export default function DemoBanner({ className }: { className?: string }) {
    const { demo, auth } = usePage<SharedData>().props;

    if (!demo) {
        return null;
    }

    return (
        <div className={cn('bg-charcoal text-white', className)}>
            <div className="max-w-page mx-auto flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-5 py-2 text-center text-sm sm:px-8 lg:px-12">
                <FlaskConical className="size-4 shrink-0" aria-hidden />
                <span>
                    {t(
                        'Ovo je demo sajta: proizvođači, proizvodi i poruke su izmišljeni, a sve se vraća na početno stanje posle ponovnog pokretanja.',
                    )}
                </span>
                {!auth.user && (
                    <Link href={route('login')} className="font-medium underline underline-offset-4">
                        {t('Prijavite se demo nalogom')}
                    </Link>
                )}
            </div>
        </div>
    );
}
