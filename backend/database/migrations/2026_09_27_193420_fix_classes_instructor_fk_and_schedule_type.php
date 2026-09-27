<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('classes', function (Blueprint $table) {
            $table->dropForeign(['instructor_id']);
        });

        Schema::table('classes', function (Blueprint $table) {
            $table->string('section')->nullable()->change();
            $table->uuid('instructor_id')->nullable()->change();
            $table->json('schedule')->change();

            $table->foreign('instructor_id')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('classes', function (Blueprint $table) {
            $table->dropForeign(['instructor_id']);
        });

        Schema::table('classes', function (Blueprint $table) {
            $table->string('section')->nullable(false)->change();
            $table->uuid('instructor_id')->nullable(false)->change();
            $table->string('schedule')->change();

            $table->foreign('instructor_id')->references('id')->on('users')->cascadeOnDelete();
        });
    }
};