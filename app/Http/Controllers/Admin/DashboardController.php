<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Boost;
use App\Models\CampaignParticipant;
use App\Models\InquiryOutcome;
use App\Models\Producer;
use App\Models\ProducerChangeRequest;
use App\Models\ProducerMessage;
use App\Models\ProducerSubscription;
use App\Models\Product;
use App\Models\Report;
use App\Models\Review;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/dashboard', [
            'stats' => [
                'users' => User::count(),
                'producers' => Producer::count(),
                'products' => Product::count(),
                // A thread is one (producer, buyer) pair. Counted through a
                // subquery rather than ->distinct()->count(), which Laravel
                // compiles down to COUNT(*) and would simply repeat the
                // message total. product_id is deliberately left out: it only
                // marks which product opened a thread, and replies don't
                // carry it.
                'conversations' => DB::query()->fromSub(
                    ProducerMessage::query()->select('household_id', 'buyer_id')->distinct(),
                    'threads'
                )->count(),
                'messages' => ProducerMessage::count(),
                'pending_reviews' => Review::pending()->count(),
            ],
            // Everything waiting on an admin, in one place - each line links
            // to the queue it counts. Lines at zero are dropped by the page.
            'todo' => [
                ['label' => __('proizvođača čeka odobrenje'), 'count' => Producer::where('status', 'pending')->count(), 'href' => route('admin.producers.index', ['status' => 'pending'])],
                ['label' => __('uplata za članarinu čeka potvrdu'), 'count' => ProducerSubscription::where('status', ProducerSubscription::STATUS_PENDING)->count(), 'href' => route('admin.memberships.index')],
                ['label' => __('uplata za isticanje čeka potvrdu'), 'count' => Boost::where('status', Boost::STATUS_PENDING)->count(), 'href' => route('admin.boosts.index')],
                ['label' => __('prijava za kampanju čeka potvrdu'), 'count' => CampaignParticipant::where('status', CampaignParticipant::STATUS_PENDING)->count(), 'href' => route('admin.campaigns.index')],
                ['label' => __('utisaka čeka odobrenje'), 'count' => Review::pending()->count(), 'href' => route('admin.reviews.index', ['status' => 'pending'])],
                ['label' => __('zahteva za izmenu naziva'), 'count' => ProducerChangeRequest::pending()->count(), 'href' => route('admin.change-requests.index')],
                ['label' => __('otvorenih prijava problema'), 'count' => Report::open()->count(), 'href' => route('admin.reports.index')],
            ],
            // How inquiries ended this month, as producers report it (task
            // 14.5) - unverifiable, and labelled so on the page.
            'outcomes' => $this->outcomesThisMonth(),
            // What the platform earns, by source (task 20.9): only money an
            // admin confirmed, and nothing given away free.
            'revenue' => [
                ['label' => __('Članarine'), ...$this->earned(ProducerSubscription::query())],
                ['label' => __('Isticanja'), ...$this->earned(Boost::query())],
                ['label' => __('Kampanje'), ...$this->earned(CampaignParticipant::query())],
            ],
        ]);
    }

    /**
     * @return array{counts: array<string, int>, labels: array<string, string>, topProducts: list<array{name: string, slug: string, count: int}>}
     */
    private function outcomesThisMonth(): array
    {
        $thisMonth = InquiryOutcome::query()->where('updated_at', '>=', now()->startOfMonth());

        $counts = (clone $thisMonth)
            ->toBase()
            ->selectRaw('status, count(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status');

        $top = (clone $thisMonth)
            ->where('status', 'completed')
            ->whereNotNull('product_id')
            ->toBase()
            ->selectRaw('product_id, count(*) as aggregate')
            ->groupBy('product_id')
            ->orderByDesc('aggregate')
            ->limit(5)
            ->pluck('aggregate', 'product_id');

        $products = Product::whereKey($top->keys())->get(['id', 'name', 'slug'])->keyBy('id');

        return [
            'counts' => collect(InquiryOutcome::STATUSES)->map(fn ($label, string $status) => (int) ($counts[$status] ?? 0))->all(),
            'labels' => array_map(__(...), InquiryOutcome::STATUSES),
            'topProducts' => $top
                ->filter(fn ($count, $id) => $products->has($id))
                ->map(fn ($count, $id) => ['name' => $products[$id]->name, 'slug' => $products[$id]->slug, 'count' => (int) $count])
                ->values()
                ->all(),
        ];
    }

    /**
     * All-time and this month's confirmed income from one kind of payment,
     * in a single query.
     *
     * @param  Builder<Model>  $payments
     * @return array{total: int, month: int}
     */
    private function earned(Builder $payments): array
    {
        $row = $payments
            ->whereNotNull('confirmed_at')
            ->where('amount_rsd', '>', 0)
            ->toBase()
            ->selectRaw('coalesce(sum(amount_rsd), 0) as total')
            ->selectRaw('coalesce(sum(case when confirmed_at >= ? then amount_rsd else 0 end), 0) as month', [now()->startOfMonth()])
            ->first();

        return ['total' => (int) $row->total, 'month' => (int) $row->month];
    }
}
