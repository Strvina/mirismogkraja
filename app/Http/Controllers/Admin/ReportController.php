<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Producer;
use App\Models\Product;
use App\Models\Report;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ReportController extends Controller
{
    public function index(Request $request): Response
    {
        $status = $request->string('status')->toString();

        if (! in_array($status, Report::STATUSES, true)) {
            $status = Report::STATUS_OPEN;
        }

        return Inertia::render('admin/reports/index', [
            'reports' => Report::with(['reporter:id,name', 'reportable'])
                ->where('status', $status)
                ->oldest()
                ->get()
                ->map(fn (Report $report) => [
                    'id' => $report->id,
                    'reason' => $report->reasonLabel(),
                    'message' => $report->message,
                    'status' => $report->status,
                    'created_at' => $report->created_at,
                    'reporter' => $report->reporter?->only(['id', 'name']),
                    'subject' => $this->describe($report),
                ]),
            'filters' => ['status' => $status],
            'counts' => collect(Report::STATUSES)
                ->mapWithKeys(fn (string $value) => [$value => Report::where('status', $value)->count()])
                ->all(),
        ]);
    }

    public function update(Request $request, Report $report): RedirectResponse
    {
        $data = $request->validate([
            'status' => ['required', 'in:'.implode(',', [Report::STATUS_REVIEWED, Report::STATUS_DISMISSED])],
        ]);

        $report->update([
            'status' => $data['status'],
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        return back();
    }

    /**
     * What was reported, in a shape the panel can render and link to without
     * knowing which kind of thing it is. A report outlives what it is about,
     * so a deleted subject has to read as deleted rather than crash the page.
     *
     * @return array{label: string, name: string, url: string|null}
     */
    private function describe(Report $report): array
    {
        $subject = $report->reportable;

        return match (true) {
            $subject instanceof Producer => [
                'label' => 'Proizvođač',
                'name' => $subject->name,
                'url' => route('marketplace.producers.show', $subject->slug),
            ],
            $subject instanceof Product => [
                'label' => 'Proizvod',
                'name' => $subject->name,
                'url' => route('marketplace.products.show', $subject->slug),
            ],
            $subject instanceof User => [
                'label' => 'Korisnik',
                'name' => $subject->name,
                'url' => route('admin.users.index'),
            ],
            default => ['label' => 'Obrisano', 'name' => '—', 'url' => null],
        };
    }
}
