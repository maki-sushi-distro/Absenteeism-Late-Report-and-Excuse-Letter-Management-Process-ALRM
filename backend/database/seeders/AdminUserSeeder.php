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
        /** @var string[] */
        public array $programIds = [],
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
     * Path to the service account credentials JSON when running locally,
     * relative to storage_path(). Not used on Render — see
     * RENDER_SECRET_CREDENTIALS_PATH and resolveCredentialsPath() below.
     */
    private const string CREDENTIALS_PATH = 'app/google/service-account.json';

    /**
     * Path to the service account credentials JSON on Render, where it's
     * mounted read-only from the "Secret Files" dashboard section. Render
     * exposes every secret file at /etc/secrets/<filename>.
     */
    private const string RENDER_SECRET_CREDENTIALS_PATH = '/etc/secrets/service-account.json';

    /**
     * Maps each sheet tab name to a `program_name` in the database. We
     * don't hardcode a UUID here since program_id is random per
     * environment/seed run — the real ID is resolved at runtime via
     * Program::query()->firstWhere().
     *
     * A single instructor can appear in multiple tabs (e.g. BSIS + ACT +
     * BSA) — they're seeded as a member of every program whose tab they
     * appear in, via the program_user pivot table (see fetchInstructorsFromGoogleSheets()
     * and saveUser()).
     */
    private const array TAB_TO_PROGRAM_NAME = [
        'GEN ED'   => 'General Education',
        'BSSW'     => 'Bachelor of Science in Social Work',
        'BSABSAIS' => 'Bachelor of Science in Accountancy',
        'BSISACT'  => 'Bachelor of Science in Information System',
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
            //     programIds: [],
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

            $mergedProgramIds = array_values(array_unique([
                ...$existing->programIds,
                ...$user->programIds,
            ]));

            $merged[$user->email] = new SeedUser(
                name: $incomingPriority > $existingPriority ? $user->name : $existing->name,
                email: $existing->email,
                role: $incomingPriority > $existingPriority ? $user->role : $existing->role,
                programIds: $mergedProgramIds,
            );
        }

        foreach ($merged as $user) {
            $this->saveUser($user);
        }
    }

    /**
     * Resolves the service account credentials path. On Render, the file
     * is mounted read-only at RENDER_SECRET_CREDENTIALS_PATH via the
     * "Secret Files" dashboard section, so we use that when it exists.
     * Locally (or on any other host), we fall back to the file checked
     * into storage/app/google/ (gitignored).
     */
    private function resolveCredentialsPath(): string
    {
        if (file_exists(self::RENDER_SECRET_CREDENTIALS_PATH)) {
            return self::RENDER_SECRET_CREDENTIALS_PATH;
        }

        return storage_path(self::CREDENTIALS_PATH);
    }

    /**
     * @return SeedUser[]
     */
    private function fetchInstructorsFromGoogleSheets(): array
    {
        $client = new GoogleClient();
        $client->setApplicationName('AdminUserSeeder');
        $client->setScopes([GoogleSheets::SPREADSHEETS_READONLY]);
        $client->setAuthConfig($this->resolveCredentialsPath());

        $service = new GoogleSheets($client);

        /** @var array<string, array{name: string, role: UserRole, programIds: array<string>}> */
        $byEmail = [];

        foreach (self::TAB_TO_PROGRAM_NAME as $tabName => $programName) {
            $programId = Program::query()->firstWhere('program_name', $programName)?->id;

            if ($programId === null) {
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

                    if (! isset($byEmail[$email])) {
                        $byEmail[$email] = [
                            'name' => $name,
                            'role' => $role,
                            'programIds' => [],
                        ];
                    }

                    // Higher role wins across tabs too (e.g. Program Head
                    // in one tab, plain Instructor in another).
                    if (self::ROLE_PRIORITY[$role->value] > self::ROLE_PRIORITY[$byEmail[$email]['role']->value]) {
                        $byEmail[$email]['role'] = $role;
                    }

                    if ($programId !== null) {
                        $byEmail[$email]['programIds'][] = $programId;
                    }
                }
            } catch (\Throwable $e) {
                Log::warning("AdminUserSeeder: failed to fetch tab '{$tabName}': {$e->getMessage()}");
            }
        }

        return array_map(
            fn (string $email, array $data) => new SeedUser(
                name: $data['name'],
                email: $email,
                role: $data['role'],
                programIds: array_values(array_unique($data['programIds'])),
            ),
            array_keys($byEmail),
            $byEmail,
        );
    }

    private function saveUser(SeedUser $user): void
    {
        $model = User::firstOrCreate(
            ['email' => $user->email],
            ['name' => $user->name],
        )->forceFill([
            'role' => $user->role->value,
            'status' => 'approved',
        ]);

        $model->save();
        $model->programs()->sync($user->programIds);
    }
}