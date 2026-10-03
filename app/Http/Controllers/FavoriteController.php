<?php

namespace App\Http\Controllers;

use App\Models\Favorite;
use App\Models\Producer;
use App\Models\Product;
use Illuminate\Database\Query\JoinClause;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class FavoriteController extends Controller
{
    /** Per list; each of the two pages on its own. */
    private const PER_PAGE = 24;

    /**
     * "Moji omiljeni": the authenticated user's favorited producers and
     * products, most recently saved first.
     *
     * Only what is still public: a saved producer that was later blocked, or
     * a product taken down, must not stay reachable through someone's list.
     * And only the columns the list shows - the full models carried phone
     * numbers, addresses and whole stories to a page that prints a name.
     */
    public function index(Request $request): Response
    {
        $userId = $request->user()->id;

        $savedBy = fn (string $type, string $table) => fn (JoinClause $join) => $join
            ->on('favorites.favoritable_id', '=', "{$table}.id")
            ->where('favorites.favoritable_type', $type)
            ->where('favorites.user_id', $userId);

        return Inertia::render('favorites/index', [
            'producers' => Producer::query()
                ->join('favorites', $savedBy('producer', 'producers'))
                ->published()
                ->orderByDesc('favorites.created_at')
                ->paginate(self::PER_PAGE, ['producers.id', 'producers.name', 'producers.slug', 'producers.city'], 'proizvodjaci'),
            'products' => Product::query()
                ->join('favorites', $savedBy('product', 'products'))
                ->published()
                ->orderByDesc('favorites.created_at')
                ->paginate(self::PER_PAGE, ['products.id', 'products.name', 'products.slug', 'products.price', 'products.unit'], 'proizvodi'),
        ]);
    }

    /**
     * Toggle a favorite on/off for the given producer or product.
     */
    public function toggle(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'favoritable_type' => ['required', 'in:producer,product'],
            'favoritable_id' => ['required', 'integer'],
        ]);

        $favoritable = $data['favoritable_type'] === 'producer'
            ? Producer::published()->findOrFail($data['favoritable_id'])
            : Product::published()->findOrFail($data['favoritable_id']);

        $favorite = $request->user()->favorites()
            ->where('favoritable_type', $data['favoritable_type'])
            ->where('favoritable_id', $data['favoritable_id'])
            ->first();

        if ($favorite) {
            $favorite->delete();
        } else {
            $request->user()->favorites()->create(['favoritable_type' => $data['favoritable_type'], 'favoritable_id' => $favoritable->id]);
        }

        return back();
    }
}
