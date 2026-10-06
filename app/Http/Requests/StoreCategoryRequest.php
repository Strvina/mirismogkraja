<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // gated by the 'role:admin' route middleware
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            // Two levels and no deeper: only a top-level category can be a parent.
            'parent_id' => ['nullable', Rule::exists('categories', 'id')->whereNull('parent_id')],
            'search_name' => ['nullable', 'string', 'max:255'],
            'intro' => ['nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return ['parent_id.exists' => __('Potkategorija ne može imati svoje potkategorije.')];
    }
}
