<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

/**
 * Someone telling the site that something is wrong with a producer, a
 * product or another user (task 21).
 *
 * The platform never sees the deal itself, so this is the only channel
 * through which fraud, silence or abuse can reach an admin before it reaches
 * the public reviews.
 */
class Report extends Model
{
    public const STATUS_OPEN = 'open';

    public const STATUS_REVIEWED = 'reviewed';

    public const STATUS_DISMISSED = 'dismissed';

    /** @var list<string> */
    public const STATUSES = [self::STATUS_OPEN, self::STATUS_REVIEWED, self::STATUS_DISMISSED];

    /**
     * What someone can be reporting. Kept as a fixed list so the form cannot
     * be used as a free-text channel to the admin panel - that is what the
     * optional message is for.
     *
     * @var array<string, string>
     */
    public const REASONS = [
        'prevara' => 'Prevara ili naplata bez isporuke',
        'ne_odgovara' => 'Ne odgovara na poruke',
        'neispravan_proizvod' => 'Proizvod nije kao što je opisan',
        'neprimereno' => 'Neprimeren sadržaj ili ponašanje',
        'spam' => 'Spam ili zloupotreba poruka',
        'drugo' => 'Nešto drugo',
    ];

    protected $fillable = [
        'reported_by',
        'reportable_type',
        'reportable_id',
        'reason',
        'message',
        'status',
        'reviewed_by',
        'reviewed_at',
    ];

    protected function casts(): array
    {
        return ['reviewed_at' => 'datetime'];
    }

    public function reportable(): MorphTo
    {
        return $this->morphTo();
    }

    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reported_by');
    }

    /** @param  Builder<Report>  $query */
    public function scopeOpen(Builder $query): void
    {
        $query->where('status', self::STATUS_OPEN);
    }

    public function reasonLabel(): string
    {
        return self::REASONS[$this->reason] ?? $this->reason;
    }
}
