import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type Producer } from '@/types';
import { useForm } from '@inertiajs/react';
import { X } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

type ProducerFormData = {
    name: string;
    description: string;
    story: string;
    address: string;
    city: string;
    phone: string;
    contact_email: string;
    delivery_methods: string[];
    cover_image: File | null;
    logo: File | null;
};

/** Keys must match Producer::DELIVERY_METHODS. */
const deliveryMethods = {
    licna_dostava: 'Lična dostava',
    kurirska_sluzba: 'Kurirska služba',
    preuzimanje: 'Lično preuzimanje',
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

export default function ProducerForm({
    producer,
    action,
    method,
    submitLabel,
}: {
    producer?: Producer;
    action: string;
    method: 'post' | 'put';
    submitLabel: string;
}) {
    const { data, setData, post, put, processing, errors } = useForm<ProducerFormData>({
        name: producer?.name ?? '',
        description: producer?.description ?? '',
        story: producer?.story ?? '',
        address: producer?.address ?? '',
        city: producer?.city ?? '',
        phone: producer?.phone ?? '',
        contact_email: producer?.contact_email ?? '',
        delivery_methods: producer?.delivery_methods ?? [],
        cover_image: null,
        logo: null,
    });

    const [customMethod, setCustomMethod] = useState('');

    const toggleDeliveryMethod = (key: string, checked: boolean) => {
        setData(
            'delivery_methods',
            checked ? [...data.delivery_methods, key] : data.delivery_methods.filter((method) => method !== key),
        );
    };

    // Anything that isn't one of the predefined keys is the producer's own wording.
    const customMethods = data.delivery_methods.filter((method) => !(method in deliveryMethods));

    const addCustomMethod = () => {
        const value = customMethod.trim();

        if (value && !data.delivery_methods.includes(value)) {
            setData('delivery_methods', [...data.delivery_methods, value]);
        }

        setCustomMethod('');
    };

    const [coverPreview, setCoverPreview] = useState<string | null>(producer?.cover_image_path ? `/storage/${producer.cover_image_path}` : null);
    const [logoPreview, setLogoPreview] = useState<string | null>(producer?.logo_path ? `/storage/${producer.logo_path}` : null);

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
                <Label htmlFor="name">Naziv proizvođača</Label>
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
                <Label htmlFor="story">Priča o nastanku proizvoda</Label>
                <p className="text-muted-foreground -mt-1 text-xs">Kako nastaje ono što prodajete — tok proizvodnje, tradicija, sezona.</p>
                <textarea
                    id="story"
                    className="border-input bg-background min-h-32 rounded-md border px-3 py-2 text-sm"
                    value={data.story}
                    onChange={(e) => setData('story', e.target.value)}
                />
                <InputError message={errors.story} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="phone">Telefon za kontakt</Label>
                <Input id="phone" value={data.phone} onChange={(e) => setData('phone', e.target.value)} placeholder="+381 6x xxx xxxx" />
                <InputError message={errors.phone} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="contact_email">Email za kontakt</Label>
                <Input
                    id="contact_email"
                    type="email"
                    value={data.contact_email}
                    onChange={(e) => setData('contact_email', e.target.value)}
                />
                <InputError message={errors.contact_email} />
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

            <fieldset className="grid gap-2">
                <legend className="mb-2 text-sm font-medium">Način dostave</legend>
                <p className="text-muted-foreground -mt-1 mb-1 text-xs">Izaberite sve načine na koje kupci mogu da preuzmu robu.</p>
                {Object.entries(deliveryMethods).map(([key, label]) => (
                    <label key={key} className="flex cursor-pointer items-center gap-2.5 text-sm">
                        <input
                            type="checkbox"
                            className="border-input text-primary focus-visible:ring-ring/50 size-4 rounded border focus-visible:ring-[3px]"
                            checked={data.delivery_methods.includes(key)}
                            onChange={(e) => toggleDeliveryMethod(key, e.target.checked)}
                        />
                        {label}
                    </label>
                ))}

                {customMethods.map((method) => (
                    <span key={method} className="bg-olive-soft text-olive flex w-fit items-center gap-2 rounded-full py-1 pr-2 pl-3 text-sm">
                        {method}
                        <button
                            type="button"
                            aria-label={`Ukloni "${method}"`}
                            onClick={() => toggleDeliveryMethod(method, false)}
                            className="hover:bg-olive/15 grid size-5 place-items-center rounded-full transition-colors"
                        >
                            <X className="size-3" />
                        </button>
                    </span>
                ))}

                <div className="mt-1 flex max-w-sm gap-2">
                    <Input
                        value={customMethod}
                        onChange={(e) => setCustomMethod(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                addCustomMethod();
                            }
                        }}
                        placeholder="Npr. dostava autobusom"
                        maxLength={60}
                        aria-label="Svoj način dostave"
                    />
                    <Button type="button" variant="outline" onClick={addCustomMethod} disabled={!customMethod.trim()}>
                        Dodaj
                    </Button>
                </div>

                <InputError message={errors.delivery_methods} />
            </fieldset>

            <Button disabled={processing}>{submitLabel}</Button>
        </form>
    );
}
