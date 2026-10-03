<?php

namespace App\Http\Requests;

use App\Models\Producer;
use App\Support\Media;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreProducerRequest extends FormRequest
{
    /** Digits, a leading +, and the usual separators - "+381 64 123 4567", "011/123-456". */
    public const PHONE_RULE = 'regex:/^\+?[0-9][0-9 ()\/.-]{4,28}$/';

    /** Shared with the admin's edit form, which writes the same column. */
    public const DESCRIPTION_MAX = 5000;

    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can('create', Producer::class);
    }

    /**
     * An empty checkbox group is absent from multipart form data, so treat
     * that as "no delivery methods" instead of leaving the old ones in place.
     */
    protected function prepareForValidation(): void
    {
        $this->mergeIfMissing(['delivery_methods' => []]);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            // Bounded, since both are sent to every visitor of the page.
            'description' => ['nullable', 'string', 'max:'.self::DESCRIPTION_MAX],
            'story' => ['nullable', 'string', 'max:10000'],
            'address' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', self::PHONE_RULE],
            'contact_email' => ['nullable', 'email', 'max:255'],
            'delivery_methods' => ['nullable', 'array'],
            // Either one of Producer::DELIVERY_METHODS' keys or a producer's own wording.
            'delivery_methods.*' => ['string', 'max:60'],
            // A point on the map, or none - never half of one.
            'lat' => ['nullable', 'numeric', 'between:-90,90', 'required_with:lng'],
            'lng' => ['nullable', 'numeric', 'between:-180,180', 'required_with:lat'],
            'cover_image' => ['nullable', ...Media::imageRules()],
            'logo' => ['nullable', ...Media::imageRules(2048)],
            ...$this->productRules(),
        ];
    }

    /**
     * The first products, entered in the sign-up wizard alongside the
     * producer. Optional; a producer adds the rest from their own page.
     *
     * @return array<string, mixed>
     */
    protected function productRules(): array
    {
        return [
            'products' => ['nullable', 'array', 'max:20'],
            'products.*.name' => ['required', 'string', 'max:255'],
            'products.*.category_id' => ['required', 'exists:categories,id'],
            'products.*.price' => StoreProductRequest::amountRules()['price'],
            'products.*.unit' => ['required', 'in:kg,g,l,ml,kom,paket'],
            'products.*.stock_quantity' => StoreProductRequest::amountRules()['stock_quantity'],
            'products.*.image' => ['nullable', ...Media::imageRules()],
        ];
    }
}
