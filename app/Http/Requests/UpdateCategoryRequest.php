<?php

namespace App\Http\Requests;

use Illuminate\Validation\Rule;

class UpdateCategoryRequest extends StoreCategoryRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $category = $this->route('category');

        return [
            ...parent::rules(),
            'parent_id' => [
                'nullable',
                Rule::exists('categories', 'id')->whereNull('parent_id'),
                Rule::notIn([$category->id]),
                // Moving a category that has subcategories under another
                // would make a third level.
                Rule::prohibitedIf(fn () => $this->filled('parent_id') && $category->children()->exists()),
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            ...parent::messages(),
            'parent_id.prohibited' => __('Kategorija koja ima potkategorije ne može i sama postati potkategorija.'),
        ];
    }
}
