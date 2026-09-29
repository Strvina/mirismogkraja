<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A seasonal campaign (task 20.3): a themed page and a homepage banner for
 * its dates, with the producers who paid to join.
 */
class Campaign extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'description',
        'starts_on',
        'ends_on',
        'price_rsd',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'starts_on' => 'date:Y-m-d',
            'ends_on' => 'date:Y-m-d',
            'is_active' => 'boolean',
        ];
    }

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
