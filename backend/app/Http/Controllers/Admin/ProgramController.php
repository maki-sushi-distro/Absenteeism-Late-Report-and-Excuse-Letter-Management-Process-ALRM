<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Program;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ProgramController extends Controller
{
    /**
     * GET /api/admin/programs
     */
    public function index()
    {
        $programs = Program::with('programHead')->withCount(['classes', 'users'])->get();

        return response()->json([
            'success' => true,
            'message' => null,
            'data'    => $programs,
        ]);
    }

    /**
     * POST /api/admin/programs
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'program_name'    => ['required', 'string', 'max:255', 'unique:programs,program_name'],
            'program_head_id' => ['nullable', 'integer', Rule::exists('users', 'id')->where('role', 'program_head')],
        ]);

        $program = Program::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Program created.',
            'data'    => $program,
        ], 201);
    }

    /**
     * GET /api/admin/programs/{program}
     */
    public function show(Program $program)
    {
        return response()->json([
            'success' => true,
            'message' => null,
            'data'    => $program->load('programHead', 'classes', 'users'),
        ]);
    }

    /**
     * PUT/PATCH /api/admin/programs/{program}
     */
    public function update(Request $request, Program $program)
    {
        $validated = $request->validate([
            'program_name'    => ['sometimes', 'string', 'max:255', Rule::unique('programs', 'program_name')->ignore($program->id)],
            'program_head_id' => ['sometimes', 'nullable', 'integer', Rule::exists('users', 'id')->where('role', 'program_head')],
        ]);

        $program->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Program updated.',
            'data'    => $program,
        ]);
    }

    /**
     * DELETE /api/admin/programs/{program}
     */
    public function destroy(Program $program)
    {
        if ($program->classes()->exists() || $program->users()->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete a program that still has classes or users.',
                'data'    => null,
            ], 409);
        }

        $program->delete();

        return response()->json([
            'success' => true,
            'message' => 'Program deleted.',
            'data'    => null,
        ]);
    }
}