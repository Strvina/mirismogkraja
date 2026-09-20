<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Producer;
use App\Models\Product;
use App\Models\User;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/dashboard', [
            'stats' => [
                'users' => User::count(),
                'producers' => Producer::count(),
                'products' => Product::count(),
                'orders' => Order::count(),
                // Self-reported by producers and unverified by the platform (task 17).
                'reportedValue' => (float) Order::whereIn('status', ['contacted', 'fulfilled'])->sum('total_price'),
            ],
        ]);
    }
}
