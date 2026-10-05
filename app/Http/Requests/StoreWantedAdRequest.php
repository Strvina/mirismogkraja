<?php

namespace App\Http\Requests;

use App\Models\WantedAd;
use Illuminate\Foundation\Http\FormRequest;

class StoreWantedAdRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'min:5', 'max:120'],
            'body' => ['required', 'string', 'min:20', 'max:'.WantedAd::BODY_MAX],
            'category_id' => ['nullable', 'exists:categories,id'],
            'quantity' => ['nullable', 'string', 'max:60'],
            'city' => ['nullable', 'string', 'max:255'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'title.min' => __('Napišite u nekoliko reči šta tražite.'),
            'body.min' => __('Opišite malo detaljnije šta vam treba (najmanje :min znakova).'),
        ];
    }
}
