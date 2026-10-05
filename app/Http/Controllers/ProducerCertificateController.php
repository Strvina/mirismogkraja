<?php

namespace App\Http\Controllers;

use App\Models\Producer;
use App\Models\ProducerCertificate;
use App\Notifications\SiteNotification;
use App\Support\Admins;
use App\Support\Media;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * A producer's certificates: sent in with the document, shown on the public
 * page once an admin has checked it (see Admin\CertificateController).
 */
class ProducerCertificateController extends Controller
{
    public function index(Producer $producer): Response
    {
        $this->authorize('update', $producer);

        return Inertia::render('producers/certificates', [
            'producer' => $producer->only(['id', 'name', 'slug']),
            'certificates' => $producer->certificates()
                ->latest()
                ->get(['id', 'producer_id', 'type', 'title', 'issuer', 'issued_on', 'expires_on', 'status', 'rejection_reason', 'created_at'])
                ->each(fn (ProducerCertificate $certificate) => $certificate->setAttribute('expired', $certificate->isExpired())),
            'types' => array_map(__(...), ProducerCertificate::TYPES),
            'limit' => ProducerCertificate::MAX_PER_PRODUCER,
            'maxMegabytes' => ProducerCertificate::MAX_KILOBYTES / 1024,
        ]);
    }

    public function store(Request $request, Producer $producer): RedirectResponse
    {
        $this->authorize('update', $producer);

        if ($producer->certificates()->count() >= ProducerCertificate::MAX_PER_PRODUCER) {
            throw ValidationException::withMessages([
                'file' => __('Možete poslati najviše :max dokumenata. Obrišite neki koji više ne važi.', ['max' => ProducerCertificate::MAX_PER_PRODUCER]),
            ]);
        }

        $data = $request->validate([
            'type' => ['required', Rule::in(array_keys(ProducerCertificate::TYPES))],
            'title' => ['required', 'string', 'max:120'],
            'issuer' => ['nullable', 'string', 'max:120'],
            'issued_on' => ['nullable', 'date', 'before_or_equal:today'],
            'expires_on' => ['nullable', 'date', 'after:today'],
            'file' => [
                'required',
                'file',
                // By content, not by the name the browser sent.
                'mimes:pdf,jpg,jpeg,png,webp',
                'max:'.ProducerCertificate::MAX_KILOBYTES,
                // A photographed page is an image like any other upload.
                Rule::when(
                    fn () => str_starts_with((string) $request->file('file')?->getMimeType(), 'image/'),
                    ['dimensions:max_width='.Media::MAX_SIDE.',max_height='.Media::MAX_SIDE],
                ),
            ],
        ], [
            'expires_on.after' => __('Dokument kome je rok istekao ne možemo da prikažemo.'),
            'file.mimes' => __('Pošaljite PDF ili fotografiju dokumenta (JPG, PNG, WebP).'),
        ]);

        // Under a random name: the path never says whose document it is.
        $path = $request->file('file')->store("certificates/{$producer->id}", ProducerCertificate::DISK);

        $certificate = $producer->certificates()->create([
            ...collect($data)->except('file')->all(),
            'file_path' => $path,
            'status' => ProducerCertificate::STATUS_PENDING,
        ]);

        Admins::notify(SiteNotification::forAdmins('certificate-pending', [
            'producer' => $producer->name,
            'title' => $certificate->title,
        ], route('admin.certificates.index')));

        return back();
    }

    /**
     * The document itself - for its producer and for an admin, nobody else.
     * Always as a download: an uploaded file is never opened as a page on
     * the site's own address.
     */
    public function file(Request $request, Producer $producer, ProducerCertificate $certificate): StreamedResponse
    {
        abort_unless($certificate->producer_id === $producer->id, 404);
        abort_unless($request->user()->id === $producer->user_id || $request->user()->hasRole('admin'), 403);
        abort_unless(Storage::disk(ProducerCertificate::DISK)->exists($certificate->file_path), 404);

        return Storage::disk(ProducerCertificate::DISK)->download(
            $certificate->file_path,
            Str::slug($certificate->title ?: 'sertifikat').'.'.$certificate->extension(),
        );
    }

    public function destroy(Producer $producer, ProducerCertificate $certificate): RedirectResponse
    {
        $this->authorize('update', $producer);
        abort_unless($certificate->producer_id === $producer->id, 404);

        $certificate->delete();

        return back();
    }
}
