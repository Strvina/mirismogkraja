import Head from '@/components/head';
import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { t, tx } from '@/lib/i18n';
import { type BreadcrumbItem } from '@/types';
import { Link, useForm } from '@inertiajs/react';
import { ShieldCheck } from 'lucide-react';
import { type FormEventHandler } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: tx('Dvostruka potvrda'), href: '/settings/two-factor' }];

/** The codes to keep somewhere safe; shown once, right after they are made. */
function RecoveryCodes({ codes }: { codes: string[] }) {
    return (
        <div className="border-gold/50 bg-cream-deep rounded-lg border p-5">
            <p className="font-medium">{t('Sačuvajte rezervne kodove')}</p>
            <p className="text-muted-foreground mt-1 text-sm leading-6">
                {t(
                    'Ako izgubite ili zamenite telefon, prijavićete se jednim od ovih kodova. Svaki važi jednom. Prepišite ih ili odštampajte — više ih nećemo prikazati.',
                )}
            </p>
            <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1.5 font-mono text-sm">
                {codes.map((code) => (
                    <li key={code}>{code}</li>
                ))}
            </ul>
        </div>
    );
}

/** The password, asked again for every step that weakens or replaces the second one. */
function PasswordField({ id, value, error, onChange }: { id: string; value: string; error?: string; onChange: (value: string) => void }) {
    return (
        <div className="grid gap-2">
            <Label htmlFor={id}>{t('Trenutna lozinka')}</Label>
            <Input id={id} type="password" autoComplete="current-password" value={value} onChange={(e) => onChange(e.target.value)} required />
            <InputError message={error} />
        </div>
    );
}

/**
 * Two-step sign-in: off, being set up (a QR code waiting for its first
 * code), or on.
 */
export default function TwoFactor({
    enabled,
    hasPassword,
    setup,
    recoveryCodes,
    recoveryCodesLeft,
}: {
    enabled: boolean;
    hasPassword: boolean;
    /** While setting up: the secret, for typing in by hand. */
    setup: { secret: string } | null;
    /** Only right after they are made. */
    recoveryCodes: string[] | null;
    recoveryCodesLeft: number | null;
}) {
    const start = useForm({ current_password: '' });
    const confirm = useForm({ code: '' });
    const manage = useForm({ current_password: '' });

    const begin: FormEventHandler = (e) => {
        e.preventDefault();
        start.post(route('two-factor.store'), { preserveScroll: true, onSuccess: () => start.reset() });
    };

    const finish: FormEventHandler = (e) => {
        e.preventDefault();
        confirm.post(route('two-factor.confirm'), { preserveScroll: true, onSuccess: () => confirm.reset() });
    };

    const regenerate = () => manage.post(route('two-factor.recovery-codes'), { preserveScroll: true, onSuccess: () => manage.reset() });
    const disable = () => manage.delete(route('two-factor.destroy'), { preserveScroll: true, onSuccess: () => manage.reset() });

    return (
        <MarketplaceLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Dvostruka potvrda')} />

            <SettingsLayout>
                <div className="space-y-6">
                    <HeadingSmall
                        title={t('Dvostruka potvrda prijave')}
                        description={t(
                            'Pored lozinke, prijava traži i kod iz aplikacije na telefonu. Ko sazna vašu lozinku, bez telefona ne može u nalog.',
                        )}
                    />

                    {recoveryCodes && <RecoveryCodes codes={recoveryCodes} />}

                    {enabled && (
                        <>
                            <p className="border-olive/30 bg-olive-soft text-olive flex items-start gap-2 rounded-lg border p-4 text-sm">
                                <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
                                <span>
                                    {t('Dvostruka potvrda je uključena.')}{' '}
                                    {recoveryCodesLeft !== null && t('Preostalo rezervnih kodova: :count.', { count: recoveryCodesLeft })}
                                </span>
                            </p>

                            <div className="space-y-4">
                                <PasswordField
                                    id="manage-password"
                                    value={manage.data.current_password}
                                    error={manage.errors.current_password}
                                    onChange={(value) => manage.setData('current_password', value)}
                                />
                                <div className="flex flex-wrap gap-2">
                                    <Button type="button" variant="outline" disabled={manage.processing} onClick={regenerate}>
                                        {t('Novi rezervni kodovi')}
                                    </Button>
                                    <Button type="button" variant="destructive" disabled={manage.processing} onClick={disable}>
                                        {t('Isključi dvostruku potvrdu')}
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}

                    {!enabled && setup && (
                        <form onSubmit={finish} className="space-y-5">
                            <ol className="text-muted-foreground list-decimal space-y-2 pl-5 text-sm leading-6">
                                <li>{t('Na telefonu otvorite aplikaciju za potvrdu (Google Authenticator, Microsoft Authenticator, Aegis…).')}</li>
                                <li>{t('Skenirajte kod ispod ili ručno upišite ključ.')}</li>
                                <li>{t('Upišite šest cifara koje aplikacija prikaže.')}</li>
                            </ol>

                            <div className="flex flex-wrap items-center gap-5">
                                <img
                                    src={route('two-factor.qr')}
                                    alt={t('QR kod za aplikaciju za potvrdu')}
                                    width={220}
                                    height={220}
                                    className="rounded-md border bg-white p-2"
                                />
                                <div className="min-w-0 text-sm">
                                    <p className="text-muted-foreground">{t('Ključ za ručni unos')}</p>
                                    <p className="mt-1 font-mono break-all">{setup.secret}</p>
                                </div>
                            </div>

                            <div className="grid max-w-[14rem] gap-2">
                                <Label htmlFor="confirm-code">{t('Kod')}</Label>
                                <Input
                                    id="confirm-code"
                                    inputMode="numeric"
                                    autoComplete="one-time-code"
                                    maxLength={7}
                                    placeholder="000000"
                                    value={confirm.data.code}
                                    onChange={(e) => confirm.setData('code', e.target.value)}
                                    className="font-mono tracking-[0.3em]"
                                    required
                                />
                                <InputError message={confirm.errors.code} />
                            </div>

                            <Button type="submit" disabled={confirm.processing}>
                                {t('Potvrdi i uključi')}
                            </Button>
                        </form>
                    )}

                    {!enabled &&
                        !setup &&
                        (hasPassword ? (
                            <form onSubmit={begin} className="space-y-4">
                                <PasswordField
                                    id="start-password"
                                    value={start.data.current_password}
                                    error={start.errors.current_password}
                                    onChange={(value) => start.setData('current_password', value)}
                                />
                                <Button type="submit" disabled={start.processing}>
                                    {t('Uključi dvostruku potvrdu')}
                                </Button>
                            </form>
                        ) : (
                            <p className="text-muted-foreground text-sm leading-6">
                                {t('Nalog ste otvorili preko Google-a i još nema lozinku.')}{' '}
                                <Link href={route('password.edit')} className="text-foreground font-medium underline underline-offset-4">
                                    {t('Prvo postavite lozinku')}
                                </Link>
                                .
                            </p>
                        ))}
                </div>
            </SettingsLayout>
        </MarketplaceLayout>
    );
}
