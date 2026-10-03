<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Producer;
use App\Models\Product;
use App\Models\WeeklyPick;
use App\Notifications\SiteNotification;
use App\Services\SubscriptionService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Choosing "Proizvođač nedelje" (task 20.7). A person decides; the page
 * helps by suggesting Pro members - the plan that includes the chance - and
 * by flagging anyone picked in the last few weeks, so the slot keeps moving.
 */
class WeeklyPickController extends Controller
{
    /** How many weeks ahead a pick can be planned. */
    private const WEEKS_AHEAD = 4;

    public function index(Request $request, SubscriptionService $subscriptions): Response
    {
        $recent = WeeklyPick::query()
            ->whereDate('starts_on', '>=', WeeklyPick::weekOf()->subWeeks(WeeklyPick::REPEAT_AFTER_WEEKS))
            ->pluck('producer_id')
            ->unique();

        return Inertia::render('admin/weekly-picks/index', [
            'picks' => WeeklyPick::with(['producer:id,name,slug', 'product:id,name,slug'])
                ->orderByDesc('starts_on')
                ->paginate(20),
            'producers' => Producer::published()
                ->orderBy('name')
                ->get(['id', 'name'])
                ->map(fn (Producer $producer) => [
                    'id' => $producer->id,
                    'name' => $producer->name,
                    'recent' => $recent->contains($producer->id),
                ]),
            'suggestions' => Producer::published()
                ->whereIn('id', $subscriptions->producerIdsWith('homepage'))
                ->whereNotIn('id', $recent)
                ->inRandomOrder()
                ->limit(5)
                ->get(['id', 'name']),
            'weeks' => $this->weeks(),
            // Asked for by the form once a producer is chosen, as a partial
            // reload - the page never loads every product of every producer.
            'products' => Inertia::optional(fn () => Product::query()
                ->where('producer_id', $request->integer('producer'))
                ->where('status', 'active')
                ->orderBy('name')
                ->get(['id', 'name'])),
        ]);
    }

    /**
     * Pick for a week. Picking again for a week that already has one
     * replaces it; the producer hears about it either way.
     */
    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'producer_id' => ['required', 'integer', Rule::exists('producers', 'id')->where('status', 'active')->whereNull('deleted_at')],
            'product_id' => [
                'nullable',
                'integer',
                Rule::exists('products', 'id')->where('producer_id', $request->integer('producer_id'))->where('status', 'active'),
            ],
            'starts_on' => ['required', Rule::in($this->weeks())],
        ]);

        // Found through whereDate rather than updateOrCreate: SQLite keeps
        // the date with a time, so an exact match on the bare date misses.
        $pick = WeeklyPick::whereDate('starts_on', $data['starts_on'])->first() ?? new WeeklyPick;
        $changed = $pick->producer_id !== (int) $data['producer_id'];

        $pick->fill([...$data, 'created_by' => $request->user()->id])->save();

        if ($changed) {
            $producer = $pick->producer;
            $producer->user?->notify(SiteNotification::weeklyPick(
                $producer->name,
                $pick->starts_on,
                route('marketplace.producers.show', $producer->slug),
            ));
        }

        return back();
    }

    public function destroy(WeeklyPick $pick): RedirectResponse
    {
        $pick->delete();

        return back();
    }

    /**
     * The Mondays a pick can be made for: this week and the next few.
     *
     * @return list<string>
     */
    private function weeks(): array
    {
        return collect(range(0, self::WEEKS_AHEAD))
            ->map(fn (int $offset) => WeeklyPick::weekOf()->addWeeks($offset)->toDateString())
            ->all();
    }
}
