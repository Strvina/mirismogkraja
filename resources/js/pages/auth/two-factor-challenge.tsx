import Head from '@/components/head';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/layouts/auth-layout';
import { t } from '@/lib/i18n';
import { useForm } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { type FormEventHandler, useState } from 'react';

/**
 * The second step of signing in: the six digits from the authenticator app,
 * or - for a lost phone - one of the recovery codes.
 */
export default function TwoFactorChallenge() {
    const [recovery, setRecovery] = useState(false);
    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({ code: '', recovery_code: '' });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('two-factor.challenge'), { onError: () => reset() });
    };

    const toggle = () => {
        clearErrors();
        reset();
        setRecovery((value) => !value);
    };

    return (
        <AuthLayout
            title={t('Potvrdite prijavu')}
            description={
                recovery
                    ? t('Unesite jedan od rezervnih kodova koje ste sačuvali kada ste uključili dvostruku potvrdu.')
                    : t('Unesite šestocifreni kod iz aplikacije za potvrdu na telefonu.')
            }
        >
            <Head title={t('Potvrda prijave')} />

            <form onSubmit={submit} className="space-y-6">
                {recovery ? (
                    <div className="grid gap-2">
                        <Label htmlFor="recovery_code">{t('Rezervni kod')}</Label>
                        <Input
                            id="recovery_code"
                            name="recovery_code"
                            autoComplete="off"
                            autoCapitalize="none"
                            spellCheck={false}
                            value={data.recovery_code}
                            autoFocus
                            onChange={(e) => setData('recovery_code', e.target.value)}
                        />
                        <InputError message={errors.recovery_code} />
                    </div>
                ) : (
                    <div className="grid gap-2">
                        <Label htmlFor="code">{t('Kod')}</Label>
                        <Input
                            id="code"
                            name="code"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            maxLength={7}
                            placeholder="000000"
                            value={data.code}
                            autoFocus
                            onChange={(e) => setData('code', e.target.value)}
                            className="text-center font-mono text-lg tracking-[0.3em]"
                        />
                        <InputError message={errors.code} />
                    </div>
                )}

                <Button className="w-full" disabled={processing}>
                    {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                    {t('Prijavi se')}
                </Button>

                <p className="text-center text-sm">
                    <button type="button" onClick={toggle} className="text-muted-foreground hover:text-foreground underline underline-offset-4">
                        {recovery ? t('Imam kod iz aplikacije') : t('Nemam telefon pri ruci — imam rezervni kod')}
                    </button>
                </p>
            </form>
        </AuthLayout>
    );
}
