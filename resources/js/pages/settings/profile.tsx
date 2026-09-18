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
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Profile settings',
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
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Profile settings" />

            <SettingsLayout>
                <div className="space-y-6">
                    <HeadingSmall title="Profile information" description="Update your name and email address" />

                    <div className="grid gap-2">
                        <Label htmlFor="avatar">Avatar</Label>

                        <div className="flex items-center gap-4">
                            {avatarPreview && (
                                <img
                                    src={avatarPreview}
                                    alt="Avatar preview"
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
                            <Label htmlFor="name">Name</Label>

                            <Input
                                id="name"
                                className="mt-1 block w-full"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                required
                                autoComplete="name"
                                placeholder="Full name"
                            />

                            <InputError className="mt-2" message={errors.name} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="email">Email address</Label>

                            <Input
                                id="email"
                                type="email"
                                className="mt-1 block w-full"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                required
                                autoComplete="username"
                                placeholder="Email address"
                            />

                            <InputError className="mt-2" message={errors.email} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="phone">Phone</Label>

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
                            <Label htmlFor="address">Address</Label>

                            <Input
                                id="address"
                                className="mt-1 block w-full"
                                value={data.address}
                                onChange={(e) => setData('address', e.target.value)}
                                autoComplete="street-address"
                                placeholder="Street and number"
                            />

                            <InputError className="mt-2" message={errors.address} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="city">City</Label>

                            <Input
                                id="city"
                                className="mt-1 block w-full"
                                value={data.city}
                                onChange={(e) => setData('city', e.target.value)}
                                autoComplete="address-level2"
                                placeholder="City"
                            />

                            <InputError className="mt-2" message={errors.city} />
                        </div>

                        {mustVerifyEmail && auth.user.email_verified_at === null && (
                            <div>
                                <p className="mt-2 text-sm text-neutral-800">
                                    Your email address is unverified.
                                    <Link
                                        href={route('verification.send')}
                                        method="post"
                                        as="button"
                                        className="rounded-md text-sm text-neutral-600 underline hover:text-neutral-900 focus:ring-2 focus:ring-offset-2 focus:outline-hidden"
                                    >
                                        Click here to re-send the verification email.
                                    </Link>
                                </p>

                                {status === 'verification-link-sent' && (
                                    <div className="mt-2 text-sm font-medium text-green-600">
                                        A new verification link has been sent to your email address.
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex items-center gap-4">
                            <Button disabled={processing}>Save</Button>

                            <Transition
                                show={recentlySuccessful}
                                enter="transition ease-in-out"
                                enterFrom="opacity-0"
                                leave="transition ease-in-out"
                                leaveTo="opacity-0"
                            >
                                <p className="text-sm text-neutral-600">Saved</p>
                            </Transition>
                        </div>
                    </form>
                </div>

                <DeleteUser />
            </SettingsLayout>
        </AppLayout>
    );
}
