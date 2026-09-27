<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (! Schema::hasColumn('users', 'program_id')) {
            Schema::table('users', function (Blueprint $table) {
                $table->foreignUuid('program_id')->nullable()->constrained('programs')->nullOnDelete();
            });

            return;
        }

        // Column already exists but may be the wrong type (bigint) from
        // a prior failed run — drop and recreate it correctly.
        if (! $this->foreignKeyExists('users', 'users_program_id_foreign')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('program_id');
            });

            Schema::table('users', function (Blueprint $table) {
                $table->foreignUuid('program_id')->nullable()->constrained('programs')->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if ($this->foreignKeyExists('users', 'users_program_id_foreign')) {
                $table->dropForeign(['program_id']);
            }

            if (Schema::hasColumn('users', 'program_id')) {
                $table->dropColumn('program_id');
            }
        });
    }

    private function foreignKeyExists(string $table, string $constraintName): bool
    {
        $result = DB::select(
            'SELECT COUNT(*) as count FROM information_schema.TABLE_CONSTRAINTS
             WHERE CONSTRAINT_SCHEMA = DATABASE()
             AND TABLE_NAME = ?
             AND CONSTRAINT_NAME = ?
             AND CONSTRAINT_TYPE = "FOREIGN KEY"',
            [$table, $constraintName]
        );

        return $result[0]->count > 0;
    }
};