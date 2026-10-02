<?php

namespace Tests\Feature;

use App\Enums\UserStatus;
use App\Models\OtpCode;
use App\Models\TrustedDevice;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as SocialiteUser;
use Mockery;
use Tests\TestCase;

class UserStatusAccessTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config(['app.frontend_url' => 'http://localhost:5173']);
        config(['institution.student_domain' => 'student.edu.ph']);
        config(['institution.staff_domain' => 'staff.edu.ph']);
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    private function makeUser(?string $status, string $role = 'student', array $extra = []): User
    {
        return User::factory()->create(array_merge([
            'role'   => $role,
            'status' => $status,
        ], $extra));
    }

    public function test_enum_is_an_allowlist_that_fails_closed(): void
    {
        $this->assertTrue(UserStatus::allowsLogin('approved'));
        $this->assertTrue(UserStatus::allowsLogin('pending'));
        $this->assertFalse(UserStatus::allowsLogin('deactivated'));
        $this->assertFalse(UserStatus::allowsLogin(null));
        $this->assertFalse(UserStatus::allowsLogin('suspended'));
        $this->assertFalse(UserStatus::allowsLogin(''));
    }

    public function test_deactivated_user_with_valid_token_is_rejected_and_token_revoked(): void
    {
        $user  = $this->makeUser('deactivated');
        $token = $user->createToken('alrm-spa')->plainTextToken;

        $this->withToken($token)->getJson('/api/me')->assertForbidden();

        $this->assertSame(0, $user->tokens()->count());
    }

    public function test_null_status_user_with_valid_token_is_rejected(): void
    {
        $user  = $this->makeUser(null);
        $token = $user->createToken('alrm-spa')->plainTextToken;

        $this->withToken($token)->getJson('/api/me')->assertForbidden();
    }

    public function test_pending_user_can_still_reach_me(): void
    {
        $user  = $this->makeUser('pending');
        $token = $user->createToken('alrm-spa')->plainTextToken;

        $this->withToken($token)->getJson('/api/me')->assertOk();
    }

    public function test_callback_blocks_existing_user_with_null_status(): void
    {
        $user = $this->makeUser(null, 'instructor', [
            'email'     => 'nullstatus@staff.edu.ph',
            'google_id' => null,
        ]);

        $googleUser = Mockery::mock(SocialiteUser::class);
        $googleUser->shouldReceive('getEmail')->andReturn('nullstatus@staff.edu.ph');
        $googleUser->shouldReceive('getId')->andReturn('google-null');
        $googleUser->shouldReceive('getName')->andReturn('Null Status');

        Socialite::shouldReceive('driver->stateless->user')->andReturn($googleUser);

        $this->get('/api/auth/google/callback')
            ->assertRedirectContains('error=account_disabled');

        $this->assertNull($user->refresh()->google_id);
    }

    public function test_otp_verify_is_blocked_for_deactivated_user(): void
    {
        $user = $this->makeUser('deactivated');

        OtpCode::create([
            'user_id'    => $user->id,
            'code'       => '123456',
            'expires_at' => now()->addMinutes(5),
        ]);

        $this->postJson('/api/auth/otp/verify', [
            'user_id' => $user->id,
            'code'    => '123456',
        ])->assertForbidden();

        $this->assertSame(0, $user->tokens()->count());
    }

    public function test_otp_resend_is_blocked_for_deactivated_user(): void
    {
        $user = $this->makeUser('deactivated');

        $this->postJson('/api/auth/otp/resend', ['user_id' => $user->id])
            ->assertForbidden();

        $this->assertSame(0, OtpCode::where('user_id', $user->id)->count());
    }

    public function test_exchange_refuses_code_for_user_deactivated_after_login(): void
    {
        $user  = $this->makeUser('deactivated');
        $token = $user->createToken('alrm-spa')->plainTextToken;
        Cache::put('auth_exchange:abc123', $token, 60);

        $this->postJson('/api/auth/exchange', ['code' => 'abc123'])
            ->assertForbidden();

        $this->assertSame(0, $user->tokens()->count());
    }

    public function test_admin_deactivation_revokes_tokens_and_trusted_devices(): void
    {
        $admin  = $this->makeUser('approved', 'administrator');
        $target = $this->makeUser('approved', 'instructor', ['google_id' => 'g-target']);

        $target->createToken('alrm-spa');
        TrustedDevice::create([
            'user_id'      => $target->id,
            'token_hash'   => Hash::make('secret'),
            'user_agent'   => 'phpunit',
            'ip_address'   => '127.0.0.1',
            'last_used_at' => now(),
            'expires_at'   => now()->addDay(),
        ]);

        $adminToken = $admin->createToken('alrm-spa')->plainTextToken;

        $this->withToken($adminToken)
            ->patchJson("/api/admin/users/{$target->id}/status", ['status' => 'deactivated'])
            ->assertOk();

        $target->refresh();
        $this->assertSame('deactivated', $target->status);
        $this->assertSame(0, $target->tokens()->count());
        $this->assertSame(0, TrustedDevice::where('user_id', $target->id)->count());
    }

    public function test_admin_endpoint_still_accepts_legacy_inactive_value(): void
    {
        $admin  = $this->makeUser('approved', 'administrator');
        $target = $this->makeUser('approved', 'instructor', ['google_id' => 'g-legacy']);

        $adminToken = $admin->createToken('alrm-spa')->plainTextToken;

        $this->withToken($adminToken)
            ->patchJson("/api/admin/users/{$target->id}/status", ['status' => 'inactive'])
            ->assertOk();

        $this->assertSame('deactivated', $target->refresh()->status);
    }
}