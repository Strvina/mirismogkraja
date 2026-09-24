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
    household_id: number;
    category_id: number;
    category?: Category;
    images?: ProductImage[];
    name: string;
    slug: string;
    description: string | null;
    price: string;
    unit: 'kg' | 'g' | 'l' | 'ml' | 'kom' | 'paket';
    stock_quantity: number;
    status: 'draft' | 'active' | 'archived';
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
    household_id: number;
    rating: number;
    comment: string | null;
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
    description: string | null;
    story: string | null;
    address: string | null;
    city: string | null;
    phone: string | null;
    contact_email: string | null;
    delivery_methods: string[] | null;
    cover_image_path: string | null;
    logo_path: string | null;
    status: 'pending' | 'active' | 'blocked';
    created_at: string;
    updated_at: string;
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
    /** Only present after a partial reload asks for it (the bell dropdown). */
    notifications?: SiteNotification[];
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
    roles?: { id: number; name: string }[];
    created_at: string;
    updated_at: string;
    [key: string]: unknown; // This allows for additional properties...
}
