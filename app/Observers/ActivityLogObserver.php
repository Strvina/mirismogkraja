<?php

namespace App\Observers;

use App\Models\ActivityLog;
use App\Models\Producer;
use App\Models\Product;
use App\Models\Review;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

/**
 * Records create/update/delete on the models it's registered for (task 14).
 * Registered per model in AppServiceProvider rather than globally, so noisy
 * writes (messages, message reads) stay out of the audit trail.
 */
class ActivityLogObserver
{
    /** Never store these, even when they change. */
    private const HIDDEN = ['password', 'remember_token'];

    public function created(Model $model): void
    {
        $this->record('created', $model);
    }

    public function updated(Model $model): void
    {
        $changes = collect($model->getChanges())
            ->except([...self::HIDDEN, 'updated_at'])
            ->map(fn ($value, string $key) => [
                'from' => $model->getOriginal($key),
                'to' => $value,
            ]);

        if ($changes->isEmpty()) {
            return;
        }

        $this->record('updated', $model, $changes->all());
    }

    public function deleted(Model $model): void
    {
        // Soft-deleted records are still there and can be restored, so the
        // trail has to say which of the two happened.
        $archived = method_exists($model, 'isForceDeleting') && ! $model->isForceDeleting();

        $this->record($archived ? 'archived' : 'deleted', $model);
    }

    public function restored(Model $model): void
    {
        $this->record('restored', $model);
    }

    /** Remove files which database cascades cannot remove. */
    public function deleting(Model $model): void
    {
        if ($model instanceof Review) {
            Storage::disk('public')->delete(array_filter([$model->image_path]));
        }

        if ($model instanceof Product) {
            Storage::disk('public')->delete($model->images()->pluck('path')->all());
        }

        if ($model instanceof Producer && $model->isForceDeleting()) {
            Storage::disk('public')->delete(array_filter([
                $model->cover_image_path,
                $model->logo_path,
                ...$model->images()->pluck('path')->all(),
                ...$model->products()->with('images')->get()->flatMap(fn (Product $product) => $product->images->pluck('path'))->all(),
                // Reviews go with the producer through a database cascade,
                // which fires no model events - so their photos have to be
                // swept up from here.
                ...$model->reviews()->whereNotNull('image_path')->pluck('image_path')->all(),
            ]));
        }
    }

    /** @param  array<string, mixed>|null  $changes */
    private function record(string $action, Model $model, ?array $changes = null): void
    {
        $user = Auth::user();

        ActivityLog::create([
            'user_id' => $user?->id,
            // Kept as text so the entry still reads correctly after the
            // account is renamed or removed.
            'user_name' => $user?->name ?? 'Sistem',
            'action' => $action,
            'subject_type' => class_basename($model),
            'subject_id' => $model->getKey(),
            'subject_label' => $model->name ?? $model->title ?? null,
            'changes' => $changes,
        ]);
    }
}
