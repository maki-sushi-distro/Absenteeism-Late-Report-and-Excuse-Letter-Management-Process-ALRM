<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as SocialiteUser;
use Mockery;
use Tests\TestCase;

class AuthControllerOAuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config(['app.frontend_url' => 'http://localhost:5173']);
        config(['app.frontend_url_prod' => 'absenteeism-late-report-and-excuse.vercel.app']);
        config(['institution.student_domain' => 'student.edu.ph']);
        config(['institution.staff_domain' => 'staff.edu.ph']);
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    public function test_redirects_to_default_frontend_when_state_origin_is_not_in_allowlist(): void
    {
        $forgedState = base64_encode(json_encode([
            'origin' => 'https://evil.com',
            'nonce'  => 'x',
            'exp'    => now()->addMinutes(10)->timestamp,
        ]));

        $mockGoogleUser = Mockery::mock(SocialiteUser::class);
        $mockGoogleUser->shouldReceive('getEmail')->andReturn('student1@student.edu.ph');
        $mockGoogleUser->shouldReceive('getId')->andReturn('google-123');
        $mockGoogleUser->shouldReceive('getName')->andReturn('Juan Dela Cruz');

        Socialite::shouldReceive('driver->stateless->user')->andReturn($mockGoogleUser);

        $response = $this->get('/api/auth/google/callback?state=' . urlencode($forgedState));

        $response->assertRedirectContains('localhost:5173');
        $response->assertRedirectContains('/auth/otp');
    }

    public function test_redirects_to_exact_signed_origin_when_state_is_valid_and_unexpired(): void
    {
        $validState = Crypt::encryptString(json_encode([
            'origin' => 'absenteeism-late-report-and-excuse.vercel.app',
            'nonce'  => Str::random(32),
            'exp'    => now()->addMinutes(10)->timestamp,
        ]));

        $mockGoogleUser = Mockery::mock(SocialiteUser::class);
        $mockGoogleUser->shouldReceive('getEmail')->andReturn('staff1@staff.edu.ph');
        $mockGoogleUser->shouldReceive('getId')->andReturn('google-456');
        $mockGoogleUser->shouldReceive('getName')->andReturn('Maria Santos');

        Socialite::shouldReceive('driver->stateless->user')->andReturn($mockGoogleUser);

        $response = $this->get('/api/auth/google/callback?state=' . urlencode($validState));

        $response->assertRedirectContains('absenteeism-late-report-and-excuse.vercel.app');
    }

    public function test_rejects_an_expired_signed_state(): void
    {
        $expiredState = Crypt::encryptString(json_encode([
            'origin' => 'absenteeism-late-report-and-excuse.vercel.app',
            'nonce'  => Str::random(32),
            'exp'    => now()->subMinutes(5)->timestamp,
        ]));

        $mockGoogleUser = Mockery::mock(SocialiteUser::class);
        $mockGoogleUser->shouldReceive('getEmail')->andReturn('student2@student.edu.ph');
        $mockGoogleUser->shouldReceive('getId')->andReturn('google-789');
        $mockGoogleUser->shouldReceive('getName')->andReturn('Pedro Reyes');

        Socialite::shouldReceive('driver->stateless->user')->andReturn($mockGoogleUser);

        $response = $this->get('/api/auth/google/callback?state=' . urlencode($expiredState));

        $response->assertRedirectContains('localhost:5173');
    }

    public function test_blocks_a_deactivated_user_from_receiving_a_token_or_otp(): void
    {
        $user = User::factory()->create([
            'email'     => 'deactivated@staff.edu.ph',
            'status'    => 'deactivated',
            'google_id' => null,
        ]);

        $mockGoogleUser = Mockery::mock(SocialiteUser::class);
        $mockGoogleUser->shouldReceive('getEmail')->andReturn('deactivated@staff.edu.ph');
        $mockGoogleUser->shouldReceive('getId')->andReturn('google-999');
        $mockGoogleUser->shouldReceive('getName')->andReturn('Deactivated User');

        Socialite::shouldReceive('driver->stateless->user')->andReturn($mockGoogleUser);

        $response = $this->get('/api/auth/google/callback');

        $response->assertRedirectContains('error=account_disabled');

        $user->refresh();
        $this->assertSame('deactivated', $user->status);
        $this->assertNull($user->google_id); // hindi dapat na-link ang Google account
    }
}