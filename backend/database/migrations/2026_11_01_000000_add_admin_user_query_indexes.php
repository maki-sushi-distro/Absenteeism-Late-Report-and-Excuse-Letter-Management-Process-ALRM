<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->index(['status', 'role', 'name'], 'users_admin_status_role_name_idx');
            $table->index(['program_id', 'status', 'name'], 'users_admin_program_status_name_idx');
            $table->index(['year_level', 'status', 'name'], 'users_admin_year_status_name_idx');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex('users_admin_status_role_name_idx');
            $table->dropIndex('users_admin_program_status_name_idx');
            $table->dropIndex('users_admin_year_status_name_idx');
        });
    }
};
