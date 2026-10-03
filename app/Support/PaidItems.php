<?php

namespace App\Support;

use App\Models\Boost;
use App\Models\CampaignParticipant;
use App\Models\ProducerSubscription;

/**
 * The three things a producer pays for by slip - a membership, a boost, a
 * campaign place - seen as one: their name in URLs, what they are called,
 * and the pages that show them.
 *
 * Links in notifications come from here, so every notification about a
 * payment opens the exact slip or row it is about instead of a list.
 */
final class PaidItems
{
    /** URL segment => model. */
    public const KINDS = [
        'clanarina' => ProducerSubscription::class,
        'isticanje' => Boost::class,
        'kampanja' => CampaignParticipant::class,
    ];

    public static function kind(ProducerSubscription|Boost|CampaignParticipant $item): string
    {
        return array_search($item::class, self::KINDS, true);
    }

    public static function find(string $kind, int|string $id): ProducerSubscription|Boost|CampaignParticipant
    {
        abort_unless(isset(self::KINDS[$kind]), 404);

        return self::KINDS[$kind]::findOrFail($id);
    }

    /** What it is, as a translation key: "Isticanje profila", "Članarina"… */
    public static function label(ProducerSubscription|Boost|CampaignParticipant $item): string
    {
        return match (true) {
            $item instanceof ProducerSubscription => 'Članarina',
            $item instanceof Boost => $item->isProduct() ? 'Isticanje proizvoda' : 'Isticanje profila',
            default => 'Učešće u kampanji',
        };
    }

    /** Which one: the plan, the boosted profile or product, the campaign. */
    public static function name(ProducerSubscription|Boost|CampaignParticipant $item): string
    {
        return match (true) {
            $item instanceof ProducerSubscription => $item->plan?->name ?? '',
            $item instanceof Boost => $item->boostable?->name ?? $item->producer?->name ?? '',
            default => $item->campaign?->name ?? '',
        };
    }

    /** The row's id on both the producer's and the admin's page. */
    public static function anchor(ProducerSubscription|Boost|CampaignParticipant $item): string
    {
        return self::kind($item).'-'.$item->getKey();
    }

    /** The producer's page with this item's slip open. */
    public static function slipUrl(ProducerSubscription|Boost|CampaignParticipant $item): string
    {
        return self::producerPage($item, ['uplatnica' => $item->getKey()]);
    }

    /** The producer's page, scrolled to this item. */
    public static function url(ProducerSubscription|Boost|CampaignParticipant $item): string
    {
        return self::producerPage($item).'#'.self::anchor($item);
    }

    /** The admin's list, on the tab this item is in, scrolled to it. */
    public static function adminUrl(ProducerSubscription|Boost|CampaignParticipant $item): string
    {
        $status = $item instanceof CampaignParticipant && $item->status === CampaignParticipant::STATUS_ACTIVE && $item->campaign?->ends_on?->lt(today())
            ? 'ended'
            : $item->status;

        $name = match (true) {
            $item instanceof ProducerSubscription => 'admin.memberships.index',
            $item instanceof Boost => 'admin.boosts.index',
            default => 'admin.campaigns.index',
        };

        return route($name, ['status' => $status]).'#'.self::anchor($item);
    }

    /** @param  array<string, int|string>  $query */
    private static function producerPage(ProducerSubscription|Boost|CampaignParticipant $item, array $query = []): string
    {
        return match (true) {
            // A producer may have several; the page opens on this one.
            $item instanceof ProducerSubscription => route('memberships.index', ['proizvodjac' => $item->producer_id, ...$query]),
            $item instanceof Boost => route('boosts.index', $query),
            default => route('campaigns.index', $query),
        };
    }
}
