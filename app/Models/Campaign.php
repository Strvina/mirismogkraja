<?php

namespace App\Models;

use App\Models\Concerns\KeepsOldSlugs;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * A seasonal campaign: a themed page and a homepage banner for
 * its dates, with the producers who paid to join.
 *
 * @property int $id
 * @property string $name
 * @property string $slug
 * @property string|null $description
 * @property Carbon $starts_on
 * @property Carbon $ends_on
 * @property int $price_rsd
 * @property bool $is_active
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Collection<int, CampaignParticipant> $participants
 */
class Campaign extends Model
{
    use KeepsOldSlugs;

    protected $fillable = [
        'name',
        'slug',
        'description',
        'starts_on',
        'ends_on',
        'price_rsd',
        'is_active',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'starts_on' => 'date:Y-m-d',
            'ends_on' => 'date:Y-m-d',
            'is_active' => 'boolean',
        ];
    }

    /** @return HasMany<CampaignParticipant, $this> */
    public function participants(): HasMany
    {
        return $this->hasMany(CampaignParticipant::class);
    }

    /**
     * Published and still to come or under way - what a producer can join.
     *
     * @param  Builder<Campaign>  $query
     */
    public function scopeOpen(Builder $query): void
    {
        $query->where('is_active', true)->whereDate('ends_on', '>=', today());
    }

    /**
     * Published and under way today - what the homepage announces.
     *
     * @param  Builder<Campaign>  $query
     */
    public function scopeRunning(Builder $query): void
    {
        $query->where('is_active', true)->whereDate('starts_on', '<=', today())->whereDate('ends_on', '>=', today());
    }
}
