<?php

namespace App\Services;

use App\Models\InquiryOutcome;
use App\Models\Producer;
use App\Models\ProducerMessage;
use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * A producer's inquiries as a spreadsheet: one row per conversation - who
 * asked, about what, when, whether it was answered and how it ended.
 *
 * The site keeps no orders, so this is the nearest thing a producer has to
 * a customer list they can sort, total and keep outside the site.
 */
class InquiryExport
{
    /** Conversations per file. More than a household sees in years. */
    public const MAX_ROWS = 10000;

    /** @return list<string> */
    public function headings(): array
    {
        return [__('Kupac'), __('Prvi upit'), __('Poslednja poruka'), __('Proizvod'), __('Poruka'), __('Odgovoreno'), __('Ishod')];
    }

    /**
     * Newest conversation first.
     *
     * @return list<list<string>>
     */
    public function rows(Producer $producer): array
    {
        $threads = DB::table('producer_messages')
            ->where('producer_id', $producer->id)
            ->groupBy('buyer_id')
            ->selectRaw('buyer_id, min(created_at) as first_at, max(created_at) as last_at, count(*) as messages')
            // Whether the producer has written in the thread at all.
            ->selectRaw('max(case when sender_id = ? then 1 else 0 end) as answered', [$producer->user_id])
            ->orderByDesc('first_at')
            ->limit(self::MAX_ROWS)
            ->get();

        $buyerIds = $threads->pluck('buyer_id');

        // The product each conversation was opened about: the first message
        // that names one.
        $productIds = ProducerMessage::query()
            ->where('producer_id', $producer->id)
            ->whereIn('buyer_id', $buyerIds)
            ->whereNotNull('product_id')
            ->orderBy('id')
            ->get(['buyer_id', 'product_id'])
            ->unique('buyer_id')
            ->pluck('product_id', 'buyer_id');

        $buyers = User::withTrashed()->whereKey($buyerIds)->pluck('name', 'id');
        $products = Product::whereKey($productIds->unique())->pluck('name', 'id');
        $outcomes = InquiryOutcome::where('producer_id', $producer->id)->whereIn('buyer_id', $buyerIds)->pluck('status', 'buyer_id');

        return $threads->map(fn (object $thread) => [
            self::cell((string) ($buyers[$thread->buyer_id] ?? '')),
            Carbon::parse($thread->first_at)->format('d.m.Y. H:i'),
            Carbon::parse($thread->last_at)->format('d.m.Y. H:i'),
            self::cell((string) ($products[$productIds[$thread->buyer_id] ?? null] ?? '')),
            (string) $thread->messages,
            $thread->answered ? __('Da') : __('Ne'),
            isset($outcomes[$thread->buyer_id]) ? __(InquiryOutcome::STATUSES[$outcomes[$thread->buyer_id]] ?? '') : '',
        ])->all();
    }

    /**
     * Text another person typed, made safe to open in a spreadsheet: a cell
     * that starts with =, +, - or @ is run as a formula, so it is turned
     * into text with a leading apostrophe.
     */
    public static function cell(string $value): string
    {
        return preg_match('/^[=+\-@\t\r]/', $value) ? "'".$value : $value;
    }
}
