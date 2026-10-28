<?php

namespace Tests\Feature;

use App\Models\OtpCode;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\GoogleProvider;
use Laravel\Socialite\Two\User as SocialiteUser;
use Mockery;
use Tests\SecurityTestCase;

class AuthControllerOAuthTest extends SecurityTestCase
{
    private function state(string $nonce, array $overrides = []): string
    {
        Cache::put('oauth_state:'.hash('sha256', $nonce), true, 600);

        return Crypt::encryptString(json_encode([
            'origin' => 'http://localhost:5173', 'nonce' => $nonce,
            'exp' => now()->addMinutes(10)->timestamp, ...$overrides,
        ]));
    }

    private function provider(array $overrides = []): void
    {
        $googleUser = (new SocialiteUser)->setRaw(['email_verified' => true, ...$overrides])->map([
            'id' => 'google-123', 'email' => 'student1@student.edu.ph', 'name' => 'Student',
        ]);
        $provider = Mockery::mock(GoogleProvider::class);
        $provider->shouldReceive('setHttpClient')->once()->andReturnSelf();
        $provider->shouldReceive('stateless')->once()->andReturnSelf();
        $provider->shouldReceive('redirectUrl')->once()->with('http://localhost:5173/api/auth/google/callback')->andReturnSelf();
        $provider->shouldReceive('user')->once()->andReturn($googleUser);
        Socialite::shouldReceive('driver')->once()->with('google')->andReturn($provider);
    }

    public function test_missing_tampered_expired_and_wrong_origin_states_do_not_call_google(): void
    {
        Socialite::shouldReceive('driver')->never();
        $nonce = Str::random(64);
        foreach ([null, 'tampered', $this->state($nonce, ['exp' => now()->subSecond()->timestamp]),
            $this->state($nonce, ['origin' => 'https://evil.example'])] as $state) {
            $this->withUnencryptedCookies(['alrm_oauth' => $nonce])
                ->get('/api/auth/google/callback?'.http_build_query(['state' => $state]))
                ->assertRedirect('http://localhost:5173/login?error=oauth_failed');
        }
        $this->assertSame(0, User::count());
    }

    public function test_valid_signed_state_without_matching_browser_cookie_is_rejected(): void
    {
        Socialite::shouldReceive('driver')->never();
        $state = $this->state(Str::random(64));
        $this->get('/api/auth/google/callback?state='.urlencode($state))
            ->assertRedirect('http://localhost:5173/login?error=oauth_failed');
        $this->withUnencryptedCookies(['alrm_oauth' => Str::random(64)])
            ->get('/api/auth/google/callback?state='.urlencode($state))
            ->assertRedirect('http://localhost:5173/login?error=oauth_failed');
    }

    public function test_browser_bound_state_completes_login_once_and_issues_only_pending_otp(): void
    {
        $this->provider();
        $nonce = Str::random(64);
        $state = $this->state($nonce);
        $this->withUnencryptedCookies(['alrm_oauth' => $nonce])
            ->get('/api/auth/google/callback?state='.urlencode($state))
            ->assertRedirectContains('/auth/otp?user_id=');
        $this->assertSame(1, User::count());
        $this->assertSame(0, User::first()->tokens()->count());
        $this->withUnencryptedCookies(['alrm_oauth' => $nonce])
            ->get('/api/auth/google/callback?state='.urlencode($state))
            ->assertRedirect('http://localhost:5173/login?error=oauth_failed');
    }

    public function test_unverified_google_email_is_rejected(): void
    {
        $this->provider(['email_verified' => false]);
        $nonce = Str::random(64);
        $this->withUnencryptedCookies(['alrm_oauth' => $nonce])
            ->get('/api/auth/google/callback?state='.urlencode($this->state($nonce)))
            ->assertRedirect('http://localhost:5173/login?error=oauth_failed');
        $this->assertSame(0, User::count());
    }

    public function test_google_subject_cannot_replace_an_existing_account_identity(): void
    {
        $user = $this->user('student', ['email' => 'student1@student.edu.ph', 'google_id' => 'different-subject']);
        $this->provider();
        $nonce = Str::random(64);
        $this->withUnencryptedCookies(['alrm_oauth' => $nonce])
            ->get('/api/auth/google/callback?state='.urlencode($this->state($nonce)))
            ->assertRedirect('http://localhost:5173/login?error=oauth_failed');
        $this->assertSame('different-subject', $user->fresh()->google_id);
    }

    public function test_returning_pending_student_is_auto_approved_after_verified_google_sign_in(): void
    {
        $user = $this->user('student', [
            'email' => 'student1@student.edu.ph', 'google_id' => 'google-123', 'status' => 'pending',
        ]);
        $this->provider();
        $nonce = Str::random(64);

        $this->withUnencryptedCookies(['alrm_oauth' => $nonce])
            ->get('/api/auth/google/callback?state='.urlencode($this->state($nonce)))
            ->assertRedirectContains('/auth/otp?user_id=');

        $this->assertSame('approved', $user->fresh()->status);
        $this->assertSame('student', $user->role);
        $this->assertSame(0, $user->tokens()->count()); // OTP is still required.
        $this->assertSame(1, OtpCode::where('user_id', $user->id)->count());
    }

    public function test_returning_pending_instructor_is_not_auto_approved_by_student_domain(): void
    {
        $user = $this->user('instructor', [
            'email' => 'student1@student.edu.ph', 'google_id' => 'google-123', 'status' => 'pending',
        ]);
        $this->provider();
        $nonce = Str::random(64);

        $this->withUnencryptedCookies(['alrm_oauth' => $nonce])
            ->get('/api/auth/google/callback?state='.urlencode($this->state($nonce)))
            ->assertRedirectContains('/auth/otp?user_id=');

        $this->assertSame('pending', $user->fresh()->status);
        $this->assertSame('instructor', $user->role);
    }

    public function test_disabled_account_does_not_receive_otp_or_token(): void
    {
        $user = $this->user('student', [
            'email' => 'student1@student.edu.ph', 'google_id' => 'google-123', 'status' => 'deactivated',
        ]);
        $this->provider();
        $nonce = Str::random(64);
        $this->withUnencryptedCookies(['alrm_oauth' => $nonce])
            ->get('/api/auth/google/callback?state='.urlencode($this->state($nonce)))
            ->assertRedirectContains('error=account_disabled');
        $this->assertSame(0, $user->tokens()->count());
        $this->assertSame(0, OtpCode::count());
    }

    public function test_redirect_issues_http_only_state_cookie_and_caches_nonce(): void
    {
        $captured = null;
        $provider = Mockery::mock(GoogleProvider::class);
        $provider->shouldReceive('stateless')->once()->andReturnSelf();
        $provider->shouldReceive('redirectUrl')->once()->andReturnSelf();
        $provider->shouldReceive('with')->once()->andReturnUsing(function ($parameters) use (&$captured, $provider) {
            $captured = json_decode(Crypt::decryptString($parameters['state']), true);

            return $provider;
        });
        $provider->shouldReceive('redirect')->once()->andReturn(redirect('https://accounts.google.com/'));
        Socialite::shouldReceive('driver')->once()->andReturn($provider);
        $response = $this->get('/api/auth/google/redirect');
        $cookie = collect($response->headers->getCookies())->firstWhere(fn ($cookie) => $cookie->getName() === 'alrm_oauth');
        $this->assertNotNull($cookie);
        $this->assertTrue($cookie->isHttpOnly());
        $this->assertSame('lax', $cookie->getSameSite());
        $this->assertSame($captured['nonce'], $cookie->getValue());
        $this->assertTrue(Cache::has('oauth_state:'.hash('sha256', $cookie->getValue())));
    }
}
