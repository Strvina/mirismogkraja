<?php

namespace App\Models\Concerns;

use App\Models\SlugRedirect;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Exceptions\HttpResponseException;

/**
 * A renamed product, producer or campaign gets a new slug; the old address
 * - already in search results and in links people shared - answers with a
 * permanent redirect to the new one instead of a 404.
 */
trait KeepsOldSlugs
{
    public static function bootKeepsOldSlugs(): void
    {
        // "updated" still sees the slug as it was before the save.
        static::updated(function (Model $model) {
            $old = $model->getOriginal('slug');

            if ($model->wasChanged('slug') && filled($old)) {
                SlugRedirect::updateOrCreate(
                    ['model_type' => $model->getMorphClass(), 'old_slug' => $old],
                    ['model_id' => $model->getKey()],
                );
            }
        });
    }

    public function resolveRouteBinding($value, $field = null)
    {
        return parent::resolveRouteBinding($value, $field) ?? $this->redirectFromOldSlug($value, $field);
    }

    public function resolveSoftDeletableRouteBinding($value, $field = null)
    {
        return parent::resolveSoftDeletableRouteBinding($value, $field) ?? $this->redirectFromOldSlug($value, $field);
    }

    /** Throws the redirect when $value is a slug this model used to have; null otherwise (a 404). */
    private function redirectFromOldSlug(mixed $value, ?string $field): null
    {
        $request = request();

        // Only a page visit: a form posted to an old address would be
        // turned into a GET by the redirect and lose what it carried.
        if ($field !== 'slug' || ! is_string($value) || ! $request->isMethod('GET')) {
            return null;
        }

        $id = SlugRedirect::query()
            ->where('model_type', $this->getMorphClass())
            ->where('old_slug', $value)
            ->value('model_id');

        $current = $id === null ? null : static::query()->whereKey($id)->value('slug');

        if ($current === null || $current === $value) {
            return null;
        }

        $segments = explode('/', $request->path());
        $segments[array_search($value, $segments, true)] = $current;
        $query = $request->getQueryString();

        throw new HttpResponseException(redirect(url(implode('/', $segments)).($query ? "?{$query}" : ''), 301));
    }
}
