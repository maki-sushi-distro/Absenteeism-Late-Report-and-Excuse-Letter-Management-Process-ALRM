<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ClassModel;
use App\Models\Enrollment;          
use App\Models\User;                
use App\Services\AcademicPeriod;    
use App\Services\AuditLoggerService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ClassManagementController extends Controller
{
    public function __construct(
        protected AuditLoggerService $auditLogger,
    ) {}

    public function index() { /* ... */ }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'subject_name'  => ['required', 'string', 'max:255'],
            'section'       => ['required', 'string', 'max:50'],
            'instructor_id' => ['required', 'string', 'uuid', Rule::exists('users', 'id')->where('role', 'instructor')],
            'schedule'      => ['required', 'string'],
            'program_id'    => ['required', 'string', 'uuid', 'exists:programs,id'],
            'year_level'    => ['required', 'in:1st,2nd,3rd,4th'],   
            'semester'      => ['required', 'in:1st,2nd'],
            'school_year'   => ['required', 'string', 'regex:/^\d{4}-\d{4}$/'],
        ]);

        $class = ClassModel::create($validated);
        $this->enrollMatchingStudents($class);                         
        $this->auditLogger->log('created_class', 'classes', $class->id);

        return response()->json([
            'success' => true,
            'message' => 'Class created.',
            'data'    => $class,
        ], 201);
    }

    public function show(ClassModel $class) { /* ... */ }

    public function update(Request $request, ClassModel $class) { /* dagdagan ng year_level */ }

    public function destroy(ClassModel $class) { /* ... */ }

    protected function enrollMatchingStudents(ClassModel $class): void
    {
        if (
            $class->semester    !== AcademicPeriod::semester() ||
            $class->school_year !== AcademicPeriod::schoolYear()
        ) {
            return;
        }

        User::query()
            ->where('role', 'student')
            ->where('program_id', $class->program_id)
            ->where('year_level', $class->year_level)
            ->each(fn (User $student) => Enrollment::firstOrCreate(
                ['student_id' => $student->id, 'class_id' => $class->id],
                ['year_level' => $class->year_level],
            ));
    }
}