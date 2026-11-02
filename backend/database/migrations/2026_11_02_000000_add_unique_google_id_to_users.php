<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $duplicatesExist = DB::table('users')->select('google_id')
            ->whereNotNull('google_id')->groupBy('google_id')
            ->havingRaw('COUNT(*) > 1')->exists();

        if ($duplicatesExist) {
            throw new RuntimeException(
                'Cannot add users.google_id unique index: duplicate non-null Google IDs exist. Resolve account ownership before retrying.'
            );
        }

        Schema::table('users', function (Blueprint $table) {
            $table->unique('google_id', 'users_google_id_unique');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique('users_google_id_unique');
        });
    }
};
