<?php

namespace Tests\Feature;

use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Schema;
use RuntimeException;
use Tests\SecurityTestCase;

class GoogleSubjectMigrationTest extends SecurityTestCase
{
    private function migration(): object
    {
        return require database_path('migrations/2026_11_02_000000_add_unique_google_id_to_users.php');
    }

    public function test_database_rejects_duplicate_non_null_google_subjects(): void
    {
        $this->user('student', ['google_id' => 'unique-subject']);
        $this->expectException(QueryException::class);
        $this->user('student', ['google_id' => 'unique-subject']);
    }

    public function test_multiple_unlinked_users_with_null_subject_are_allowed(): void
    {
        $this->user('student', ['google_id' => null]);
        $this->user('student', ['google_id' => null]);
        $this->assertDatabaseCount('users', 2);
    }

    public function test_migration_aborts_without_identifying_accounts_when_duplicates_exist(): void
    {
        $migration = $this->migration();
        $migration->down();
        $this->user('student', ['google_id' => 'sensitive-subject']);
        $this->user('student', ['google_id' => 'sensitive-subject']);
        try {
            $migration->up();
            $this->fail('Duplicate subjects must stop the migration.');
        } catch (RuntimeException $exception) {
            $this->assertSame(
                'Cannot add users.google_id unique index: duplicate non-null Google IDs exist. Resolve account ownership before retrying.',
                $exception->getMessage()
            );
        }
        $this->assertFalse(Schema::hasIndex('users', 'users_google_id_unique'));
        $this->assertDatabaseCount('users', 2);
    }

    public function test_unique_index_can_be_rolled_back_and_reapplied(): void
    {
        $migration = $this->migration();
        $migration->down();
        $this->assertFalse(Schema::hasIndex('users', 'users_google_id_unique'));
        $migration->up();
        $this->assertTrue(Schema::hasIndex('users', 'users_google_id_unique'));
    }
}
