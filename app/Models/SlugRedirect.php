<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * A slug something used to have, and which record it belongs to now (see KeepsOldSlugs).
 *
 * @property int $id
 * @property string $model_type
 * @property string $old_slug
 * @property int $model_id
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class SlugRedirect extends Model
{
    protected $fillable = ['model_type', 'old_slug', 'model_id'];
}
