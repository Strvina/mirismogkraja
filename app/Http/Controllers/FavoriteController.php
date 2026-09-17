<?php

namespace App\Http\Controllers;

use App\Models\Favorite;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class FavoriteController extends Controller
{
    /**
     * "Moji omiljeni": the authenticated user's favorited households and products.
     */
    public function index(Request $request): Response
    {
        $favorites = $request->user()->favorites()->with('favoritable')->latest()->get();

        return Inertia::render('favorites/index', [
            'households' => $favorites->where('favoritable_type', 'household')->pluck('favoritable')->filter()->values(),
            'products' => $favorites->where('favoritable_type', 'product')->pluck('favoritable')->filter()->values(),
        ]);
    }

    /**
     * Toggle a favorite on/off for the given household or product.
     */
    public function toggle(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'favoritable_type' => ['required', 'in:household,product'],
            'favoritable_id' => ['required', 'integer'],
        ]);

        $favorite = $request->user()->favorites()
            ->where('favoritable_type', $data['favoritable_type'])
            ->where('favoritable_id', $data['favoritable_id'])
            ->first();

        if ($favorite) {
            $favorite->delete();
        } else {
            Favorite::create([
                'user_id' => $request->user()->id,
                'favoritable_type' => $data['favoritable_type'],
                'favoritable_id' => $data['favoritable_id'],
            ]);
        }

        return back();
    }
}
