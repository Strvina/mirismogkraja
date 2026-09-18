import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type Producer, type Review, type User } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Star } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin' },
    { title: 'Ocene', href: '/admin/ocene' },
];

type ReviewWithRelations = Review & { user: User; producer: Producer };

export default function AdminReviewsIndex({ reviews }: { reviews: ReviewWithRelations[] }) {
    const destroy = (review: Review) => {
        if (confirm('Obrisati ovu ocenu?')) {
            router.delete(route('admin.reviews.destroy', review.id));
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Ocene" />

            <div className="flex flex-1 flex-col gap-4 p-4">
                <h1 className="font-serif text-xl font-semibold">Moderacija ocena</h1>

                <div className="space-y-2">
                    {reviews.map((review) => (
                        <div key={review.id} className="flex items-start justify-between gap-4 rounded-xl border p-4">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-medium">{review.user.name}</span>
                                    <span className="text-muted-foreground text-xs">→ {review.producer.name}</span>
                                    <span className="text-gold flex items-center gap-0.5">
                                        {Array.from({ length: review.rating }).map((_, i) => (
                                            <Star key={i} className="fill-gold size-3.5" />
                                        ))}
                                    </span>
                                </div>
                                {review.comment && <p className="text-muted-foreground mt-1 text-sm">{review.comment}</p>}
                            </div>
                            <Button variant="destructive" size="sm" onClick={() => destroy(review)}>
                                Obriši
                            </Button>
                        </div>
                    ))}
                </div>
            </div>
        </AppLayout>
    );
}
