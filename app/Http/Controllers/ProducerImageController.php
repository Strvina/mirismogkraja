<?php

namespace App\Http\Controllers;

use App\Models\Producer;
use App\Models\ProducerImage;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ProducerImageController extends Controller
{
    /**
     * Every photo is sent to every visitor of the producer's page and kept
     * on disk for good, so the gallery has a ceiling.
     */
    public const MAX_IMAGES = 20;

    public function store(Request $request, Producer $producer): RedirectResponse
    {
        $this->authorize('update', $producer);

        $request->validate([
            'images' => ['required', 'array', 'max:'.max(0, self::MAX_IMAGES - $producer->images()->count())],
            'images.*' => ['image', 'max:4096'],
            'captions' => ['nullable', 'array'],
            'captions.*' => ['nullable', 'string', 'max:255'],
        ], [
            'images.max' => __('Galerija može imati najviše :max fotografija.', ['max' => self::MAX_IMAGES]),
        ]);

        $nextOrder = ($producer->images()->max('order') ?? -1) + 1;

        foreach ($request->file('images') as $index => $file) {
            $producer->images()->create([
                'path' => $file->store('producers/gallery', 'public'),
                'caption' => $request->input("captions.{$index}"),
                'order' => $nextOrder++,
            ]);
        }

        return back();
    }

    public function destroy(Producer $producer, ProducerImage $image): RedirectResponse
    {
        $this->authorize('update', $producer);

        abort_unless($image->household_id === $producer->id, 404);

        Storage::disk('public')->delete($image->path);
        $image->delete();

        return back();
    }
}
