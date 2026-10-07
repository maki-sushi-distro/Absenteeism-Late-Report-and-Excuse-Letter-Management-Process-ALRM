<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Artisan;
use App\Http\Controllers\Auth\ProfileController;
use App\Http\Controllers\ProgramHead\FollowupFlagController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\NotificationController;                          
use App\Http\Controllers\Student\ClassController;
use App\Http\Controllers\Student\RequestController;
use App\Http\Controllers\Student\AttendanceController;
use App\Http\Controllers\Student\StudentDashboardController;              
use App\Http\Controllers\Instructor\InstructorRequestController;
use App\Http\Controllers\Instructor\InstructorDashboardController;
use App\Http\Controllers\ProgramHead\ProgramHeadDashboardController;
use App\Http\Controllers\Admin\AdminDashboardController;
use App\Http\Controllers\Admin\UserApprovalController;
use App\Http\Controllers\Admin\ProgramController;
use App\Http\Controllers\Admin\ClassManagementController;
use App\Http\Controllers\Admin\ReportController;
use App\Http\Controllers\Auth\OtpController;


Route::post('/internal/roster-sync', function (Request $request) {
    $expected = (string) config('services.roster_sync.secret');
    $provided = (string) $request->header('X-Sync-Secret', '');

    if ($expected === '' || ! hash_equals($expected, $provided)) {
        abort(403);
    }

    dispatch(function () {
        Artisan::call('roster:sync');
    })->afterResponse();

    return response()->json(['success' => true, 'message' => 'Sync started']);
})->middleware('throttle:10,1');

/*
|--------------------------------------------------------------------------
| Auth Routes (Google OAuth/SSO no email/password reg)
|--------------------------------------------------------------------------
*/

Route::prefix('auth')->group(function () {
    Route::get('/google/redirect', [AuthController::class, 'redirect']);
    Route::get('/google/callback', [AuthController::class, 'callback']);
    Route::post('/exchange', [AuthController::class, 'exchange']);
    Route::post('/otp/check-trusted', [AuthController::class, 'checkTrusted'])
        ->middleware('throttle:10,1');
    Route::post('/otp/verify', [OtpController::class, 'verify'])
        ->middleware('throttle:10,1');
    Route::post('/otp/resend', [OtpController::class, 'resend'])
        ->middleware('throttle:10,1');
});

Route::middleware(['auth:sanctum', 'active', 'inactive'])->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::get('/complete-profile/programs', [ProfileController::class, 'programs']);
    Route::post('/complete-profile', [ProfileController::class, 'completeProfile']);

    /*
    |----------------------------------------------------------------
    | Notifications (lahat ng roles)
    |----------------------------------------------------------------
    */
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::patch('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);   // dapat nasa unahan
    Route::patch('/notifications/{notification}/read', [NotificationController::class, 'markAsRead']);

    /*
    |----------------------------------------------------------------
    | Student Routes
    |----------------------------------------------------------------
    */
    Route::middleware('role:student')->group(function () {
        Route::get('/dashboard', [StudentDashboardController::class, 'index']);   // idinagdag

        Route::get('/classes', [ClassController::class, 'index']);

        Route::post('/requests', [RequestController::class, 'store']);
        Route::get('/requests', [RequestController::class, 'index']);
        Route::get('/requests/{request}', [RequestController::class, 'show']);
        Route::patch('/requests/{request}', [RequestController::class, 'update']);
        Route::delete('/requests/{request}', [RequestController::class, 'destroy']);

        Route::get('/attendance/summary', [AttendanceController::class, 'summary']);
    });

    /*
    |----------------------------------------------------------------
    | Instructor Routes
    |----------------------------------------------------------------
    */
    Route::prefix('instructor')->middleware('role:instructor')->group(function () {
        Route::get('/requests', [InstructorRequestController::class, 'index']);
        Route::patch('/requests/{request}/decision', [InstructorRequestController::class, 'decide']);
        Route::get('/dashboard', [InstructorDashboardController::class, 'index']);
    });

    /*
    |----------------------------------------------------------------
    | Program Head Routes
    |----------------------------------------------------------------
    */
    Route::prefix('program-head')->middleware('role:program_head')->group(function () {
        Route::get('/dashboard', [ProgramHeadDashboardController::class, 'index']);
        Route::get('/students/flagged', [ProgramHeadDashboardController::class, 'flaggedStudents']);
        Route::get('/requests', [ProgramHeadDashboardController::class, 'requests']);

        Route::get('/followup-flags', [FollowupFlagController::class, 'index']);
        Route::patch('/followup-flags/{followupFlag}/resolve', [FollowupFlagController::class, 'resolve']);
    });

    /*
    |----------------------------------------------------------------
    | Administrator Routes
    |----------------------------------------------------------------
    */
    Route::prefix('admin')->middleware('role:administrator')->group(function () {
        Route::get('/dashboard', [AdminDashboardController::class, 'index']);
        Route::apiResource('users', UserApprovalController::class)->only(['index', 'store', 'destroy']);
        Route::patch('/users/{user}/role', [UserApprovalController::class, 'updateRole']);
        Route::patch('/users/{user}/status', [UserApprovalController::class, 'updateStatus']);

        Route::apiResource('programs', ProgramController::class);
        Route::apiResource('classes', ClassManagementController::class);

        Route::get('/reports/export', [ReportController::class, 'export']);
        Route::get('/reports/preview', [ReportController::class, 'preview']);
    });
});