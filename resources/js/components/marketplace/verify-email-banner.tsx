import { t } from '@/lib/i18n';
import { type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { MailWarning } from 'lucide-react';

/**
 * Reminds a signed-in visitor who hasn't confirmed their e-mail yet why
 * messages, reviews and their own producer page stay closed to them.
 */
export default function VerifyEmailBanner() {
    const { auth } = usePage<SharedData>().props;

    if (!auth.user || auth.user.email_verified_at) {
        return null;
    }

    return (
        <div className="border-b border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-900/30 dark:text-amber-100">
            <div className="mx-auto flex max-w-[1380px] flex-wrap items-center justify-center gap-x-3 gap-y-1 px-5 py-2 text-center text-sm sm:px-8 lg:px-12">
                <MailWarning className="size-4 shrink-0" />
                <span>
                    {t(
                        'Potvrdite email adresu :email preko linka koji smo vam poslali. Do tada ne možete da šaljete poruke, ocenjujete ni otvorite profil proizvođača.',
                        {
                            email: auth.user.email,
                        },
                    )}
                </span>
                <Link href={route('verification.notice')} className="font-medium underline underline-offset-4">
                    {t('Niste dobili mejl?')}
                </Link>
            </div>
        </div>
    );
}
