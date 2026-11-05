<?php

namespace Tests\Feature;

use App\Models\Enrollment;
use App\Models\Program;
use App\Services\AcademicPeriod;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Schema;
use Tests\SecurityTestCase;

class SchoolIdNumberTest extends SecurityTestCase
{
    public function test_student_completion_saves_the_new_field_and_still_auto_enrolls(): void
    {
        $student = $this->user();
        $request = $this->requestFor($this->user());
        $class = $request->enrollment->class;
        $class->update(['semester' => AcademicPeriod::semester(), 'school_year' => AcademicPeriod::schoolYear()]);

        $response = $this->bearer($student)->postJson('/api/complete-profile', [
            'program_id' => $class->program_id, 'school_id_number' => '001-0023', 'year_level' => '1st',
        ])->assertOk()->assertJsonPath('data.school_id_number', '001-0023');
        $this->assertArrayNotHasKey('school_student_id', $response->json('data'));
        $this->assertSame('001-0023', $student->fresh()->school_id_number);
        $this->assertDatabaseHas('enrollments', ['student_id' => $student->id, 'class_id' => $class->id]);
        $this->bearer($student)->getJson('/api/me')->assertOk()->assertJsonPath('data.school_id_number', '001-0023');
        $this->bearer($student)->postJson('/api/complete-profile', [
            'program_id' => $class->program_id, 'school_id_number' => 'changed', 'year_level' => '2nd',
        ])->assertStatus(409);
        $this->assertSame('001-0023', $student->fresh()->school_id_number);
    }

    public function test_other_staff_roles_can_save_ids_without_year_levels_and_keep_existing_programs(): void
    {
        $oldProgram = Program::factory()->create();
        $newProgram = Program::factory()->create();
        foreach (['program_head', 'administrator'] as $role) {
            $staff = $this->user($role);
            $staff->programs()->attach($oldProgram);

            $this->bearer($staff)->postJson('/api/complete-profile', [
                'program_id' => $newProgram->id, 'school_id_number' => '000-'.$role,
            ])->assertOk()->assertJsonPath('data.school_id_number', '000-'.$role);
            $this->assertSame('000-'.$role, $staff->fresh()->school_id_number);
            $this->assertSame(2, $staff->programs()->count());
            $this->assertSame(0, Enrollment::where('student_id', $staff->id)->count());
            $this->assertSame($role, $staff->fresh()->role);

            // Existing clients may link programs without submitting a staff ID.
            $this->bearer($staff)->postJson('/api/complete-profile', [
                'program_id' => $oldProgram->id,
            ])->assertOk()->assertJsonPath('data.school_id_number', '000-'.$role);
        }
    }

    public function test_instructors_can_save_only_the_id_without_changing_direct_or_pivot_programs(): void
    {
        foreach (['direct', 'pivot', 'multiple'] as $assignment) {
            $program = Program::create(['program_name' => 'Assigned '.$assignment]);
            $instructor = $this->user('instructor', [
                'program_id' => $assignment === 'direct' ? $program->id : null,
            ]);
            if ($assignment !== 'direct') {
                $instructor->programs()->attach($program);
            }
            if ($assignment === 'multiple') {
                $instructor->programs()->attach(Program::create(['program_name' => 'Second assignment']));
            }
            $memberships = $instructor->programs()->pluck('programs.id')->all();

            $this->bearer($instructor)->postJson('/api/complete-profile', [
                'school_id_number' => 'FAC-'.$assignment,
            ])->assertOk()->assertJsonPath('data.school_id_number', 'FAC-'.$assignment);
            $this->assertSame($memberships, $instructor->programs()->pluck('programs.id')->all());
            $this->assertSame($assignment === 'direct' ? $program->id : null, $instructor->fresh()->program_id);
            $this->bearer($instructor)->getJson('/api/me')->assertOk()
                ->assertJsonPath('data.school_id_number', 'FAC-'.$assignment);

            $this->bearer($instructor)->postJson('/api/complete-profile', [
                'program_id' => $program->id,
            ])->assertOk()->assertJsonPath('data.school_id_number', 'FAC-'.$assignment);
            $this->assertSame($memberships, $instructor->programs()->pluck('programs.id')->all());

            $this->bearer($instructor)->postJson('/api/complete-profile', [
                'program_id' => Program::create(['program_name' => 'Unassigned '.$assignment])->id,
                'school_id_number' => 'CHANGED-'.$assignment,
            ])->assertUnprocessable()->assertJsonValidationErrors('program_id');
            $this->assertSame($memberships, $instructor->programs()->pluck('programs.id')->all());
            $this->assertSame('FAC-'.$assignment, $instructor->fresh()->school_id_number);
        }
    }

    public function test_instructor_completion_requires_an_id_and_an_initial_program(): void
    {
        $program = Program::factory()->create();
        $instructor = $this->user('instructor');
        foreach ([[], ['school_id_number' => null], ['school_id_number' => '']] as $fields) {
            $this->bearer($instructor)->postJson('/api/complete-profile', $fields + ['program_id' => $program->id])
                ->assertUnprocessable()->assertJsonValidationErrors('school_id_number');
        }
        $this->bearer($instructor)->postJson('/api/complete-profile', ['school_id_number' => 'FAC-NEW'])
            ->assertUnprocessable()->assertJsonValidationErrors('program_id');
        $this->assertSame(0, $instructor->programs()->count());

        $this->bearer($instructor)->postJson('/api/complete-profile', [
            'program_id' => $program->id, 'school_id_number' => 'FAC-NEW',
        ])->assertOk()->assertJsonPath('data.school_id_number', 'FAC-NEW');
        $this->assertSame([$program->id], $instructor->programs()->pluck('programs.id')->all());
        foreach ([null, ''] as $invalidId) {
            $this->bearer($instructor)->postJson('/api/complete-profile', ['school_id_number' => $invalidId])
                ->assertUnprocessable()->assertJsonValidationErrors('school_id_number');
        }
        $this->assertSame('FAC-NEW', $instructor->fresh()->school_id_number);
    }

    public function test_new_id_validation_requires_student_ids_and_rejects_duplicates_across_roles(): void
    {
        $program = Program::factory()->create();
        $student = $this->user();
        $payload = ['program_id' => $program->id, 'year_level' => '1st'];
        $this->bearer($student)->postJson('/api/complete-profile', $payload)
            ->assertUnprocessable()->assertJsonValidationErrors('school_id_number');

        $this->user('instructor', ['school_id_number' => 'EMP-001']);
        foreach (['EMP-001', str_repeat('a', 51), 1234] as $invalidId) {
            $this->bearer($student)->postJson('/api/complete-profile', $payload + ['school_id_number' => $invalidId])
                ->assertUnprocessable()->assertJsonValidationErrors('school_id_number');
        }
        $staff = $this->user('instructor', ['school_id_number' => 'EMP-002']);
        $this->bearer($staff)->postJson('/api/complete-profile', [
            'program_id' => $program->id, 'school_id_number' => 'EMP-002',
        ])->assertOk();
        $this->assertSame(0, $student->programs()->count());
    }

    public function test_users_are_created_with_the_current_id_field_and_database_uniqueness(): void
    {
        $user = $this->user('student', ['school_id_number' => '000-123']);
        $this->assertTrue(Schema::hasColumn('users', 'school_id_number'));
        $this->assertFalse(Schema::hasColumn('users', 'school_student_id'));
        $this->assertSame('000-123', $user->fresh()->school_id_number);

        $this->expectException(QueryException::class);
        $this->user('instructor', ['school_id_number' => '000-123']);
    }
}
