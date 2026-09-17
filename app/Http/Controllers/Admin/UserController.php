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
    public function index(): Response
    {
        return Inertia::render('admin/users/index', [
            'users' => User::with('roles:id,name')->orderBy('name')->get(),
        ]);
    }

    public function updateRoles(Request $request, User $user): RedirectResponse
    {
        $data = $request->validate([
            'roles' => ['required', 'array'],
            'roles.*' => ['in:buyer,seller,admin'],
        ]);

        if ($user->is($request->user()) && ! in_array('admin', $data['roles'], true)) {
            throw ValidationException::withMessages(['roles' => 'Ne možeš sebi ukloniti admin rolu.']);
        }

        $user->syncRoles($data['roles']);

        return back();
    }

    public function toggleBlock(Request $request, User $user): RedirectResponse
    {
        if ($user->is($request->user())) {
            throw ValidationException::withMessages(['user' => 'Ne možeš blokirati sopstveni nalog.']);
        }

        $user->update(['blocked_at' => $user->isBlocked() ? null : now()]);

        return back();
    }
}
