import { Button } from '@/components/ui/button';
import AuthLayout from '@/layouts/auth-layout';
import { t } from '@/lib/i18n';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';

/** Reached from the link at the bottom of a "new message" e-mail. */
export default function Unsubscribe({ action, done }: { action: string; done: boolean }) {
    const [processing, setProcessing] = useState(false);

    const confirm = () => router.post(action, {}, { onStart: () => setProcessing(true), onFinish: () => setProcessing(false) });

    return (
        <AuthLayout
            title={done ? t('Mejlovi o porukama su isključeni') : t('Isključiti mejlove o novim porukama?')}
            description={
                done
                    ? t('Nove poruke ćete i dalje videti na sajtu. Mejlove možete ponovo da uključite u podešavanjima profila.')
                    : t('Više vam nećemo slati mejl kad dobijete poruku. Poruke ćete i dalje videti na sajtu.')
            }
        >
            <Head title={t('Mejlovi o porukama')} />

            <div className="flex flex-col items-center gap-4">
                {!done && (
                    <Button onClick={confirm} disabled={processing} className="w-full">
                        {t('Isključi mejlove')}
                    </Button>
                )}
                <Link href={route('home')} className="text-muted-foreground hover:text-foreground text-sm underline underline-offset-4">
                    {t('Nazad na sajt')}
                </Link>
            </div>
        </AuthLayout>
    );
}
