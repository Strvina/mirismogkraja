import { type BreadcrumbItem, type SharedData } from '@/types';
import { Transition } from '@headlessui/react';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

import DeleteUser from '@/components/delete-user';
import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import SettingsLayout from '@/layouts/settings/layout';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Moj nalog',
        href: '/settings/profile',
    },
];

export default function Profile({ mustVerifyEmail, status }: { mustVerifyEmail: boolean; status?: string }) {
    const { auth } = usePage<SharedData>().props;
    const [avatarPreview, setAvatarPreview] = useState<string | null>(
        auth.user.avatar_path ? `/storage/${auth.user.avatar_path}` : null,
    );

    const [avatarProcessing, setAvatarProcessing] = useState(false);
    const [avatarError, setAvatarError] = useState<string | null>(null);

    const { data, setData, patch, errors, processing, recentlySuccessful } = useForm<{
        name: string;
        email: string;
        phone: string;
        address: string;
        city: string;
    }>({
        name: auth.user.name,
        email: auth.user.email,
        phone: auth.user.phone ?? '',
        address: auth.user.address ?? '',
        city: auth.user.city ?? '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        patch(route('profile.update'));
    };

    const onAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;

        if (!file) {
            return;
        }

        setAvatarPreview(URL.createObjectURL(file));
        setAvatarError(null);
        setAvatarProcessing(true);

        // Pass the file directly instead of staging it in useForm's state -
        // that state update is async, so patch()ing right after setData()
        // in the same handler would submit the previous (empty) value.
        router.patch(
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
            <Head title="Moj nalog" />

            <SettingsLayout>
                <div className="space-y-6">
                    <HeadingSmall title="Lični podaci" description="Izmenite svoje ime, email i kontakt podatke" />

                    <div className="grid gap-2">
                        <Label htmlFor="avatar">Profilna slika</Label>

                        <div className="flex items-center gap-4">
                            {avatarPreview && (
                                <img
                                    src={avatarPreview}
                                    alt="Pregled profilne slike"
                                    className="size-16 rounded-full object-cover"
                                />
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
                            <Label htmlFor="name">Ime i prezime</Label>

                            <Input
                                id="name"
                                className="mt-1 block w-full"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                required
                                autoComplete="name"
                                placeholder="Ime i prezime"
                            />

                            <InputError className="mt-2" message={errors.name} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="email">Email adresa</Label>

                            <Input
                                id="email"
                                type="email"
                                className="mt-1 block w-full"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                required
                                autoComplete="username"
                                placeholder="Email adresa"
                            />

                            <InputError className="mt-2" message={errors.email} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="phone">Telefon</Label>

                            <Input
                                id="phone"
                                className="mt-1 block w-full"
                                value={data.phone}
                                onChange={(e) => setData('phone', e.target.value)}
                                autoComplete="tel"
                                placeholder="+381 6x xxx xxxx"
                            />

                            <InputError className="mt-2" message={errors.phone} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="address">Adresa</Label>

                            <Input
                                id="address"
                                className="mt-1 block w-full"
                                value={data.address}
                                onChange={(e) => setData('address', e.target.value)}
                                autoComplete="street-address"
                                placeholder="Ulica i broj"
                            />

                            <InputError className="mt-2" message={errors.address} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="city">Grad</Label>

                            <Input
                                id="city"
                                className="mt-1 block w-full"
                                value={data.city}
                                onChange={(e) => setData('city', e.target.value)}
                                autoComplete="address-level2"
                                placeholder="Grad"
                            />

                            <InputError className="mt-2" message={errors.city} />
                        </div>

                        {mustVerifyEmail && auth.user.email_verified_at === null && (
                            <div>
                                <p className="mt-2 text-sm text-neutral-800">
                                    Vaša email adresa nije potvrđena.
                                    <Link
                                        href={route('verification.send')}
                                        method="post"
                                        as="button"
                                        className="rounded-md text-sm text-neutral-600 underline hover:text-neutral-900 focus:ring-2 focus:ring-offset-2 focus:outline-hidden"
                                    >
                                        Kliknite ovde da ponovo pošaljemo email za potvrdu.
                                    </Link>
                                </p>

                                {status === 'verification-link-sent' && (
                                    <div className="mt-2 text-sm font-medium text-green-600">
                                        Nov link za potvrdu je poslat na vašu email adresu.
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex items-center gap-4">
                            <Button disabled={processing}>Sačuvaj</Button>

                            <Transition
                                show={recentlySuccessful}
                                enter="transition ease-in-out"
                                enterFrom="opacity-0"
                                leave="transition ease-in-out"
                                leaveTo="opacity-0"
                            >
                                <p className="text-sm text-neutral-600">Sačuvano</p>
                            </Transition>
                        </div>
                    </form>
                </div>

                <DeleteUser />
            </SettingsLayout>
        </MarketplaceLayout>
    );
}
