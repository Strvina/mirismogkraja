import { Head } from '@inertiajs/react';

import AppearanceTabs from '@/components/appearance-tabs';
import HeadingSmall from '@/components/heading-small';
import { type BreadcrumbItem } from '@/types';

import MarketplaceLayout from '@/layouts/marketplace-layout';
import SettingsLayout from '@/layouts/settings/layout';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Izgled',
        href: '/settings/appearance',
    },
];

export default function Appearance() {
    return (
        <MarketplaceLayout breadcrumbs={breadcrumbs}>
            <Head title="Izgled" />

            <SettingsLayout>
                <div className="space-y-6">
                    <HeadingSmall title="Izgled" description="Izaberite svetlu ili tamnu temu" />
                    <AppearanceTabs />
                </div>
            </SettingsLayout>
        </MarketplaceLayout>
    );
}
