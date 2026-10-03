import { type DraftProduct } from '@/pages/producers/producer-products-step';
import { type InertiaFormProps } from '@inertiajs/react';

export type ProducerFormData = {
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
    /** Empty until a point is chosen on the map; sent as null then. */
    lat: string;
    lng: string;
    /** Only when signing up: the first products, created with the producer. */
    products: DraftProduct[];
};

/** What each group of fields needs from the form. */
export type ProducerFormFields = Pick<InertiaFormProps<ProducerFormData>, 'data' | 'setData' | 'errors'>;
