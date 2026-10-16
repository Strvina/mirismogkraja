import { tx } from '@/lib/i18n';

/**
 * The accounts a demo of the site is seeded with (DatabaseSeeder and
 * DemoContentSeeder), offered to every visitor of the demo so they can see
 * it from each side. Shown only when the server says it is a demo.
 */
export const DEMO_ACCOUNTS = [
    { role: tx('Kupac'), email: 'marko@example.com', password: 'password' },
    { role: tx('Proizvođač'), email: 'nicic@example.com', password: 'password' },
    { role: tx('Administrator'), email: 'admin@gmail.com', password: 'admin' },
] as const;
