<?php

namespace App\Http\Requests;

/**
 * The same fields as creating one; only who may send it differs.
 */
class UpdateProductRequest extends StoreProductRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('product'));
    }
}
