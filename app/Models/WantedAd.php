<?php

namespace App\Models;

use App\Models\Concerns\CountsByStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

/**
 * "Tražim": what a buyer is looking for, written so that producers can
 * answer. The reverse of a product page - there the producer offers and the
 * buyer asks; here the buyer asks first.
 */
class WantedAd extends Model
{
    use CountsByStatus;

    public const STATUS_OPEN = 'open';

    /** The author found what they wanted, or gave up. */
    public const STATUS_CLOSED = 'closed';

    /** Taken down by an admin; only an admin puts it back. */
    public const STATUS_BLOCKED = 'blocked';

    /** @var list<string> */
    public const STATUSES = [self::STATUS_OPEN, self::STATUS_CLOSED, self::STATUS_BLOCKED];

    /** How long an ad is shown unless its author closes it sooner. */
    public const DAYS_OPEN = 30;

    /** Ads one person may have open at once: a request, not a notice board. */
    public const MAX_OPEN_PER_USER = 3;

    public const BODY_MAX = 1000;

    protected $fillable = ['category_id', 'title', 'body', 'quantity', 'city', 'status', 'expires_at'];

    protected function casts(): array
    {
        return ['expires_at' => 'datetime'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function responses(): HasMany
    {
        return $this->hasMany(WantedAdResponse::class);
    }

    /**
     * What the public may see: open, not expired, and written by an account
     * that is still there and not blocked. Every public query starts here.
     *
     * @param  Builder<WantedAd>  $query
     */
    public function scopeListed(Builder $query): void
    {
        $query
            ->where($query->qualifyColumn('status'), self::STATUS_OPEN)
            ->where($query->qualifyColumn('expires_at'), '>', now())
            ->whereHas('user', fn (Builder $user) => $user->whereNull('blocked_at'));
    }

    /** The same rule as the listed scope, for an ad already loaded. */
    public function isListed(): bool
    {
        return $this->status === self::STATUS_OPEN
            && $this->expires_at->isFuture()
            && $this->user !== null
            && $this->user->blocked_at === null;
    }

    /** First name only: the ad is public, the person behind it need not be. */
    public function authorName(): string
    {
        return Str::before(trim((string) $this->user?->name), ' ');
    }
}
