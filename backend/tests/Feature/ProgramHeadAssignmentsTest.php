<?php

namespace Tests\Feature;

use App\Models\Program;
use Tests\SecurityTestCase;

class ProgramHeadAssignmentsTest extends SecurityTestCase
{
    public function test_two_co_heads_can_read_bs_is_accounts_without_access_to_other_programs(): void
    {
        $primary = $this->user('program_head');
        $program = Program::factory()->create(['program_head_id' => $primary->id]);
        $heads = [$this->user('program_head'), $this->user('instructor')];
        $student = $this->user('student', ['program_id' => $program->id]);
        $outsider = $this->user('student');
        $ownRequest = $this->requestFor($student);
        $ownRequest->enrollment->class->update(['program_id' => $program->id]);
        $instructor = $ownRequest->enrollment->class->instructor;
        $otherRequest = $this->requestFor($outsider);
        $unrelated = $this->user('instructor');

        $this->artisan('alrm:assign-program-heads', ['program' => $program->id, 'users' => array_map(fn ($head) => $head->id, $heads)])->assertSuccessful();
        $this->assertSame($primary->id, $program->fresh()->program_head_id);
        $this->assertSame('instructor', $unrelated->fresh()->role);

        foreach ($heads as $head) {
            $head = $head->fresh();
            $this->assertSame('program_head', $head->role);
            $this->bearer($head)->getJson('/api/me')->assertOk()->assertJsonPath('data.heads_program', true);
            $this->bearer($head)->getJson('/api/program-head/dashboard')->assertOk()
                ->assertJsonPath('data.total_students', 1)->assertJsonPath('data.total_instructors', 1);
            $this->bearer($head)->getJson('/api/program-head/students')->assertOk()
                ->assertJsonFragment(['id' => $student->id])->assertJsonMissing(['id' => $outsider->id]);
            $this->bearer($head)->getJson('/api/program-head/instructors')->assertOk()
                ->assertJsonFragment(['id' => $instructor->id])->assertJsonMissing(['id' => $unrelated->id]);
            $this->bearer($head)->getJson('/api/program-head/requests')->assertOk()
                ->assertJsonFragment(['id' => $ownRequest->id])->assertJsonMissing(['id' => $otherRequest->id]);
            $this->assertTrue($head->can('view', $ownRequest));
            $this->assertFalse($head->can('view', $otherRequest));
        }
    }

    public function test_teaching_membership_does_not_grant_head_access(): void
    {
        $instructor = $this->user('instructor');
        $instructor->programs()->attach(Program::factory()->create());
        $this->bearer($instructor)->getJson('/api/program-head/students')->assertForbidden();
    }

    public function test_assignment_rejects_students_without_partial_changes(): void
    {
        $staff = $this->user('instructor');
        $student = $this->user('student');
        $this->artisan('alrm:assign-program-heads', [
            'program' => Program::factory()->create()->id, 'users' => [$staff->id, $student->id],
        ])->assertFailed();
        $this->assertSame('instructor', $staff->fresh()->role);
        $this->assertDatabaseCount('program_head_assignments', 0);
    }
}
