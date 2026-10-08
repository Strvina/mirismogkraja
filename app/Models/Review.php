<?php

namespace App\Models;

use App\Models\Concerns\CountsByStatus;
use Database\Factories\ReviewFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $user_id
 * @property int $producer_id
 * @property int $rating
 * @property string|null $comment
 * @property string|null $image_path
 * @property string $status
 * @property Carbon|null $approved_at
 * @property string|null $reply
 * @property Carbon|null $replied_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read User|null $user
 * @property-read Producer|null $producer
 */
class Review extends Model
{
    /** @use HasFactory<ReviewFactory> */
    use CountsByStatus, HasFactory;

    public const STATUS_PENDING = 'pending';

    public const STATUS_APPROVED = 'approved';

    public const STATUS_REJECTED = 'rejected';

    /** @var list<string> */
    public const STATUSES = [self::STATUS_PENDING, self::STATUS_APPROVED, self::STATUS_REJECTED];

    protected $fillable = [
        'user_id',
        'producer_id',
        'rating',
        'comment',
        'image_path',
        'status',
        'approved_at',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'replied_at' => 'datetime',
            'approved_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        // A deleted account's published review stays, under its anonymised name.
        return $this->belongsTo(User::class)->withTrashed();
    }

    /** @return BelongsTo<Producer, $this> */
    public function producer(): BelongsTo
    {
        return $this->belongsTo(Producer::class, 'producer_id');
    }

    /**
     * The only reviews the public may see. Every query that feeds a public
     * page - a producer's page, the catalog cards, the homepage ratings -
     * goes through this, so an unmoderated review can't leak by omission.
     *
     * @param  Builder<Review>  $query
     */
    public function scopeApproved(Builder $query): void
    {
        $query->where('status', self::STATUS_APPROVED);
    }

    /** @param  Builder<Review>  $query */
    public function scopePending(Builder $query): void
    {
        $query->where('status', self::STATUS_PENDING);
    }

    public function isApproved(): bool
    {
        return $this->status === self::STATUS_APPROVED;
    }

    /** When a moderator published it. The public date is created_at. */
    public function publishedAt(): ?Carbon
    {
        return $this->approved_at;
    }
}
