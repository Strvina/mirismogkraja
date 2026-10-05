import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

import DeleteUser from '@/components/delete-user';
import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { t, tx } from '@/lib/i18n';
import { thumbUrl } from '@/lib/media';
import { shrinkImage } from '@/lib/shrink-image';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: tx('Moj nalog'),
        href: '/settings/profile',
    },
];

export default function Profile({
    mustVerifyEmail,
    status,
    hasPassword,
}: {
    mustVerifyEmail: boolean;
    status?: string;
    /** False for an account opened with Google that has not set a password. */
    hasPassword: boolean;
}) {
    const { auth } = usePage<SharedData>().props;
    const [avatarPreview, setAvatarPreview] = useState<string | null>(auth.user.avatar_path ? thumbUrl(auth.user.avatar_path) : null);

    const [avatarProcessing, setAvatarProcessing] = useState(false);
    const [avatarError, setAvatarError] = useState<string | null>(null);

    const { data, setData, patch, errors, processing, recentlySuccessful } = useForm<{
        name: string;
        email: string;
        phone: string;
        address: string;
        city: string;
        notify_messages_by_email: boolean;
        notify_weekly_digest: boolean;
    }>({
        name: auth.user.name,
        email: auth.user.email,
        phone: auth.user.phone ?? '',
        address: auth.user.address ?? '',
        city: auth.user.city ?? '',
        notify_messages_by_email: auth.user.notify_messages_by_email,
        notify_weekly_digest: auth.user.notify_weekly_digest,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        patch(route('profile.update'));
    };

    const onAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const picked = e.target.files?.[0] ?? null;

        if (!picked) {
            return;
        }

        setAvatarPreview(URL.createObjectURL(picked));
        setAvatarError(null);
        setAvatarProcessing(true);

        const file = await shrinkImage(picked);

        // Pass the file directly instead of staging it in useForm's state -
        // that state update is async, so posting right after setData() in
        // the same handler would submit the previous (empty) value.
        router.post(
            route('profile.avatar.update'),
            { avatar: file },
            {
                forceFormData: true,
                preserveScroll: true,
                onError: (errors) => setAvatarError(errors.avatar ?? null),
                onFinish: () => setAvatarProcessing(false),
            },
        );
    };

    return (
        <MarketplaceLayout breadcrumbs={breadcrumbs}>
            <Head title={t('Moj nalog')} />

            <SettingsLayout>
                <div className="space-y-6">
                    <HeadingSmall title={t('Lični podaci')} description={t('Izmenite svoje ime, email i kontakt podatke')} />

                    <div className="grid gap-2">
                        <Label htmlFor="avatar">{t('Profilna slika')}</Label>

                        <div className="flex items-center gap-4">
                            {avatarPreview && (
                                <img src={avatarPreview} alt={t('Pregled profilne slike')} className="size-16 rounded-full object-cover" />
                            )}
                            <Input
                                id="avatar"
                                type="file"
                                accept="image/*"
                                className="w-full max-w-xs"
                                disabled={avatarProcessing}
                                onChange={onAvatarChange}
                            />
                        </div>

                        <InputError className="mt-2" message={avatarError ?? undefined} />
                    </div>

                    <form onSubmit={submit} className="space-y-6">
                        <div className="grid gap-2">
                            <Label htmlFor="name">{t('Ime i prezime')}</Label>

                            <Input
                                id="name"
                                className="mt-1 block w-full"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                required
                                autoComplete="name"
                                placeholder={t('Ime i prezime')}
                            />

                            <InputError className="mt-2" message={errors.name} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="email">{t('Email adresa')}</Label>

                            <Input
                                id="email"
                                type="email"
                                className="mt-1 block w-full"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                required
                                autoComplete="username"
                                placeholder={t('Email adresa')}
                            />

                            <InputError className="mt-2" message={errors.email} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="phone">{t('Telefon')}</Label>

                            <Input
                                id="phone"
                                className="mt-1 block w-full"
                                value={data.phone}
                                onChange={(e) => setData('phone', e.target.value)}
                                autoComplete="tel"
                                placeholder={t('+381 6x xxx xxxx')}
                            />

                            <InputError className="mt-2" message={errors.phone} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="address">{t('Adresa')}</Label>

                            <Input
                                id="address"
                                className="mt-1 block w-full"
                                value={data.address}
                                onChange={(e) => setData('address', e.target.value)}
                                autoComplete="street-address"
                                placeholder={t('Ulica i broj')}
                            />

                            <InputError className="mt-2" message={errors.address} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="city">{t('Grad')}</Label>

                            <Input
                                id="city"
                                className="mt-1 block w-full"
                                value={data.city}
                                onChange={(e) => setData('city', e.target.value)}
                                autoComplete="address-level2"
                                placeholder={t('Grad')}
                            />

                            <InputError className="mt-2" message={errors.city} />
                        </div>

                        <label htmlFor="notify_messages_by_email" className="flex cursor-pointer items-start gap-3">
                            <Checkbox
                                id="notify_messages_by_email"
                                checked={data.notify_messages_by_email}
                                onCheckedChange={(checked) => setData('notify_messages_by_email', checked === true)}
                                className="mt-0.5"
                            />
                            <span className="grid gap-1">
                                <span className="text-sm font-medium">{t('Mejl kad dobijem novu poruku')}</span>
                                <span className="text-muted-foreground text-xs">
                                    {t('Najviše jedan mejl po prepisci na nekoliko sati, i samo dok poruku ne pročitate na sajtu.')}
                                </span>
                            </span>
                        </label>

                        <label htmlFor="notify_weekly_digest" className="flex cursor-pointer items-start gap-3">
                            <Checkbox
                                id="notify_weekly_digest"
                                checked={data.notify_weekly_digest}
                                onCheckedChange={(checked) => setData('notify_weekly_digest', checked === true)}
                                className="mt-0.5"
                            />
                            <span className="grid gap-1">
                                <span className="text-sm font-medium">{t('Nedeljni pregled od proizvođača koje pratim')}</span>
                                <span className="text-muted-foreground text-xs">
                                    {t('Jednom nedeljno, i samo kad neko koga pratite doda proizvod, priču ili recept.')}
                                </span>
                            </span>
                        </label>

                        {mustVerifyEmail && auth.user.email_verified_at === null && (
                            <div>
                                <p className="mt-2 text-sm text-neutral-800">
                                    {t('Vaša email adresa nije potvrđena.')}
                                    <Link
                                        href={route('verification.send')}
                                        method="post"
                                        as="button"
                                        className="rounded-md text-sm text-neutral-600 underline hover:text-neutral-900 focus:ring-2 focus:ring-offset-2 focus:outline-hidden"
                                    >
                                        {t('Kliknite ovde da ponovo pošaljemo email za potvrdu.')}
                                    </Link>
                                </p>

                                {status === 'verification-link-sent' && (
                                    <div className="mt-2 text-sm font-medium text-green-600">
                                        {t('Nov link za potvrdu je poslat na vašu email adresu.')}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex items-center gap-4">
                            <Button disabled={processing}>{t('Sačuvaj')}</Button>

                            <p
                                aria-live="polite"
                                className={cn('text-sm text-neutral-600 transition-opacity', recentlySuccessful ? 'opacity-100' : 'opacity-0')}
                            >
                                {t('Sačuvano')}
                            </p>
                        </div>
                    </form>
                </div>

                <DeleteUser hasPassword={hasPassword} />
            </SettingsLayout>
        </MarketplaceLayout>
    );
}
