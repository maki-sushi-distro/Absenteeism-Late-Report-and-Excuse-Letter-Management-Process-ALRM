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
            $table->uuid('program_id')->nullable()->after('role');
            $table->string('school_student_id')->nullable()->unique()->after('program_id');
            $table->enum('status', ['approved', 'pending'])->nullable()->after('school_student_id');
            $table->string('password')->nullable()->change();
            $table->string('year_level')->nullable();
            $table->string('guardian_name')->nullable();
            $table->string('contact_number')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'google_id',
                'role',
                'program_id',
                'school_student_id',
                'status',
                'year_level',
                'guardian_name',
                'contact_number',
            ]);
            $table->string('password')->nullable(false)->change();
        });
    }
};
