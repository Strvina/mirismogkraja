// Components
import Head from '@/components/head';
import { type SharedData } from '@/types';
import { useForm, usePage } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { FormEventHandler } from 'react';

import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import AuthLayout from '@/layouts/auth-layout';
import { t } from '@/lib/i18n';

export default function VerifyEmail({ status }: { status?: string }) {
    const { auth } = usePage<SharedData>().props;
    const { post, processing } = useForm({});

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('verification.send'));
    };

    return (
        <AuthLayout title={t('Potvrdite email')} description={t('Potvrdite email adresu klikom na link koji smo vam upravo poslali.')}>
            <Head title={t('Potvrda email adrese')} />

            {status === 'verification-link-sent' && (
                <div className="mb-4 text-center text-sm font-medium text-green-600">
                    {t('Novi link za potvrdu je poslat na email adresu koju ste uneli pri registraciji.')}
                </div>
            )}

            <p className="text-muted-foreground mb-6 text-center text-sm">
                {t('Link smo poslali na :email. Ako ga ne vidite, proverite i spam folder.', { email: auth.user?.email ?? '' })}
            </p>

            <form onSubmit={submit} className="space-y-6 text-center">
                <Button disabled={processing} variant="secondary">
                    {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                    {t('Pošalji link ponovo')}
                </Button>

                <div className="flex items-center justify-center gap-4 text-sm">
                    <TextLink href={route('home')}>{t('Nazad na sajt')}</TextLink>
                    <TextLink href={route('logout')} method="post">
                        {t('Odjavi se')}
                    </TextLink>
                </div>
            </form>
        </AuthLayout>
    );
}
