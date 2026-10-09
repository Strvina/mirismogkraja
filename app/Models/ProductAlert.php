<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Someone waiting to hear that a product is available again.
 *
 * @property int $id
 * @property int $user_id
 * @property int $product_id
 * @property Carbon $created_at
 * @property-read User|null $user
 * @property-read Product|null $product
 */
class ProductAlert extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = ['user_id', 'product_id'];

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<Product, $this> */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
