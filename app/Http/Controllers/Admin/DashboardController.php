<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Boost;
use App\Models\CampaignParticipant;
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
                ['label' => 'proizvođača čeka odobrenje', 'count' => Producer::where('status', 'pending')->count(), 'href' => route('admin.producers.index', ['status' => 'pending'])],
                ['label' => 'uplata za članarinu čeka potvrdu', 'count' => ProducerSubscription::where('status', ProducerSubscription::STATUS_PENDING)->count(), 'href' => route('admin.memberships.index')],
                ['label' => 'uplata za isticanje čeka potvrdu', 'count' => Boost::where('status', Boost::STATUS_PENDING)->count(), 'href' => route('admin.boosts.index')],
                ['label' => 'prijava za kampanju čeka potvrdu', 'count' => CampaignParticipant::where('status', CampaignParticipant::STATUS_PENDING)->count(), 'href' => route('admin.campaigns.index')],
                ['label' => 'utisaka čeka odobrenje', 'count' => Review::pending()->count(), 'href' => route('admin.reviews.index', ['status' => 'pending'])],
                ['label' => 'zahteva za izmenu naziva', 'count' => ProducerChangeRequest::pending()->count(), 'href' => route('admin.change-requests.index')],
                ['label' => 'otvorenih prijava problema', 'count' => Report::open()->count(), 'href' => route('admin.reports.index')],
            ],
            // What the platform earns, by source (task 20.9): only money an
            // admin confirmed, and nothing given away free.
            'revenue' => [
                ['label' => 'Članarine', ...$this->earned(ProducerSubscription::query())],
                ['label' => 'Isticanja', ...$this->earned(Boost::query())],
                ['label' => 'Kampanje', ...$this->earned(CampaignParticipant::query())],
            ],
        ]);
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
