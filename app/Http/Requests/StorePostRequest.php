<?php

namespace App\Http\Requests;

use App\Models\Post;
use App\Support\Media;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePostRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('producer'));
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'type' => ['required', Rule::in(array_keys(Post::TYPES))],
            'title' => ['required', 'string', 'max:150'],
            'body' => ['required', 'string', 'min:'.Post::BODY_MIN, 'max:'.Post::BODY_MAX],
            'ingredients' => ['nullable', 'string', 'max:2000'],
            'cover_image' => ['nullable', ...Media::imageRules()],
            // One of this producer's own products, or none.
            'product_id' => ['nullable', Rule::exists('products', 'id')->where('producer_id', $this->route('producer')->id)],
            'status' => ['required', Rule::in($this->allowedStatuses())],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'body.min' => __('Napišite bar nekoliko rečenica (najmanje :min znakova).'),
        ];
    }

    /** @return list<string> */
    protected function allowedStatuses(): array
    {
        return Post::OWNER_STATUSES;
    }
}
