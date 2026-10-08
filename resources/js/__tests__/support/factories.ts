/**
 * Rows as the server sends them, with believable defaults: a test names only
 * the fields it is about.
 */
import { type Paginated } from '@/components/marketplace/pagination';
import { type ProducerCardProducer } from '@/components/marketplace/producer-card';
import { type ProductCardProduct } from '@/components/marketplace/product-card';
import { type ReviewWithAuthor } from '@/components/marketplace/review-card';
import { type Message } from '@/components/messages/types';
import { type PublicProducer } from '@/components/producer-page/types';
import { type Category, type Producer, type Product, type User } from '@/types';

let sequence = 0;

/** A different id for every row made in a test file. */
function nextId(): number {
    return ++sequence;
}

type Role = 'buyer' | 'seller' | 'admin';

export function makeUser(overrides: Partial<User> & { role?: Role | Role[] } = {}): User {
    const { role = 'buyer', ...fields } = overrides;
    const id = fields.id ?? nextId();

    return {
        id,
        name: 'Milica Nikolić',
        email: 'milica@example.com',
        avatar_path: null,
        phone: null,
        address: null,
        city: null,
        email_verified_at: '2026-01-10T08:00:00Z',
        notify_messages_by_email: true,
        notify_weekly_digest: true,
        roles: [role].flat().map((name, index) => ({ id: index + 1, name })),
        created_at: '2026-01-10T08:00:00Z',
        updated_at: '2026-01-10T08:00:00Z',
        ...fields,
    };
}

export function makeProducer(overrides: Partial<Producer> = {}): Producer {
    const id = overrides.id ?? nextId();

    return {
        id,
        user_id: 1,
        name: 'Mlekara Zapis',
        slug: 'mlekara-zapis',
        founding_number: null,
        verified_at: null,
        description: null,
        story: null,
        address: null,
        city: 'Niš',
        phone: null,
        contact_email: null,
        delivery_methods: null,
        lat: null,
        lng: null,
        cover_image_path: null,
        logo_path: null,
        status: 'active',
        created_at: '2026-01-10T08:00:00Z',
        updated_at: '2026-01-10T08:00:00Z',
        ...overrides,
    };
}

/** The producer as their public page receives it. */
export function makePublicProducer(overrides: Partial<PublicProducer> = {}): PublicProducer {
    const { id, name, slug, founding_number, verified_at, description, story, address, city, contact_email, delivery_methods, lat, lng, ...rest } =
        makeProducer();

    return {
        id,
        name,
        slug,
        founding_number,
        verified_at,
        description,
        story,
        address,
        city,
        contact_email,
        delivery_methods,
        lat,
        lng,
        cover_image_path: rest.cover_image_path,
        logo_path: rest.logo_path,
        has_phone: false,
        ...overrides,
    };
}

export function makeProducerCard(overrides: Partial<ProducerCardProducer> = {}): ProducerCardProducer {
    return {
        ...makeProducer(overrides),
        reviews_avg_rating: null,
        reviews_count: 0,
        products_count: 3,
        reviews: [],
        ...overrides,
    };
}

export function makeProduct(overrides: Partial<Product> = {}): Product {
    const id = overrides.id ?? nextId();

    return {
        id,
        producer_id: 1,
        category_id: 1,
        name: 'Domaći ajvar',
        slug: 'domaci-ajvar',
        description: null,
        price: '650.00',
        unit: 'kom',
        stock_quantity: 12,
        season_from: null,
        season_to: null,
        status: 'active',
        ...overrides,
    };
}

export function makeProductCard(overrides: Partial<ProductCardProduct> = {}): ProductCardProduct {
    const { id, name, slug, price, unit, stock_quantity, season_from, season_to } = makeProduct(overrides);

    return { id, name, slug, price, unit, stock_quantity, season_from, season_to, images: [], ...overrides };
}

export function makeCategory(overrides: Partial<Category> = {}): Category {
    return { id: overrides.id ?? nextId(), name: 'Zimnica', parent_id: null, ...overrides };
}

export function makeMessage(overrides: Partial<Message> = {}): Message {
    const id = overrides.id ?? nextId();

    return {
        id,
        body: 'Dobar dan, da li imate ajvar?',
        created_at: '2026-10-12T08:00:00Z',
        mine: false,
        sender: { id: 2, name: 'Petar Petrović', avatar_path: null },
        product: null,
        wanted_ad: null,
        ...overrides,
    };
}

export function makeReview(overrides: Partial<ReviewWithAuthor> = {}): ReviewWithAuthor {
    const id = overrides.id ?? nextId();

    return {
        id,
        user_id: 2,
        producer_id: 1,
        rating: 5,
        comment: 'Odličan sir, sve preporuke.',
        reply: null,
        replied_at: null,
        image_path: null,
        status: 'approved',
        approved_at: '2026-10-01T08:00:00Z',
        created_at: '2026-10-01T08:00:00Z',
        user: { name: 'Jovana Jovanović', avatar_path: null },
        ...overrides,
    };
}

/**
 * A page of a Laravel paginator. With more than one page it carries the
 * links Laravel sends: "previous", one per page, "next".
 */
export function paginated<T>(
    data: T[],
    { page = 1, lastPage = 1, perPage = 12 }: { page?: number; lastPage?: number; perPage?: number } = {},
): Paginated<T> {
    const url = (number: number) => `/lista?page=${number}`;

    return {
        data,
        current_page: page,
        last_page: lastPage,
        from: data.length > 0 ? (page - 1) * perPage + 1 : null,
        to: data.length > 0 ? (page - 1) * perPage + data.length : null,
        total: lastPage > 1 ? lastPage * perPage : data.length,
        links: [
            { url: page > 1 ? url(page - 1) : null, label: '&laquo; Previous', active: false },
            ...Array.from({ length: lastPage }, (_, index) => ({ url: url(index + 1), label: String(index + 1), active: index + 1 === page })),
            { url: page < lastPage ? url(page + 1) : null, label: 'Next &raquo;', active: false },
        ],
    };
}
