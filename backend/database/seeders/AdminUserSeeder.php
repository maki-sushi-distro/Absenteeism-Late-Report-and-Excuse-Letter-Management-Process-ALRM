<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Program;
use App\Models\User;
use Google\Client as GoogleClient;
use Google\Service\Sheets as GoogleSheets;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Log;

/**
 * Simple value object for a single user to be seeded.
 */
final readonly class SeedUser
{
    public function __construct(
        public string $name,
        public string $email,
        public UserRole $role,
        public ?string $programId = null,
    ) {}
}

enum UserRole: string
{
    case Administrator = 'administrator';
    case ProgramHead = 'program_head';
    case Instructor = 'instructor';
}

class AdminUserSeeder extends Seeder
{
    /**
     * Google Sheet ID (from the URL, between /d/ and /edit).
     */
    private const string SPREADSHEET_ID = '19eJh4R3cWEL5T52-v86z8NVSVvS2MTtg0h99N69N8Qw';

    /**
     * Path to the service account credentials JSON, relative to storage_path().
     */
    private const string CREDENTIALS_PATH = 'app/google/service-account.json';

    /**
     * Maps each sheet tab name to a `program_name` in the database. We
     * don't hardcode a UUID here since program_id is random per
     * environment/seed run — the real ID is resolved at runtime via
     * Program::query()->firstWhere().
     *
     * TODO: fill in the values below with the exact `program_name`
     * from your ProgramSeeder / programs table.
     *
     * TODO: 'BSISACT' is a single sheet tab, but BSIS and ACT are two
     * separate rows in the `programs` table. The same instructors teach
     * both, so BSIS was chosen as their "home" program_id and ACT is
     * intentionally left unlinked. Revisit this if:
     *   - a future feature needs to list/filter instructors by program
     *     (ACT will show as having no instructors even though it does)
     *   - a future validation requires an instructor's program_id to
     *     match the class's program before they can be assigned (ACT
     *     class assignment would fail/be blocked for these instructors,
     *     since their program_id is BSIS, not ACT)
     *   - this decision is forgotten entirely — it currently lives only
     *     as this comment, so a future developer (or future you) may
     *     not know why ACT has no seeded instructors
     * If any of these become real needs, consider a proper many-to-many
     * program_user pivot table instead of a single program_id.
     */
    private const array TAB_TO_PROGRAM_NAME = [
        'GEN ED'   => 'General Education',
        'BSSW'     => 'Bachelor of Science in Social Work',
        'BSABSAIS' => 'Bachelor of Science in Accountancy',                  // "home" ng Accountancy + Accounting Information System instructors
        'BSISACT'  => 'Bachelor of Science in Information System',           // "home" ng Information System + Associate in Computer Technology instructors
        'BAB'      => 'Bachelor of Arts in Broadcasting',
    ];

    /**
     * Role priority, high to low. Used when the same email appears both
     * as a manual entry AND a sheet entry — the higher role wins (e.g.
     * an 'administrator' won't get downgraded to 'instructor' just
     * because they also show up in the Google Sheet of instructors).
     */
    private const array ROLE_PRIORITY = [
        UserRole::Administrator->value => 3,
        UserRole::ProgramHead->value => 2,
        UserRole::Instructor->value => 1,
    ];

    public function run(): void
    {
        $manualUsers = [
            new SeedUser(
                name: 'Jade Riel Abuela',
                email: 'jaderiel.abuela@laverdad.edu.ph',
                role: UserRole::Administrator,
            ),
            // new SeedUser(
            //     name: '',
            //     email: '',
            //     role: UserRole::ProgramHead,
            //     programId: null,
            // ),
        ];

        $sheetUsers = $this->fetchInstructorsFromGoogleSheets();

        $merged = [];

        foreach ([...$manualUsers, ...$sheetUsers] as $user) {
            $existing = $merged[$user->email] ?? null;

            if (! $existing) {
                $merged[$user->email] = $user;
                continue;
            }

            $existingPriority = self::ROLE_PRIORITY[$existing->role->value];
            $incomingPriority = self::ROLE_PRIORITY[$user->role->value];

            if ($incomingPriority > $existingPriority) {
                $merged[$user->email] = new SeedUser(
                    name: $user->name,
                    email: $user->email,
                    role: $user->role,
                    programId: $user->programId ?? $existing->programId,
                );
            } elseif ($existing->programId === null && $user->programId !== null) {
                $merged[$user->email] = new SeedUser(
                    name: $existing->name,
                    email: $existing->email,
                    role: $existing->role,
                    programId: $user->programId,
                );
            }
        }

        foreach ($merged as $user) {
            $this->saveUser($user);
        }
    }

    /**
     * @return SeedUser[]
     */
    private function fetchInstructorsFromGoogleSheets(): array
    {
        $client = new GoogleClient();
        $client->setApplicationName('AdminUserSeeder');
        $client->setScopes([GoogleSheets::SPREADSHEETS_READONLY]);
        $client->setAuthConfig(storage_path(self::CREDENTIALS_PATH));

        $service = new GoogleSheets($client);

        $users = [];

        foreach (self::TAB_TO_PROGRAM_NAME as $tabName => $programName) {
            $programId = $programName !== null
                ? Program::query()->firstWhere('program_name', $programName)?->id
                : null;

            if ($programName !== null && $programId === null) {
                Log::warning("AdminUserSeeder: no program found with name '{$programName}' (tab: {$tabName}).");
            }

            try {
                $range = "'{$tabName}'!A2:C";
                $response = $service->spreadsheets_values->get(self::SPREADSHEET_ID, $range);

                foreach ($response->getValues() ?? [] as $row) {
                    $roleLabel = trim($row[0] ?? '');
                    $name = trim($row[1] ?? '');
                    $email = trim($row[2] ?? '');

                    if ($name === '' || $email === '') {
                        continue;
                    }

                    $role = strcasecmp($roleLabel, 'Program Head') === 0
                        ? UserRole::ProgramHead
                        : UserRole::Instructor;

                    $users[] = new SeedUser(
                        name: $name,
                        email: $email,
                        role: $role,
                        programId: $programId,
                    );
                }
            } catch (\Throwable $e) {
                Log::warning("AdminUserSeeder: failed to fetch tab '{$tabName}': {$e->getMessage()}");
            }
        }

        return $users;
    }

    private function saveUser(SeedUser $user): void
    {
        User::firstOrCreate(
            ['email' => $user->email],
            ['name' => $user->name],
        )->forceFill([
            'role' => $user->role->value,
            'status' => 'approved',
            'program_id' => $user->programId,
        ])->save();
    }
}
