<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ClassModel;
use App\Models\Enrollment;
use App\Models\User;
use App\Services\AcademicPeriod;
use App\Services\AuditLoggerService;
use App\Support\BoundedCollection;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ClassManagementController extends Controller
{
    public function __construct(
        protected AuditLoggerService $auditLogger,
    ) {}

    /**
     * GET /api/admin/classes
     */
    public function index()
    {
        $classes = ClassModel::with('instructor', 'program')->withCount('enrollments');

        return BoundedCollection::respond($classes);
    }

    /**
     * POST /api/admin/classes
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'subject_name' => ['required', 'string', 'max:255'],
            'section' => ['required', 'string', 'max:50'],
            'instructor_id' => ['required', 'string', 'uuid', Rule::exists('users', 'id')->where('role', 'instructor')],
            'schedule' => ['required', 'string', 'max:4096'],
            'program_id' => ['required', 'string', 'uuid', 'exists:programs,id'],
            'year_level' => ['required', 'in:1st,2nd,3rd,4th'],
            'semester' => ['required', 'in:1st,2nd'],
            'school_year' => ['required', 'string', 'regex:/^\d{4}-\d{4}$/'],
        ]);

        $class = ClassModel::create($validated);
        $this->enrollMatchingStudents($class);
        $this->auditLogger->log('created_class', 'classes', $class->id);

        return response()->json([
            'success' => true,
            'message' => 'Class created.',
            'data' => $class,
        ], 201);
    }

    /**
     * GET /api/admin/classes/{class}
     */
    public function show(ClassModel $class)
    {
        return response()->json([
            'success' => true,
            'message' => null,
            'data' => $class->load('instructor', 'program', 'enrollments.student'),
        ]);
    }

    /**
     * PUT/PATCH /api/admin/classes/{class}
     */
    public function update(Request $request, ClassModel $class)
    {
        $validated = $request->validate([
            'subject_name' => ['sometimes', 'string', 'max:255'],
            'section' => ['sometimes', 'string', 'max:50'],
            'instructor_id' => ['sometimes', 'string', 'uuid', Rule::exists('users', 'id')->where('role', 'instructor')],
            'schedule' => ['sometimes', 'string', 'max:4096'],
            'program_id' => ['sometimes', 'string', 'uuid', 'exists:programs,id'],
            'year_level' => ['sometimes', 'in:1st,2nd,3rd,4th'],
            'semester' => ['sometimes', 'in:1st,2nd'],
            'school_year' => ['sometimes', 'string', 'regex:/^\d{4}-\d{4}$/'],
        ]);

        $class->update($validated);
        $this->enrollMatchingStudents($class->fresh());
        $this->auditLogger->log('updated_class', 'classes', $class->id);

        return response()->json([
            'success' => true,
            'message' => 'Class updated.',
            'data' => $class,
        ]);
    }

    /**
     * DELETE /api/admin/classes/{class}
     */
    public function destroy(ClassModel $class)
    {
        if ($class->enrollments()->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete a class that still has enrollments.',
                'data' => null,
            ], 409);
        }

        $classId = $class->id;
        $class->delete();
        $this->auditLogger->log('deleted_class', 'classes', $classId);

        return response()->json([
            'success' => true,
            'message' => 'Class deleted.',
            'data' => null,
        ]);
    }

    /**
     * Enroll all matching students (same program + year level) into the
     * class, but only if the class belongs to the CURRENT academic term.
     * Idempotent: firstOrCreate never duplicates an enrollment.
     */
    protected function enrollMatchingStudents(ClassModel $class): void
    {
        if (
            $class->semester !== AcademicPeriod::semester() ||
            $class->school_year !== AcademicPeriod::schoolYear()
        ) {
            return;
        }

        /** @var Builder<User> $students */
        $students = User::query()
            ->where('role', 'student')
            ->where('program_id', $class->program_id)
            ->where('year_level', $class->year_level);

        $students->each(function ($student) use ($class): void {
            /** @var User $student */
            Enrollment::firstOrCreate(
                ['student_id' => $student->id, 'class_id' => $class->id],
                ['year_level' => $class->year_level],
            );
        });
    }
}
