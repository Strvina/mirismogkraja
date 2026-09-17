<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCategoryRequest;
use App\Http\Requests\UpdateCategoryRequest;
use App\Models\Category;
use App\Services\CategoryService;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class CategoryController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/categories/index', [
            'categories' => Category::with('parent:id,name')->orderBy('name')->get(),
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

    public function destroy(Category $category): RedirectResponse
    {
        $category->update(['parent_id' => null]);
        $category->children()->update(['parent_id' => null]);
        $category->delete();

        return back();
    }
}
