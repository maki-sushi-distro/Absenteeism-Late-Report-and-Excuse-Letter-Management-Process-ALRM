<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('google_id')->nullable()->after('id');
            $table->enum('role', ['administrator', 'program_head', 'instructor', 'student'])->nullable()->after('email');
            $table->unsignedBigInteger('program_id')->nullable()->after('role');
            $table->enum('status', ['approved', 'pending'])->nullable()->after('program_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['google_id', 'role', 'program_id', 'status']);
        });
    }
};
