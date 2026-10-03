<?php

namespace App\Http\Requests;

use App\Models\Product;
use Illuminate\Validation\Rule;

/**
 * The same fields as creating one; only who may send it differs.
 */
class UpdateProductRequest extends StoreProductRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('product'));
    }

    /**
     * A product an administrator blocked stays blocked: its owner can still
     * correct it, but only an administrator puts it back up.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $rules = parent::rules();

        if ($this->route('product')?->status === Product::STATUS_BLOCKED) {
            $rules['status'] = ['required', Rule::in([Product::STATUS_BLOCKED])];
        }

        return $rules;
    }
}
