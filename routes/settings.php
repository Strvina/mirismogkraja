<?php

use App\Http\Controllers\Settings\PasswordController;
use App\Http\Controllers\Settings\ProfileController;
use App\Http\Controllers\Settings\TwoFactorController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware('auth')->group(function () {
    Route::redirect('settings', 'settings/profile');

    Route::get('settings/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('settings/profile', [ProfileController::class, 'update'])->name('profile.update');
    // POST, not PATCH: PHP only parses a multipart body for POST requests,
    // so a PATCH upload arrives with no file at all - the browser sends it,
    // $_FILES stays empty, and validation rejects it as missing. The test
    // suite could not catch this because Laravel's test client hands the
    // file to the request directly instead of going through PHP's parser.
    Route::post('settings/profile/avatar', [ProfileController::class, 'updateAvatar'])->name('profile.avatar.update');
    // Both check the current password: limited like the login form.
    Route::delete('settings/profile', [ProfileController::class, 'destroy'])->middleware('throttle:6,1')->name('profile.destroy');

    Route::get('settings/password', [PasswordController::class, 'edit'])->name('password.edit');
    Route::put('settings/password', [PasswordController::class, 'update'])->middleware('throttle:6,1')->name('password.update');

    // Two-step sign-in. Each write checks the password or a code: limited
    // like the login form.
    Route::get('settings/two-factor', [TwoFactorController::class, 'edit'])->name('two-factor.edit');
    Route::get('settings/two-factor/qr.svg', [TwoFactorController::class, 'qr'])->middleware('throttle:30,1')->name('two-factor.qr');
    Route::post('settings/two-factor', [TwoFactorController::class, 'store'])->middleware('throttle:6,1')->name('two-factor.store');
    Route::post('settings/two-factor/confirm', [TwoFactorController::class, 'confirm'])->middleware('throttle:6,1')->name('two-factor.confirm');
    Route::post('settings/two-factor/recovery-codes', [TwoFactorController::class, 'regenerateRecoveryCodes'])->middleware('throttle:6,1')->name('two-factor.recovery-codes');
    Route::delete('settings/two-factor', [TwoFactorController::class, 'destroy'])->middleware('throttle:6,1')->name('two-factor.destroy');

    Route::get('settings/appearance', function () {
        return Inertia::render('settings/appearance');
    })->name('appearance');
});
