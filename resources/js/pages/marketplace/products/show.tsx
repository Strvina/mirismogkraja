import Head from '@/components/head';
import ProductDetails, { type ProductPageProps } from '@/components/product-page/product-details';
import MarketplaceLayout from '@/layouts/marketplace-layout';
import { tx } from '@/lib/i18n';
import { type BreadcrumbItem } from '@/types';

export default function ProductShow(props: ProductPageProps) {
    const { product } = props;

    const breadcrumbs: BreadcrumbItem[] = [
        { title: tx('Proizvodi'), href: route('marketplace.products.index') },
        ...(product.category?.parent
            ? [{ title: product.category.parent.name, href: route('marketplace.categories.show', product.category.parent.slug) }]
            : []),
        ...(product.category ? [{ title: product.category.name, href: route('marketplace.categories.show', product.category.slug) }] : []),
        { title: product.name, href: route('marketplace.products.show', product.slug) },
    ];

    return (
        <MarketplaceLayout breadcrumbs={breadcrumbs}>
            <Head />
            <ProductDetails {...props} />
        </MarketplaceLayout>
    );
}
