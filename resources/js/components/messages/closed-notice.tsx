import { t } from '@/lib/i18n';
import { Ban } from 'lucide-react';
import { type ThreadSide } from './types';

/**
 * In place of the message box, why there is none: the other side left the
 * site, or one side closed the conversation. The history stays readable.
 */
export default function ClosedNotice({
    closed,
    blockedBy,
    blockedByMe,
    isOwner,
    otherName,
}: {
    closed: ThreadSide | null;
    blockedBy: ThreadSide | null;
    blockedByMe: boolean;
    isOwner: boolean;
    otherName: string;
}) {
    const text = closed
        ? closed === 'producer'
            ? t('Ovaj proizvođač više nije na sajtu. Prepiska ostaje ovde, ali poruke se više ne mogu slati.')
            : t('Ovaj korisnik je obrisao nalog. Prepiska ostaje ovde, ali poruke se više ne mogu slati.')
        : blockedBy === null
          ? null
          : blockedByMe
            ? t('Blokirali ste ovaj razgovor — ni vi ni :name ne možete da šaljete poruke. Odblokirajte ga da biste nastavili.', { name: otherName })
            : isOwner
              ? t('Kupac je zatvorio ovaj razgovor. Poruke se više ne mogu slati, ali prepiska ostaje ovde.')
              : t('Proizvođač je zatvorio ovaj razgovor. Poruke se više ne mogu slati, ali prepiska ostaje ovde.');

    if (!text) {
        return null;
    }

    return (
        <p className="border-border/70 bg-muted/50 text-muted-foreground flex items-center gap-2 border-t px-4 py-3 text-sm">
            <Ban className="size-4 shrink-0" aria-hidden />
            {text}
        </p>
    );
}
