<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AuditLoggerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class UserApprovalController extends Controller
{
    /**
     * Roles an Administrator can hand-pick when RE-assigning an existing
     * staff member's role (PATCH .../role). Deliberately excludes
     * 'student' — a student's role is locked in at first Google login
     * and is never something an Admin flips through this endpoint.
     */
    private const ASSIGNABLE_ROLES = ['instructor', 'program_head', 'administrator'];

    /**
     * Roles an Administrator can pre-register a NEW roster entry as
     * (POST .../users). Unlike ASSIGNABLE_ROLES above, 'student' IS
     * included here — Admin/Registrar pre-loads the roster (name +
     * institutional email + role) before that person ever signs in, so
     * the account resolves to the right role/name on their very first
     * Google login instead of falling back to defaults.
     */
    private const CREATABLE_ROLES = ['student', 'instructor', 'program_head', 'administrator'];

    public function __construct(
        protected AuditLoggerService $auditLogger,
    ) {}

    /**
     * List all users (students included — the "All Users" / "Students" /
     * "Instructors" / etc. tabs in the admin UI all hit this one endpoint
     * with different filters). Status lifecycle: pending → approved →
     * inactive (updateStatus()) → deleted (destroy(), pending/inactive
     * only). A 'pending' row is one of two things — check google_id to
     * tell them apart: null = pre-registered by Admin, never logged in
     * (store()); set = true self-registration awaiting Admin approval
     * (AuthController::callback()).
     *
     * GET /api/admin/users
     * Optional filters: ?role=student|instructor|program_head|administrator
     *                    ?status=pending|approved|inactive
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'role'   => ['sometimes', 'string', Rule::in(self::CREATABLE_ROLES)],
            'status' => ['sometimes', 'string', Rule::in(['pending', 'approved', 'inactive'])],
        ]);

        $query = User::query()->whereNotNull('role');

        if ($request->filled('role')) {
            $query->where('role', $request->query('role'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        $users = $query->withExists(['headedProgram as heads_program'])
            ->orderBy('name')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'OK',
            'data'    => $users,
        ]);
    }

    /**
     * Pre-register a roster entry — student, instructor, or program
     * head — before that person has ever signed in with Google.
     *
     * ALRM has no password / manual account creation (Google SSO only).
     * This just reserves the row: when the real person later logs in
     * with THIS exact institutional email, AuthController::callback()
     * matches them to it, keeps the role set here (instead of falling
     * back to the instructor/student domain default), and flips status
     * from 'pending' to 'approved'.
     *
     * POST /api/admin/users
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'  => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'role'  => ['required', 'string', Rule::in(self::CREATABLE_ROLES)],
        ]);

        $email  = strtolower($validated['email']);
        $domain = substr(strrchr($email, '@') ?: '', 1);

        $studentDomain = config('institution.student_domain');
        $staffDomain = config('institution.staff_domain');

        $isStudentDomain = $domain === $studentDomain;
        $isStaffDomain   = $domain === $staffDomain;

        if (! $isStudentDomain && ! $isStaffDomain) {
            return response()->json([
                'success' => false,
                'message' => 'Email must be an institutional address (@'
                    .$studentDomain.' or @'.$staffDomain.').',
                'data'    => null,
            ], 422);
        }

        $roleIsStudent = $validated['role'] === 'student';
        if ($roleIsStudent !== $isStudentDomain) {
            return response()->json([
                'success' => false,
                'message' => $isStudentDomain
                    ? 'This email is on the student domain and can only be pre-registered as student.'
                    : 'This email is on the staff domain and cannot be pre-registered as student.',
                'data'    => null,
            ], 422);
        }

        $user = User::create([
            'name'     => $validated['name'],
            'email'    => $email,
            'role'     => $validated['role'],
            'status'   => 'pending',
            'password' => null,
        ]);

        $this->auditLogger->log('pre_registered_user:'.$validated['role'], 'users', $user->id);

        return response()->json([
            'success' => true,
            'message' => 'User pre-registered. They will be activated automatically on their first Google sign-in.',
            'data'    => $user,
        ], 201);
    }

    /**
     * Hard-delete a user — ONLY allowed for 'pending' (never-logged-in
     * roster mistakes) or 'inactive' (already deactivated, e.g. years
     * after they left) accounts. An 'approved'/active account can never
     * be deleted directly through this endpoint — it must be deactivated
     * first via updateStatus(), which is the deliberate speed bump: no
     * one accidentally hard-deletes a live account carrying enrollments,
     * requests, or audit history in one click.
     *
     * DELETE /api/admin/users/{user}
     */
    public function destroy(User $user): JsonResponse
    {
        if (! in_array($user->status, ['pending', 'inactive'], true)) {
            return response()->json([
                'success' => false,
                'message' => 'Only pending or deactivated accounts can be deleted. Deactivate this user first.',
                'data'    => null,
            ], 409);
        }

        $userId = $user->id;
        $wasPending = $user->status === 'pending';
        $user->delete();

        $this->auditLogger->log(
            $wasPending ? 'deleted_pending_user' : 'deleted_inactive_user',
            'users',
            $userId
        );

        return response()->json([
            'success' => true,
            'message' => 'User removed.',
            'data'    => null,
        ]);
    }

    /**
     * Approve/reject a self-registration, or deactivate/reactivate an
     * already-approved account — one endpoint, because both are just
     * status transitions.
     *
     * 'pending' means one of two different things, and this endpoint
     * only handles one of them:
     *   - google_id IS NULL  → Admin pre-registered this row
     *     (store()), nobody has logged in yet. Nothing to approve —
     *     fix mistakes via destroy(), not here.
     *   - google_id IS SET   → true self-registration (interview
     *     requirement: "Self-registration + approval process"). They
     *     logged in via Google themselves and are waiting on this
     *     Admin approval step. Reject by deleting (destroy()) instead
     *     of trying to "deactivate" an account that was never active.
     *
     * Deactivating sets status='inactive' and stamps deactivated_at, so
     * the Admin has a real basis for "it's been X years, safe to
     * hard-delete" later via destroy(). Reactivating clears
     * deactivated_at and flips status back to 'approved'.
     *
     * Deliberately separate from updateRole() — status and role are
     * independent axes (a deactivated instructor is still an
     * instructor, just locked out), and mixing them into one endpoint
     * would make the "can't touch your own access" guard ambiguous
     * about which axis it's protecting.
     *
     * PATCH /api/admin/users/{user}/status
     * Body: { "status": "inactive" | "approved" }
     */
    public function updateStatus(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'string', Rule::in(['approved', 'inactive'])],
        ]);

        if ($user->status === 'pending') {
            if (is_null($user->google_id)) {
                return response()->json([
                    'success' => false,
                    'message' => 'This account has not logged in yet (still pending). Delete the roster entry instead if it was a mistake.',
                    'data'    => null,
                ], 409);
            }

            if ($validated['status'] !== 'approved') {
                return response()->json([
                    'success' => false,
                    'message' => "A self-registered account awaiting approval can only be approved through this endpoint. Delete it instead to reject the registration.",
                    'data'    => null,
                ], 409);
            }
        }

        if ($user->id === $request->user()->id) {
            return response()->json([
                'success' => false,
                'message' => 'You cannot change your own account status through this endpoint.',
                'data'    => null,
            ], 403);
        }

        $previousStatus = $user->status;

        if ($previousStatus === $validated['status']) {
            return response()->json([
                'success' => false,
                'message' => "User is already '{$validated['status']}'.",
                'data'    => null,
            ], 409);
        }

        $user->status = $validated['status'];
        $user->deactivated_at = $validated['status'] === 'inactive' ? now() : null;
        $user->save();

        $this->auditLogger->log(
            $previousStatus === 'pending'
                ? 'approved_self_registered_user'
                : "status_changed:{$previousStatus}->{$validated['status']}",
            'users',
            $user->id
        );

        $message = match (true) {
            $previousStatus === 'pending' => 'User approved.',
            $validated['status'] === 'inactive' => 'User deactivated.',
            default => 'User reactivated.',
        };

        return response()->json([
            'success' => true,
            'message' => $message,
            'data'    => $user,
        ]);
    }

    /**
     * Change an existing staff member's role — e.g. promote an
     * instructor to program_head, or grant administrator access.
     *
     * PATCH /api/admin/users/{user}/role
     */
    public function updateRole(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'role' => ['required', 'string', Rule::in(self::ASSIGNABLE_ROLES)],
        ]);

        if ($user->role === 'student' || $user->role === null) {
            return response()->json([
                'success' => false,
                'message' => 'This endpoint only reassigns existing staff roles (instructor, program_head, administrator).',
                'data'    => null,
            ], 409);
        }

        if ($user->id === $request->user()->id) {
            return response()->json([
                'success' => false,
                'message' => 'You cannot change your own role through this endpoint.',
                'data'    => null,
            ], 403);
        }

        $previousRole = $user->role;

        if ($previousRole === $validated['role']) {
            return response()->json([
                'success' => false,
                'message' => "User already has the '{$validated['role']}' role.",
                'data'    => null,
            ], 409);
        }

        $user->role = $validated['role'];
        $user->save();

        $this->auditLogger->log(
            "role_changed:{$previousRole}->{$validated['role']}",
            'users',
            $user->id
        );

        return response()->json([
            'success' => true,
            'message' => 'Role updated.',
            'data'    => $user,
        ]);
    }
}