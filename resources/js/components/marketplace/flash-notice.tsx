import { t } from '@/lib/i18n';
import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { CircleCheck, X } from 'lucide-react';
import { useState } from 'react';

/**
 * What just happened, after a click that sent something: "the ad is
 * published", "pay the slip and we will activate it". Without it the page
 * simply reloads and the visitor is left to guess whether it worked.
 *
 * The server puts the sentence in the session for one request (`notice`);
 * it is gone on the next page, or when closed here.
 */
export default function FlashNotice() {
    const { notice } = usePage<SharedData>().props;
    const [closed, setClosed] = useState<string | null>(null);

    if (!notice || closed === notice) {
        return null;
    }

    return (
        <div role="status" className="bg-olive-soft text-olive border-olive/20 border-b">
            <div className="mx-auto flex max-w-[1380px] items-center gap-3 px-5 py-2.5 text-sm sm:px-8 lg:px-12">
                <CircleCheck className="size-4 shrink-0" aria-hidden />
                <span className="flex-1">{notice}</span>
                <button type="button" onClick={() => setClosed(notice)} aria-label={t('Zatvori')} className="hover:opacity-70">
                    <X className="size-4" />
                </button>
            </div>
        </div>
    );
}
