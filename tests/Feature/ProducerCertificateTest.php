<?php

namespace Tests\Feature;

use App\Http\Middleware\ThrottlePerRoute;
use App\Models\Producer;
use App\Models\ProducerCertificate;
use App\Models\User;
use App\Support\NotificationText;
use Database\Seeders\RolesSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ProducerCertificateTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake(ProducerCertificate::DISK);
        Storage::fake('public');

        $this->seed(RolesSeeder::class);
        $this->admin = User::factory()->create();
        $this->admin->assignRole('admin');
    }

    private function pdf(string $name = 'sertifikat.pdf'): UploadedFile
    {
        return UploadedFile::fake()->createWithContent($name, "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n");
    }

    /** @return array<string, mixed> */
    private function submission(array $overrides = []): array
    {
        return [
            'type' => 'organic',
            'title' => 'Sertifikat za organsku proizvodnju meda',
            'issuer' => 'Organic Control System',
            'issued_on' => now()->subMonths(2)->toDateString(),
            'expires_on' => now()->addYear()->toDateString(),
            'file' => $this->pdf(),
            ...$overrides,
        ];
    }

    private function certificate(Producer $producer, array $attributes = []): ProducerCertificate
    {
        $path = $this->pdf()->store("certificates/{$producer->id}", ProducerCertificate::DISK);

        return $producer->certificates()->create(['type' => 'organic', 'title' => 'Organski med', 'file_path' => $path, 'status' => 'pending', ...$attributes]);
    }

    /** @return list<string> */
    private function typesFor(User $user): array
    {
        return $user->notifications()->get()->pluck('data.type')->all();
    }

    public function test_a_producer_sends_a_document_which_waits_for_an_admin_in_private(): void
    {
        $producer = Producer::factory()->active()->create();

        $this->actingAs($producer->user)
            ->post(route('producers.certificates.store', $producer), $this->submission())
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $certificate = $producer->certificates()->sole();
        $this->assertSame(ProducerCertificate::STATUS_PENDING, $certificate->status);

        // On the private disk, under a name that is not the one it was sent with.
        Storage::disk(ProducerCertificate::DISK)->assertExists($certificate->file_path);
        Storage::disk('public')->assertMissing($certificate->file_path);
        $this->assertStringNotContainsString('sertifikat', $certificate->file_path);

        $this->assertContains('admin.certificate-pending', $this->typesFor($this->admin));

        // Nothing public until it has been checked.
        $this->get(route('marketplace.producers.show', $producer->slug))
            ->assertInertia(fn ($page) => $page->where('certificates', []));

        $this->actingAs($producer->user)->get(route('producers.certificates.index', $producer))
            ->assertInertia(fn ($page) => $page
                ->component('producers/certificates')
                ->where('certificates.0.status', 'pending')
                ->missing('certificates.0.file_path'));
    }

    public function test_an_approved_certificate_shows_on_the_profile_without_its_document(): void
    {
        $producer = Producer::factory()->active()->create();
        $certificate = $this->certificate($producer, ['expires_on' => now()->addMonths(6)->toDateString()]);

        $this->actingAs($this->admin)->patch(route('admin.certificates.approve', $certificate))->assertRedirect();
        // A stray second click tells the producer nothing new.
        $this->actingAs($this->admin)->patch(route('admin.certificates.approve', $certificate));

        $certificate->refresh();
        $this->assertSame(ProducerCertificate::STATUS_APPROVED, $certificate->status);
        $this->assertSame($this->admin->id, $certificate->reviewed_by);
        $this->assertSame(1, collect($this->typesFor($producer->user))->filter(fn ($type) => $type === 'certificate.approved')->count());

        $this->app['auth']->forgetGuards();

        $this->get(route('marketplace.producers.show', $producer->slug))
            ->assertInertia(fn ($page) => $page
                ->has('certificates', 1)
                ->where('certificates.0.title', 'Organski med')
                ->where('certificates.0.type_label', 'Organska proizvodnja')
                ->where('certificates.0.expires_on', now()->addMonths(6)->toDateString())
                ->missing('certificates.0.file_path')
                ->missing('certificates.0.status'));
    }

    public function test_a_certificate_past_its_date_drops_off_the_profile(): void
    {
        $producer = Producer::factory()->active()->create();
        $this->certificate($producer, ['status' => 'approved', 'expires_on' => now()->addDay()->toDateString()]);

        $this->get(route('marketplace.producers.show', $producer->slug))->assertInertia(fn ($page) => $page->has('certificates', 1));

        $this->travel(3)->days();

        $this->get(route('marketplace.producers.show', $producer->slug))->assertInertia(fn ($page) => $page->has('certificates', 0));
    }

    public function test_turning_one_down_needs_a_reason_which_the_producer_is_told(): void
    {
        $producer = Producer::factory()->active()->create();
        $certificate = $this->certificate($producer, ['status' => 'approved']);

        $this->actingAs($this->admin)->patch(route('admin.certificates.reject', $certificate), ['reason' => ''])->assertSessionHasErrors('reason');
        $this->actingAs($this->admin)->patch(route('admin.certificates.reject', $certificate), ['reason' => 'Dokument je nečitak.'])->assertSessionHasNoErrors();

        $this->assertSame(ProducerCertificate::STATUS_REJECTED, $certificate->refresh()->status);

        $notification = $producer->user->notifications()->get()->firstWhere('data.type', 'certificate.rejected');
        $this->assertSame('„Organski med”: Dokument je nečitak.', NotificationText::for($notification->data)['body']);

        $this->app['auth']->forgetGuards();
        $this->get(route('marketplace.producers.show', $producer->slug))->assertInertia(fn ($page) => $page->has('certificates', 0));
    }

    public function test_the_document_is_for_its_producer_and_admins_only(): void
    {
        $producer = Producer::factory()->active()->create();
        $certificate = $this->certificate($producer, ['status' => 'approved', 'title' => 'Organski med']);
        $other = Producer::factory()->active()->create();
        $url = route('producers.certificates.file', [$producer, $certificate]);

        $this->get($url)->assertRedirect(route('login'));
        $this->actingAs($other->user)->get($url)->assertForbidden();
        // Nor through the address of a producer of their own.
        $this->actingAs($other->user)->get(route('producers.certificates.file', [$other, $certificate]))->assertNotFound();

        $this->actingAs($producer->user)->get($url)
            ->assertOk()
            ->assertHeader('Content-Disposition', 'attachment; filename=organski-med.pdf');
        $this->actingAs($this->admin)->get($url)->assertOk();
    }

    public function test_only_documents_are_accepted(): void
    {
        // More attempts than the route allows a person in a minute.
        $this->withoutMiddleware(ThrottlePerRoute::class);

        $producer = Producer::factory()->active()->create();
        $this->actingAs($producer->user);
        $send = fn (array $overrides) => $this->post(route('producers.certificates.store', $producer), $this->submission($overrides));

        // A page or a script under a document's name is told by its content.
        // A real file here, not a fake: a fake is typed by its name, and the
        // point is that a real one is typed by what is in it.
        $disguised = tempnam(sys_get_temp_dir(), 'cert');
        file_put_contents($disguised, '<html><body><script>alert(1)</script></body></html>');
        $send(['file' => new UploadedFile($disguised, 'sertifikat.pdf', 'application/pdf', null, true)])->assertSessionHasErrors('file');
        $send(['file' => UploadedFile::fake()->createWithContent('pecat.svg', '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')])->assertSessionHasErrors('file');
        $send(['file' => UploadedFile::fake()->create('veliki.pdf', ProducerCertificate::MAX_KILOBYTES + 1, 'application/pdf')])->assertSessionHasErrors('file');
        $send(['file' => null])->assertSessionHasErrors('file');
        $send(['type' => 'izmisljen'])->assertSessionHasErrors('type');
        $send(['title' => ''])->assertSessionHasErrors('title');
        $send(['expires_on' => now()->subDay()->toDateString()])->assertSessionHasErrors('expires_on');
        $send(['issued_on' => now()->addDay()->toDateString()])->assertSessionHasErrors('issued_on');

        $this->assertDatabaseCount('producer_certificates', 0);

        // A photographed page is fine.
        $send(['file' => $this->fakeImage('sertifikat.png')])->assertSessionHasNoErrors();
        $this->assertDatabaseCount('producer_certificates', 1);
    }

    public function test_the_list_has_a_ceiling(): void
    {
        $producer = Producer::factory()->active()->create();

        foreach (range(1, ProducerCertificate::MAX_PER_PRODUCER) as $ignored) {
            $this->certificate($producer);
        }

        $this->actingAs($producer->user)
            ->post(route('producers.certificates.store', $producer), $this->submission())
            ->assertSessionHasErrors('file');
    }

    public function test_deleting_takes_the_document_with_it(): void
    {
        $producer = Producer::factory()->active()->create();
        $first = $this->certificate($producer);
        $second = $this->certificate($producer);

        $this->actingAs(User::factory()->create())->delete(route('producers.certificates.destroy', [$producer, $first]))->assertForbidden();
        $this->actingAs($producer->user)->delete(route('producers.certificates.destroy', [$producer, $first]))->assertRedirect();

        Storage::disk(ProducerCertificate::DISK)->assertMissing($first->file_path);
        Storage::disk(ProducerCertificate::DISK)->assertExists($second->file_path);

        // An archived producer's documents are not kept on file.
        $producer->delete();

        Storage::disk(ProducerCertificate::DISK)->assertMissing($second->file_path);
        $this->assertDatabaseCount('producer_certificates', 0);
    }

    public function test_only_admins_reach_the_queue(): void
    {
        $producer = Producer::factory()->active()->create();
        $certificate = $this->certificate($producer);

        $this->actingAs($producer->user)->get(route('admin.certificates.index'))->assertForbidden();
        $this->actingAs($producer->user)->patch(route('admin.certificates.approve', $certificate))->assertForbidden();
        $this->actingAs($producer->user)->patch(route('admin.certificates.reject', $certificate), ['reason' => 'x'])->assertForbidden();
        $this->assertSame(ProducerCertificate::STATUS_PENDING, $certificate->refresh()->status);

        $this->actingAs($this->admin)->get(route('admin.certificates.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('admin/certificates/index')
                ->where('counts.pending', 1)
                ->where('certificates.data.0.producer.name', $producer->name)
                ->missing('certificates.data.0.file_path'));
    }
}
