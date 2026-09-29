<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCategoryRequest;
use App\Http\Requests\UpdateCategoryRequest;
use App\Models\Category;
use App\Services\CategoryService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class CategoryController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/categories/index', [
            'categories' => Category::with('parent:id,name')->withCount('products')->orderBy('name')->get(),
        ]);
    }

    public function store(StoreCategoryRequest $request, CategoryService $categories): RedirectResponse
    {
        $categories->create($request->validated());

        return back();
    }

    public function update(UpdateCategoryRequest $request, Category $category, CategoryService $categories): RedirectResponse
    {
        $categories->update($category, $request->validated());

        return back();
    }

    /**
     * Subcategories are let go rather than deleted with it. Products are not
     * - every product must have a category, and the table enforces it - so
     * a category still in use has to be emptied first. Said as a message:
     * left to the database, it was a server error.
     */
    public function destroy(Category $category): RedirectResponse
    {
        $inUse = $category->products()->count();

        if ($inUse > 0) {
            throw ValidationException::withMessages([
                'category' => __('Kategorija „:name” ima proizvoda (:count). Prebacite ih u drugu kategoriju pa je obrišite.', ['name' => $category->name, 'count' => $inUse]),
            ]);
        }

        $category->children()->update(['parent_id' => null]);
        $category->delete();

        return back();
    }
}
