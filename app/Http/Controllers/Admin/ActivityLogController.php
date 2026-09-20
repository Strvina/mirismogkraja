<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ActivityLogController extends Controller
{
    public function index(Request $request): Response
    {
        $logs = ActivityLog::query()
            ->when($request->string('action')->toString(), fn ($query, $action) => $query->where('action', $action))
            ->when($request->string('subject')->toString(), fn ($query, $subject) => $query->where('subject_type', $subject))
            ->latest()
            ->latest('id')
            ->paginate(30)
            ->withQueryString();

        return Inertia::render('admin/logs/index', [
            'logs' => $logs,
            'subjects' => ActivityLog::query()->distinct()->orderBy('subject_type')->pluck('subject_type'),
            'filters' => $request->only(['action', 'subject']),
        ]);
    }
}
