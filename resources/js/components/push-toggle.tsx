import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';
import { disablePush, enablePush, isIosOutsideHomeScreen, pushState, type PushState } from '@/lib/push';
import { BellRing } from 'lucide-react';
import { useEffect, useState } from 'react';

/**
 * Settings: notifications on this device for new messages. Per device,
 * because that is how browsers grant it - a phone and a laptop each say yes
 * on their own.
 */
export default function PushToggle({ publicKey }: { publicKey: string | null }) {
    const [state, setState] = useState<PushState | null>(null);
    const [busy, setBusy] = useState(false);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        pushState().then(setState);
    }, []);

    if (!publicKey || state === null) {
        return null;
    }

    const run = async (action: () => Promise<PushState>) => {
        setBusy(true);
        setFailed(false);

        try {
            setState(await action());
        } catch {
            setFailed(true);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="space-y-4">
            <HeadingSmall
                title={t('Obaveštenja na ovom uređaju')}
                description={t('Nova poruka stiže na telefon ili računar odmah, i kada sajt nije otvoren.')}
            />

            {state === 'unsupported' ? (
                <p className="text-muted-foreground text-sm">
                    {isIosOutsideHomeScreen()
                        ? t('Na iPhone-u: otvorite sajt u Safariju, „Podeli” → „Dodaj na početni ekran”, pa uključite obaveštenja iz te ikonice.')
                        : t('Ovaj pregledač ne podržava obaveštenja.')}
                </p>
            ) : state === 'denied' ? (
                <p className="text-muted-foreground text-sm">
                    {t('Obaveštenja su blokirana u pregledaču. Dozvolite ih u podešavanjima sajta, pa se vratite ovde.')}
                </p>
            ) : (
                <div className="flex flex-wrap items-center gap-3">
                    <Button
                        variant={state === 'on' ? 'outline' : 'default'}
                        disabled={busy}
                        onClick={() => run(state === 'on' ? disablePush : () => enablePush(publicKey))}
                    >
                        <BellRing className="size-4" />
                        {state === 'on' ? t('Isključi obaveštenja') : t('Uključi obaveštenja')}
                    </Button>
                    {state === 'on' && <span className="text-muted-foreground text-sm">{t('Uključeno na ovom uređaju.')}</span>}
                </div>
            )}

            {failed && <p className="text-destructive text-sm">{t('Nije uspelo. Pokušajte ponovo.')}</p>}
        </div>
    );
}
