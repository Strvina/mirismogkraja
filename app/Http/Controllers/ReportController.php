<?php

namespace App\Http\Controllers;

use App\Models\Report;
use App\Models\User;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ReportController extends Controller
{
    /**
     * Report a producer, a product or a user.
     *
     * The type arrives as a morph alias rather than a class name, so a
     * crafted request cannot name an arbitrary model; anything outside the
     * map is rejected by validation. A second report of the same thing by
     * the same person replaces the first, which keeps one angry evening from
     * filling the queue.
     */
    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'reportable_type' => ['required', Rule::in(['household', 'product', 'user'])],
            'reportable_id' => ['required', 'integer'],
            'reason' => ['required', Rule::in(array_keys(Report::REASONS))],
            'message' => ['nullable', 'string', 'max:1000'],
        ]);

        $model = Relation::getMorphedModel($data['reportable_type']);
        $reported = $model::findOrFail($data['reportable_id']);

        // Reporting yourself is not a complaint, it is noise.
        abort_if($reported instanceof User && $reported->is($request->user()), 403);

        Report::updateOrCreate(
            [
                'reported_by' => $request->user()->id,
                'reportable_type' => $data['reportable_type'],
                'reportable_id' => $reported->getKey(),
            ],
            [
                'reason' => $data['reason'],
                'message' => $data['message'] ?? null,
                'status' => Report::STATUS_OPEN,
                'reviewed_by' => null,
                'reviewed_at' => null,
            ],
        );

        return back()->with('status', 'Hvala. Prijava je poslata i neko će je pregledati.');
    }
}
