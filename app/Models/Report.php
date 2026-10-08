<?php

namespace App\Models;

use App\Models\Concerns\CountsByStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Carbon;

/**
 * Someone telling the site that something is wrong with a producer, a
 * product, a story or recipe, or another user.
 *
 * The platform never sees the deal itself, so this is the only channel
 * through which fraud, silence or abuse can reach an admin before it reaches
 * the public reviews.
 *
 * @property int $id
 * @property int $reported_by
 * @property string $reportable_type
 * @property int $reportable_id
 * @property string $reason
 * @property string|null $message
 * @property string $status
 * @property int|null $reviewed_by
 * @property Carbon|null $reviewed_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Producer|Product|Post|User|null $reportable
 * @property-read User|null $reporter
 */
class Report extends Model
{
    use CountsByStatus;

    public const STATUS_OPEN = 'open';

    public const STATUS_REVIEWED = 'reviewed';

    public const STATUS_DISMISSED = 'dismissed';

    /**
     * What can be reported, as morph aliases (see AppServiceProvider).
     *
     * @var list<string>
     */
    public const REPORTABLE = ['producer', 'product', 'post', 'user'];

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

    /** @return array<string, string> */
    protected function casts(): array
    {
        return ['reviewed_at' => 'datetime'];
    }

    /** @return MorphTo<Model, $this> */
    public function reportable(): MorphTo
    {
        return $this->morphTo();
    }

    /** @return BelongsTo<User, $this> */
    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reported_by')->withTrashed();
    }

    /** @param  Builder<Report>  $query */
    public function scopeOpen(Builder $query): void
    {
        $query->where('status', self::STATUS_OPEN);
    }

    public function reasonLabel(): string
    {
        return isset(self::REASONS[$this->reason]) ? __(self::REASONS[$this->reason]) : $this->reason;
    }
}
