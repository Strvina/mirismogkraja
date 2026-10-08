<?php

namespace App\Models;

use Database\Factories\FavoriteFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

/**
 * @property int $id
 * @property int $user_id
 * @property string $favoritable_type
 * @property int $favoritable_id
 * @property string $created_at
 * @property-read User|null $user
 * @property-read Producer|Product|null $favoritable
 */
class Favorite extends Model
{
    /** @use HasFactory<FavoriteFactory> */
    use HasFactory;

    /**
     * Favorites are only ever created or deleted, never updated - the table
     * has no updated_at column.
     */
    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'favoritable_id',
        'favoritable_type',
    ];

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return MorphTo<Model, $this> */
    public function favoritable(): MorphTo
    {
        return $this->morphTo();
    }
}
