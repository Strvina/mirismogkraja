<?php

namespace App\Http\Requests;

use App\Models\Product;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProductRequest extends FormRequest
{
    /**
     * Price and stock, bounded by their columns - decimal(10,2) and an
     * unsigned integer. Past those MySQL refuses the write, which would
     * reach the owner as a server error instead of a message on the field.
     * Shared with the admin's quick edit.
     *
     * @return array<string, list<string>>
     */
    public static function amountRules(): array
    {
        return [
            'price' => ['required', 'numeric', 'min:0', 'max:99999999.99'],
            'stock_quantity' => ['required', 'integer', 'min:0', 'max:1000000'],
        ];
    }

    public function authorize(): bool
    {
        return $this->user()->can('create', [Product::class, $this->route('producer')]);
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'category_id' => ['required', 'exists:categories,id'],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            ...self::amountRules(),
            'unit' => ['required', 'in:kg,g,l,ml,kom,paket'],
            'status' => ['required', Rule::in(Product::OWNER_STATUSES)],
        ];
    }
}
