import { LucideIcon } from 'lucide-react';

export interface Auth {
    user: User;
}

export interface Category {
    id: number;
    name: string;
}

export interface ProductImage {
    id: number;
    path: string;
    order: number;
}

export interface Product {
    id: number;
    producer_id: number;
    category_id: number;
    category?: Category;
    images?: ProductImage[];
    name: string;
    slug: string;
    description: string | null;
    price: string;
    unit: 'kg' | 'g' | 'l' | 'ml' | 'kom' | 'paket';
    stock_quantity: number;
    /** Months 1-12 when in season; both null: all year. */
    season_from?: number | null;
    season_to?: number | null;
    status: 'draft' | 'active' | 'archived' | 'blocked';
}

export interface SiteNotification {
    id: string;
    title: string;
    body: string | null;
    read: boolean;
    created_at: string;
}

export interface Review {
    id: number;
    user_id: number;
    producer_id: number;
    rating: number;
    comment: string | null;
    /** The producer's public answer, if they gave one. */
    reply?: string | null;
    replied_at?: string | null;
    image_path: string | null;
    status: 'pending' | 'approved' | 'rejected';
    /** When a moderator published it; the public date is created_at. */
    approved_at: string | null;
    created_at: string;
}

export interface Producer {
    id: number;
    user_id: number;
    name: string;
    slug: string;
    /** Permanent place in the founding hundred, or null. */
    founding_number?: number | null;
    /** Set by an admin who checked who this producer is. */
    verified_at?: string | null;
    description: string | null;
    story: string | null;
    address: string | null;
    city: string | null;
    phone: string | null;
    contact_email: string | null;
    delivery_methods: string[] | null;
    /** Decimal strings from the database; null until the producer marks a point. */
    lat?: string | null;
    lng?: string | null;
    cover_image_path: string | null;
    logo_path: string | null;
    status: 'pending' | 'active' | 'blocked';
    created_at: string;
    updated_at: string;
}

/** A place the producer sells at in person. */
export interface ProducerMarket {
    id: number;
    producer_id: number;
    name: string;
    city: string | null;
    /** ISO weekdays, 1 (Monday) to 7 (Sunday). */
    days: number[];
    /** "07:00"; both set or both null. */
    opens_at: string | null;
    closes_at: string | null;
    note: string | null;
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface NavItem {
    title: string;
    url: string;
    icon?: LucideIcon | null;
    isActive?: boolean;
}

export interface SharedData {
    name: string;
    auth: Auth;
    unreadMessages: number;
    unreadNotifications: number;
    /** Where uploaded images are served from (see lib/media). */
    media: { url: string; thumbs: boolean };
    /**
     * Only present after a partial reload asks for it (the bell dropdown).
     * Not called `notifications`: the notifications page has a prop of that
     * name, and page props are merged over shared ones.
     */
    recentNotifications?: SiteNotification[];
    [key: string]: unknown;
}

export interface User {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    avatar_path: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    email_verified_at: string | null;
    blocked_at?: string | null;
    notify_messages_by_email: boolean;
    roles?: { id: number; name: string }[];
    created_at: string;
    updated_at: string;
    [key: string]: unknown; // This allows for additional properties...
}
