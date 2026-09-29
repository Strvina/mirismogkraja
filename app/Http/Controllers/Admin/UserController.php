<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    /**
     * Paged and searchable. Every account at once, with every column, grew
     * with the user base on every visit - and sent phone numbers and home
     * addresses the page never shows.
     */
    public function index(Request $request): Response
    {
        $search = $request->string('search')->trim()->toString();

        return Inertia::render('admin/users/index', [
            'users' => User::query()
                ->select(['id', 'name', 'email', 'blocked_at'])
                ->with('roles:id,name')
                ->when($search, fn ($query) => $query->where(fn ($inner) => $inner
                    ->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")))
                ->orderBy('name')
                ->paginate(50)
                ->withQueryString(),
            'filters' => ['search' => $search ?: null],
        ]);
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

        $user->update(['blocked_at' => $user->isBlocked() ? null : now()]);

        return back();
    }
}
