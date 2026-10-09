import { type ProducerFormData, type ProducerFormFields } from '@/components/producer-form/types';
import { useForm } from '@inertiajs/react';
import { type ReactNode } from 'react';

export const EMPTY_PRODUCER: ProducerFormData = {
    name: '',
    description: '',
    story: '',
    address: '',
    city: '',
    phone: '',
    contact_email: '',
    delivery_methods: [],
    cover_image: null,
    logo: null,
    lat: '',
    lng: '',
    products: [],
};

/**
 * A group of the producer form's fields on a real form, as the page mounts
 * it. `errors` are what the server answered with; `onData` sees the form's
 * values after every change.
 */
export function ProducerFormHarness({
    initial = {},
    errors = {},
    onData,
    children,
}: {
    initial?: Partial<ProducerFormData>;
    errors?: Partial<Record<keyof ProducerFormData, string>>;
    onData?: (data: ProducerFormData) => void;
    children: (fields: ProducerFormFields) => ReactNode;
}) {
    const form = useForm<ProducerFormData>({ ...EMPTY_PRODUCER, ...initial });

    onData?.(form.data);

    return <form>{children({ data: form.data, setData: form.setData, errors: errors as ProducerFormFields['errors'] })}</form>;
}
