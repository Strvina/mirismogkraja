<?php

namespace App\Services;

use App\Models\Household;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class HouseholdService
{
    /**
     * Create a new household owned by the given user, generating a unique slug from its name.
     *
     * @param  array<string, mixed>  $attributes
     */
    public function create(User $user, array $attributes, ?UploadedFile $coverImage = null, ?UploadedFile $logo = null): Household
    {
        $household = $user->households()->create([
            ...$attributes,
            'slug' => $this->uniqueSlug($attributes['name']),
        ]);

        if ($coverImage) {
            $household->cover_image_path = $coverImage->store('households/covers', 'public');
        }

        if ($logo) {
            $household->logo_path = $logo->store('households/logos', 'public');
        }

        if ($coverImage || $logo) {
            $household->save();
        }

        return $household;
    }

    /**
     * Update a household's attributes, regenerating its slug if the name changed.
     *
     * @param  array<string, mixed>  $attributes
     */
    public function update(Household $household, array $attributes, ?UploadedFile $coverImage = null, ?UploadedFile $logo = null): Household
    {
        if ($attributes['name'] !== $household->name) {
            $attributes['slug'] = $this->uniqueSlug($attributes['name'], ignore: $household);
        }

        $household->fill($attributes);

        if ($coverImage) {
            $this->replaceImage($household, 'cover_image_path', $coverImage, 'households/covers');
        }

        if ($logo) {
            $this->replaceImage($household, 'logo_path', $logo, 'households/logos');
        }

        $household->save();

        return $household;
    }

    private function replaceImage(Household $household, string $column, UploadedFile $file, string $directory): void
    {
        if ($household->{$column}) {
            Storage::disk('public')->delete($household->{$column});
        }

        $household->{$column} = $file->store($directory, 'public');
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
