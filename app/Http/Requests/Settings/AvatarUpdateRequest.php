<?php

namespace App\Http\Requests\Settings;

use App\Support\Media;
use Illuminate\Foundation\Http\FormRequest;

class AvatarUpdateRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'avatar' => ['required', ...Media::imageRules(2048)],
        ];
    }
}
