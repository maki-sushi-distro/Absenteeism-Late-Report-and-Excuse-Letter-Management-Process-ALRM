<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('audit_log', function (Blueprint $table) {
            $table->index(['action', 'table_affected', 'timestamp'], 'audit_log_action_table_timestamp_idx');
            $table->index(['table_affected', 'record_id'], 'audit_log_table_record_idx');
            $table->index(['user_id', 'timestamp'], 'audit_log_user_timestamp_idx');
        });

        Schema::table('classes', function (Blueprint $table) {
            $table->index(['program_id', 'year_level', 'semester'], 'classes_program_year_semester_idx');
            $table->index(['instructor_id', 'program_id'], 'classes_instructor_program_idx');
        });
    }

    public function down(): void
    {
        Schema::table('audit_log', function (Blueprint $table) {
            $table->dropIndex('audit_log_action_table_timestamp_idx');
            $table->dropIndex('audit_log_table_record_idx');
            $table->dropIndex('audit_log_user_timestamp_idx');
        });

        Schema::table('classes', function (Blueprint $table) {
            $table->dropIndex('classes_program_year_semester_idx');
            $table->dropIndex('classes_instructor_program_idx');
        });
    }
};
