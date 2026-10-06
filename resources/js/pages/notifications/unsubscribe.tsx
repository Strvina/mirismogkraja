import { Button } from '@/components/ui/button';
import AuthLayout from '@/layouts/auth-layout';
import { t, tx } from '@/lib/i18n';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';

/** What the page says, per kind of mail it turns off. */
const TEXTS = {
    messages: {
        head: tx('Mejlovi o porukama'),
        ask: tx('Isključiti mejlove o novim porukama?'),
        askDetail: tx('Više vam nećemo slati mejl kad dobijete poruku. Poruke ćete i dalje videti na sajtu.'),
        done: tx('Mejlovi o porukama su isključeni'),
        doneDetail: tx('Nove poruke ćete i dalje videti na sajtu. Mejlove možete ponovo da uključite u podešavanjima profila.'),
    },
    digest: {
        head: tx('Nedeljni pregled'),
        ask: tx('Isključiti nedeljni pregled?'),
        askDetail: tx('Više vam nećemo slati nedeljni mejl o novostima kod proizvođača koje pratite. Obaveštenja na sajtu ostaju.'),
        done: tx('Nedeljni pregled je isključen'),
        doneDetail: tx('Novosti ćete i dalje videti u obaveštenjima na sajtu. Pregled možete ponovo da uključite u podešavanjima profila.'),
    },
} as const;

/** Reached from the link at the bottom of an e-mail the site sends on its own. */
export default function Unsubscribe({ kind = 'messages', action, done }: { kind?: keyof typeof TEXTS; action: string; done: boolean }) {
    const [processing, setProcessing] = useState(false);
    const texts = TEXTS[kind];

    const confirm = () => router.post(action, {}, { onStart: () => setProcessing(true), onFinish: () => setProcessing(false) });

    return (
        <AuthLayout title={t(done ? texts.done : texts.ask)} description={t(done ? texts.doneDetail : texts.askDetail)}>
            <Head title={t(texts.head)} />

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
