<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    /** The tabs of the user list: everyone, one role, or the blocked. */
    private const GROUPS = ['all' => null, 'sellers' => 'seller', 'admins' => 'admin', 'blocked' => null];

    /**
     * Paged and searchable. Every account at once, with every column, grew
     * with the user base on every visit - and sent phone numbers and home
     * addresses the page never shows.
     */
    public function index(Request $request): Response
    {
        $search = $request->string('search')->trim()->toString();
        $group = $request->string('group')->toString();

        if (! array_key_exists($group, self::GROUPS)) {
            $group = 'all';
        }

        return Inertia::render('admin/users/index', [
            'users' => $this->inGroup(User::query(), $group)
                ->select(['id', 'name', 'email', 'avatar_path', 'blocked_at', 'created_at'])
                ->with('roles:id,name')
                ->withCount('producers')
                ->when($search, fn ($query) => $query->where(fn ($inner) => $inner
                    ->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")))
                ->orderBy('name')
                ->paginate(50)
                ->withQueryString(),
            'filters' => ['search' => $search ?: null, 'group' => $group],
            'counts' => collect(self::GROUPS)->map(fn (?string $role, string $key) => $this->inGroup(User::query(), $key)->count())->all(),
        ]);
    }

    /**
     * @param  Builder<User>  $query
     * @return Builder<User>
     */
    private function inGroup(Builder $query, string $group): Builder
    {
        return match ($group) {
            'blocked' => $query->whereNotNull('blocked_at'),
            'sellers', 'admins' => $query->whereHas('roles', fn (Builder $roles) => $roles->where('name', self::GROUPS[$group])),
            default => $query,
        };
    }

    public function updateRoles(Request $request, User $user): RedirectResponse
    {
        $data = $request->validate([
            'roles' => ['required', 'array'],
            'roles.*' => ['in:buyer,seller,admin'],
        ]);

        if ($user->is($request->user()) && ! in_array('admin', $data['roles'], true)) {
            throw ValidationException::withMessages(['roles' => __('Ne možeš sebi ukloniti admin rolu.')]);
        }

        $user->syncRoles($data['roles']);

        return back();
    }

    public function toggleBlock(Request $request, User $user): RedirectResponse
    {
        if ($user->is($request->user())) {
            throw ValidationException::withMessages(['user' => __('Ne možeš blokirati sopstveni nalog.')]);
        }

        $user->forceFill(['blocked_at' => $user->isBlocked() ? null : now()])->save();

        return back();
    }
}
