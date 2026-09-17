<?php

namespace App\Http\Controllers;

use App\Models\Favorite;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class FavoriteController extends Controller
{
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
