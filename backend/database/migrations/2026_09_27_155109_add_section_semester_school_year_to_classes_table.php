<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('classes', function (Blueprint $table) {
            $table->string('section')->after('subject_name');
            $table->enum('semester', ['1st', '2nd'])->after('section');
            $table->string('school_year')->after('semester'); // format: '2025-2026'
        });
    }

    public function down(): void
    {
        Schema::table('classes', function (Blueprint $table) {
            $table->dropColumn(['section', 'semester', 'school_year']);
        });
    }
};