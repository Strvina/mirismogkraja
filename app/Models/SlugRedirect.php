<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** A slug something used to have, and which record it belongs to now (see KeepsOldSlugs). */
class SlugRedirect extends Model
{
    protected $fillable = ['model_type', 'old_slug', 'model_id'];
}
