<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Producer;
use App\Models\Product;
use Inertia\Inertia;
use Inertia\Response;

class HomeController extends Controller
{
    /**
     * The landing page's showcase sections (tasks 5-7): real producers,
     * products and categories from the database instead of the hardcoded
     * placeholder arrays the ported Lovable design shipped with. Images
     * stay placeholders for now, per the task.
     */
    public function __invoke(): Response
    {
        return Inertia::render('welcome', [
            'producers' => Producer::query()
                ->where('status', 'active')
                ->with(['products' => fn ($query) => $query->where('status', 'active')->with('category:id,name')])
                ->latest()
                ->take(3)
                ->get()
                ->map(fn (Producer $producer) => [
                    'id' => $producer->id,
                    'name' => $producer->name,
                    'slug' => $producer->slug,
                    'city' => $producer->city,
                    'description' => $producer->description,
                    'tags' => $producer->products
                        ->pluck('category.name')
                        ->filter()
                        ->unique()
                        ->take(2)
                        ->values(),
                ]),

            'products' => Product::query()
                ->where('status', 'active')
                ->whereHas('producer', fn ($query) => $query->where('status', 'active'))
                ->with(['producer:id,name,city'])
                ->latest()
                ->take(4)
                ->get()
                ->map(fn (Product $product) => [
                    'id' => $product->id,
                    'name' => $product->name,
                    'slug' => $product->slug,
                    'city' => $product->producer->city,
                ]),

            'categories' => Category::query()
                ->whereHas('products', fn ($query) => $query->where('status', 'active')
                    ->whereHas('producer', fn ($producerQuery) => $producerQuery->where('status', 'active')))
                ->orderBy('name')
                ->take(6)
                ->get(['id', 'name']),
        ]);
    }
}
