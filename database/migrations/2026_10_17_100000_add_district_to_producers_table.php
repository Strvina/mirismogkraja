<?php

use App\Support\Districts;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * The district a producer is in, so the lists can be narrowed by it. Worked
 * out from the town for the producers already here; a village stays empty
 * until its producer picks one.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('producers', function (Blueprint $table) {
            $table->string('district', 32)->nullable()->after('city')->index();
        });

        DB::table('producers')->whereNotNull('city')->orderBy('id')->select(['id', 'city'])->each(function (object $producer) {
            $district = Districts::forCity($producer->city);

            if ($district !== null) {
                DB::table('producers')->where('id', $producer->id)->update(['district' => $district]);
            }
        });
    }

    public function down(): void
    {
        Schema::table('producers', function (Blueprint $table) {
            $table->dropIndex(['district']);
            $table->dropColumn('district');
        });
    }
};
