<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateProducerRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('producer'));
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
            'description' => ['nullable', 'string'],
            'address' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:255'],
            'delivery_methods' => ['nullable', 'array'],
            // Either one of Producer::DELIVERY_METHODS' keys or a producer's own wording.
            'delivery_methods.*' => ['string', 'max:60'],
            'cover_image' => ['nullable', 'image', 'max:4096'],
            'logo' => ['nullable', 'image', 'max:2048'],
        ];
    }
}
