import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type Household } from '@/types';
import { useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

type HouseholdFormData = {
    name: string;
    description: string;
    address: string;
    city: string;
    cover_image: File | null;
    logo: File | null;
};

function ImageField({
    id,
    label,
    preview,
    onChange,
    error,
}: {
    id: string;
    label: string;
    preview: string | null;
    onChange: (file: File | null) => void;
    error?: string;
}) {
    return (
        <div className="grid gap-2">
            <Label htmlFor={id}>{label}</Label>
            <div className="flex items-center gap-4">
                {preview && <img src={preview} alt="" className="size-16 rounded-md object-cover" />}
                <Input id={id} type="file" accept="image/*" className="w-full max-w-xs" onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
            </div>
            <InputError message={error} />
        </div>
    );
}

export default function HouseholdForm({
    household,
    action,
    method,
    submitLabel,
}: {
    household?: Household;
    action: string;
    method: 'post' | 'put';
    submitLabel: string;
}) {
    const { data, setData, post, put, processing, errors } = useForm<HouseholdFormData>({
        name: household?.name ?? '',
        description: household?.description ?? '',
        address: household?.address ?? '',
        city: household?.city ?? '',
        cover_image: null,
        logo: null,
    });

    const [coverPreview, setCoverPreview] = useState<string | null>(household?.cover_image_path ? `/storage/${household.cover_image_path}` : null);
    const [logoPreview, setLogoPreview] = useState<string | null>(household?.logo_path ? `/storage/${household.logo_path}` : null);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        const submitFn = method === 'post' ? post : put;
        submitFn(action, { forceFormData: true });
    };

    return (
        <form onSubmit={submit} className="max-w-xl space-y-6">
            <ImageField
                id="cover_image"
                label="Naslovna slika"
                preview={coverPreview}
                error={errors.cover_image}
                onChange={(file) => {
                    setData('cover_image', file);
                    setCoverPreview(file ? URL.createObjectURL(file) : null);
                }}
            />

            <ImageField
                id="logo"
                label="Logo"
                preview={logoPreview}
                error={errors.logo}
                onChange={(file) => {
                    setData('logo', file);
                    setLogoPreview(file ? URL.createObjectURL(file) : null);
                }}
            />

            <div className="grid gap-2">
                <Label htmlFor="name">Naziv domaćinstva</Label>
                <Input id="name" value={data.name} onChange={(e) => setData('name', e.target.value)} required />
                <InputError message={errors.name} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="description">Opis</Label>
                <textarea
                    id="description"
                    className="border-input bg-background min-h-32 rounded-md border px-3 py-2 text-sm"
                    value={data.description}
                    onChange={(e) => setData('description', e.target.value)}
                />
                <InputError message={errors.description} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="address">Adresa</Label>
                <Input id="address" value={data.address} onChange={(e) => setData('address', e.target.value)} />
                <InputError message={errors.address} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="city">Grad</Label>
                <Input id="city" value={data.city} onChange={(e) => setData('city', e.target.value)} />
                <InputError message={errors.city} />
            </div>

            <Button disabled={processing}>{submitLabel}</Button>
        </form>
    );
}
