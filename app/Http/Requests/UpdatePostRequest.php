<?php

namespace App\Http\Requests;

use App\Models\Post;

class UpdatePostRequest extends StorePostRequest
{
    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [...parent::rules(), 'remove_cover' => ['nullable', 'boolean']];
    }

    /**
     * A post an administrator blocked stays blocked: its author can still
     * correct it, but only an administrator puts it back up.
     *
     * @return list<string>
     */
    protected function allowedStatuses(): array
    {
        return $this->route('post')?->status === Post::STATUS_BLOCKED ? [Post::STATUS_BLOCKED] : Post::OWNER_STATUSES;
    }
}
