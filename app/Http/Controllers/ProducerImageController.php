<?php

namespace App\Http\Controllers;

use App\Models\Producer;
use App\Models\ProducerImage;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ProducerImageController extends Controller
{
    public function store(Request $request, Producer $producer): RedirectResponse
    {
        $this->authorize('update', $producer);

        $request->validate([
            'images' => ['required', 'array'],
            'images.*' => ['image', 'max:4096'],
            'captions' => ['nullable', 'array'],
            'captions.*' => ['nullable', 'string', 'max:255'],
        ]);

        $nextOrder = (int) $producer->images()->max('order') + ($producer->images()->exists() ? 1 : 0);

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
