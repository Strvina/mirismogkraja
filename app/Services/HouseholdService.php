<?php

namespace App\Services;

use App\Models\Household;
use App\Models\User;
use Illuminate\Support\Str;

class HouseholdService
{
    /**
     * Create a new household owned by the given user, generating a unique slug from its name.
     *
     * @param  array<string, mixed>  $attributes
     */
    public function create(User $user, array $attributes): Household
    {
        return $user->households()->create([
            ...$attributes,
            'slug' => $this->uniqueSlug($attributes['name']),
        ]);
    }

    /**
     * Update a household's attributes, regenerating its slug if the name changed.
     *
     * @param  array<string, mixed>  $attributes
     */
    public function update(Household $household, array $attributes): Household
    {
        if ($attributes['name'] !== $household->name) {
            $attributes['slug'] = $this->uniqueSlug($attributes['name'], ignore: $household);
        }

        $household->update($attributes);

        return $household;
    }

    private function uniqueSlug(string $name, ?Household $ignore = null): string
    {
        $base = Str::slug($name);
        $slug = $base;
        $suffix = 1;

        while (
            Household::where('slug', $slug)
                ->when($ignore, fn ($query) => $query->whereKeyNot($ignore))
                ->exists()
        ) {
            $slug = "{$base}-{$suffix}";
            $suffix++;
        }

        return $slug;
    }
}
