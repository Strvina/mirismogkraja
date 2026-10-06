import Head from '@/components/head';
import InputError from '@/components/input-error';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { useForm } from '@inertiajs/react';
import { FormEventHandler, useRef } from 'react';

import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { t, tx } from '@/lib/i18n';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: tx('Lozinka'),
        href: '/settings/password',
    },
];

export default function Password({ hasPassword = true }: { hasPassword?: boolean }) {
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);

    const { data, setData, errors, put, reset, processing, recentlySuccessful } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const updatePassword: FormEventHandler = (e) => {
        e.preventDefault();

        put(route('password.update'), {
            preserveScroll: true,
            onSuccess: () => reset(),
            onError: (errors) => {
                if (errors.password) {
                    reset('password', 'password_confirmation');
                    passwordInput.current?.focus();
                }

                if (errors.current_password) {
                    reset('current_password');
                    currentPasswordInput.current?.focus();
                }
            },
        });
    };

    return (
        <MarketplaceLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Lozinka')} />

            <SettingsLayout>
                <div className="space-y-6">
                    <HeadingSmall title={t('Izmena lozinke')} description={t('Koristite dugu, nasumičnu lozinku da bi nalog ostao bezbedan')} />

                    {!hasPassword && (
                        <p className="bg-muted/50 rounded-lg px-4 py-3 text-sm leading-6">
                            {t(
                                'Prijavljujete se preko Google naloga, pa lozinku još nemate. Ako je postavite, moći ćete da se prijavite i e-mailom i lozinkom.',
                            )}
                        </p>
                    )}

                    <form onSubmit={updatePassword} className="space-y-6">
                        <div className={cn('grid gap-2', !hasPassword && 'hidden')}>
                            <Label htmlFor="current_password">{t('Trenutna lozinka')}</Label>

                            <Input
                                id="current_password"
                                ref={currentPasswordInput}
                                value={data.current_password}
                                onChange={(e) => setData('current_password', e.target.value)}
                                type="password"
                                className="mt-1 block w-full"
                                autoComplete="current-password"
                                placeholder={t('Trenutna lozinka')}
                            />

                            <InputError message={errors.current_password} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="password">{t('Nova lozinka')}</Label>

                            <Input
                                id="password"
                                ref={passwordInput}
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                type="password"
                                className="mt-1 block w-full"
                                autoComplete="new-password"
                                placeholder={t('Nova lozinka')}
                            />

                            <InputError message={errors.password} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="password_confirmation">{t('Potvrda nove lozinke')}</Label>

                            <Input
                                id="password_confirmation"
                                value={data.password_confirmation}
                                onChange={(e) => setData('password_confirmation', e.target.value)}
                                type="password"
                                className="mt-1 block w-full"
                                autoComplete="new-password"
                                placeholder={t('Potvrda nove lozinke')}
                            />

                            <InputError message={errors.password_confirmation} />
                        </div>

                        <div className="flex items-center gap-4">
                            <Button disabled={processing}>{t('Sačuvaj lozinku')}</Button>

                            <p
                                aria-live="polite"
                                className={cn('text-sm text-neutral-600 transition-opacity', recentlySuccessful ? 'opacity-100' : 'opacity-0')}
                            >
                                {t('Sačuvano')}
                            </p>
                        </div>
                    </form>
                </div>
            </SettingsLayout>
        </MarketplaceLayout>
    );
}
