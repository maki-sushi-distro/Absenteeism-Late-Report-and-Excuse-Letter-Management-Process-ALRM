<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\ClassModel;
use App\Models\Program;
use App\Models\User;
use Google\Client as GoogleClient;
use Google\Service\Sheets as GoogleSheets;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * A single meeting slot for a subject (one day, one time range).
 * Stored as JSON inside ClassModel::schedule.
 */
final readonly class MeetingSlot
{
    public function __construct(
        public string $day,
        public string $start,
        public string $end,
        public ?string $room,
    ) {}

    /** @return array{day: string, start: string, end: string, room: string|null} */
    public function toArray(): array
    {
        return [
            'day' => $this->day,
            'start' => $this->start,
            'end' => $this->end,
            'room' => $this->room,
        ];
    }
}

/**
 * All meeting slots collected for a single subject within one
 * program + year_level + semester + school_year, before it becomes
 * a ClassModel row.
 */
final class ParsedClass
{
    /** @var MeetingSlot[] */
    public array $slots = [];

    public ?string $instructorName = null;

    public function __construct(
        public readonly string $subjectName,
        public readonly string $programName,
        public readonly string $yearLevel,
        public readonly string $semester,
        public readonly string $schoolYear,
    ) {}

    /**
     * Grouping key — every meeting slot for the same subject, in the
     * same program/year_level/semester/school_year, collapses into
     * one Class row under this key.
     */
    public function key(): string
    {
        return implode('|', [
            $this->programName,
            $this->yearLevel,
            $this->semester,
            $this->schoolYear,
            mb_strtolower($this->subjectName),
        ]);
    }
}

class ClassSeeder extends Seeder
{
    /**
     * Google Sheet ID of the class schedule (from the URL, between
     * /d/ and /edit).
     */
    private const string SPREADSHEET_ID = '1K2ZHj-hkHKffwbKqdbeza_ZPj77K8uBZZWtOO7pYEFA';

    private const string CREDENTIALS_PATH = 'app/google/service-account.json';

    private const string RENDER_SECRET_CREDENTIALS_PATH = '/etc/secrets/service-account.json';

    /**
     * Sheet tab name => program_name in the `programs` table. Must
     * match ProgramSeeder::PROGRAM_NAMES exactly. Note this is a
     * different (finer-grained) mapping than
     * AdminUserSeeder::TAB_TO_PROGRAM_NAME — that seeder reads a
     * *different* spreadsheet (the instructor roster) where BSA/BSAIS
     * and BSIS/ACT are combined into single tabs. Here, the class
     * schedule sheet has one tab per program, so we map 1:1.
     */
    private const array TAB_TO_PROGRAM_NAME = [
        'BSIS' => 'Bachelor of Science in Information System',
        'ACT' => 'Associate in Computer Technology',
        'BSA' => 'Bachelor of Science in Accountancy',
        'BSAIS' => 'Bachelor of Science in Accounting Information System',
        'BAB' => 'Bachelor of Arts in Broadcasting',
        'BSSW' => 'Bachelor of Science in Social Work',
    ];

    /**
     * Day-column index (0-indexed, relative to the sheet's columns
     * A=0, B=1, ...) => short day code used in the schedule JSON.
     * Column A is always blank/label, so real data starts at B (index 1).
     */
    private const array DAY_COLUMNS = [
        1 => 'Mon',
        2 => 'Tue',
        3 => 'Wed',
        4 => 'Thu',
        5 => 'Fri',
        6 => 'Sat',
    ];

    /**
     * If a block's subject text OR instructor-line text contains any
     * of these (case-insensitive), the whole 4-row entry is skipped —
     * it's an administrative block (clean-up, program meetings,
     * student activities), not a real subject.
     */
    private const array SKIP_KEYWORDS = [
        'weekly clean-up',
        'dedicated time for',
        'program meetings',
        'student activity program',
    ];

    private const array HONORIFIC_PREFIXES = [
        'Mr.', 'Ms.', 'Mrs.', 'Dr.', 'Engr.', 'Atty.', 'Prof.', 'Fr.', 'Sr.',
    ];

    public function run(): void
    {
        $service = $this->makeSheetsService();

        /** @var array<string, ParsedClass> $parsed */
        $parsed = [];

        foreach (self::TAB_TO_PROGRAM_NAME as $tabName => $programName) {
            $values = $this->fetchTabValues($service, $tabName);

            if ($values === null) {
                Log::warning("ClassSeeder: could not read tab '{$tabName}', skipping.");

                continue;
            }

            $this->parseTab($values, $programName, $parsed);
        }

        $instructorMap = $this->buildInstructorNameMap();

        /** @var array<string, string[]> $unmatchedInstructors name => [subjects] */
        $unmatchedInstructors = [];
        $created = 0;
        $updated = 0;

        DB::transaction(function () use ($parsed, $instructorMap, &$unmatchedInstructors, &$created, &$updated) {
            foreach ($parsed as $entry) {
                $program = Program::query()->firstWhere('program_name', $entry->programName);

                if ($program === null) {
                    Log::warning("ClassSeeder: no program row found for '{$entry->programName}', skipping subject '{$entry->subjectName}'.");

                    continue;
                }

                $instructorId = null;

                if ($entry->instructorName !== null) {
                    $normalized = $this->normalizeName($entry->instructorName);

                    if (isset($instructorMap[$normalized])) {
                        $instructorId = $instructorMap[$normalized];
                    } else {
                        $unmatchedInstructors[$entry->instructorName][] = $entry->subjectName;
                    }
                }

                $wasNew = ! ClassModel::query()
                    ->where('subject_name', $entry->subjectName)
                    ->where('program_id', $program->id)
                    ->where('year_level', $entry->yearLevel)
                    ->where('semester', $entry->semester)
                    ->where('school_year', $entry->schoolYear)
                    ->exists();

                ClassModel::updateOrCreate(
                    [
                        'subject_name' => $entry->subjectName,
                        'program_id' => $program->id,
                        'year_level' => $entry->yearLevel,
                        'semester' => $entry->semester,
                        'school_year' => $entry->schoolYear,
                    ],
                    [
                        'instructor_id' => $instructorId,
                        'section' => null,
                        'schedule' => array_map(fn (MeetingSlot $s) => $s->toArray(), $entry->slots),
                    ]
                );

                $wasNew ? $created++ : $updated++;
            }
        });

        Log::info('ClassSeeder: run summary', [
            'created' => $created,
            'updated' => $updated,
            'unmatched_instructors' => array_keys($unmatchedInstructors),
        ]);

        if (! empty($unmatchedInstructors)) {
            $lines = [];
            foreach ($unmatchedInstructors as $name => $subjects) {
                $lines[] = "  - \"{$name}\" (subjects: ".implode(', ', array_unique($subjects)).')';
            }

            throw new \RuntimeException(
                "ClassSeeder: the following instructor names in the schedule could not be matched to any user in the `users` table (roles: instructor, program_head). ".
                "Fix the roster sheet or the schedule sheet's spelling, then re-run:\n".
                implode("\n", $lines)
            );
        }
    }

    private function makeSheetsService(): GoogleSheets
    {
        $client = new GoogleClient();
        $client->setApplicationName('ClassSeeder');
        $client->setScopes([GoogleSheets::SPREADSHEETS_READONLY]);
        $client->setAuthConfig($this->resolveCredentialsPath());

        return new GoogleSheets($client);
    }

    private function resolveCredentialsPath(): string
    {
        if (file_exists(self::RENDER_SECRET_CREDENTIALS_PATH)) {
            return self::RENDER_SECRET_CREDENTIALS_PATH;
        }

        return storage_path(self::CREDENTIALS_PATH);
    }

    /**
     * @return array<int, array<int, string|null>>|null  0-indexed rows/cols
     */
    private function fetchTabValues(GoogleSheets $service, string $tabName): ?array
    {
        try {
            $range = "'{$tabName}'!A1:H200";
            $response = $service->spreadsheets_values->get(self::SPREADSHEET_ID, $range);

            return $response->getValues() ?? [];
        } catch (\Throwable $e) {
            Log::warning("ClassSeeder: failed to fetch tab '{$tabName}': {$e->getMessage()}");

            return null;
        }
    }

    /**
     * Locates every "<PROGRAM> - Nth YEAR" block within a tab and
     * hands each one off to parseBlock().
     *
     * @param  array<int, array<int, string|null>>  $values
     * @param  array<string, ParsedClass>  $parsed
     */
    private function parseTab(array $values, string $programName, array &$parsed): void
    {
        $rowCount = count($values);

        $blockStarts = [];
        for ($r = 0; $r < $rowCount; $r++) {
            $cellB = trim((string) ($values[$r][1] ?? ''));

            if (preg_match('/-\s*(1st|2nd|3rd|4th)\s*YEAR/i', $cellB, $m)) {
                $blockStarts[] = ['row' => $r, 'yearLevel' => strtolower($m[1])];
            }
        }

        foreach ($blockStarts as $i => $block) {
            $startRow = $block['row'];
            $endRow = $blockStarts[$i + 1]['row'] ?? $rowCount; // exclusive

            // Semester/school_year line sits one row below the header.
            $semLine = trim((string) ($values[$startRow + 1][1] ?? ''));

            if (! preg_match('/(1st|2nd|3rd|4th)\s*Semester,\s*A\.Y\.\s*(\d{4}-\d{4})/i', $semLine, $sm)) {
                Log::warning("ClassSeeder ({$programName}): could not parse semester/school_year near row ".($startRow + 2).', skipping block.');

                continue;
            }

            $semester = strtolower($sm[1]);
            $schoolYear = $sm[2];

            // Day header row (MONDAY..SATURDAY) sits two rows below the
            // header; actual data starts the row after that.
            $dataStart = $startRow + 3;

            $this->parseBlock($values, $dataStart, $endRow, $programName, $block['yearLevel'], $semester, $schoolYear, $parsed);
        }
    }

    /**
     * Scans each day-column independently, since meeting entries for
     * different days in the same block don't share the same row
     * offset (e.g. Monday's first entry might start 4 rows before
     * Wednesday's).
     *
     * @param  array<int, array<int, string|null>>  $values
     * @param  array<string, ParsedClass>  $parsed
     */
    private function parseBlock(
        array $values,
        int $dataStart,
        int $dataEnd,
        string $programName,
        string $yearLevel,
        string $semester,
        string $schoolYear,
        array &$parsed
    ): void {
        foreach (self::DAY_COLUMNS as $col => $dayCode) {
            $r = $dataStart;

            while ($r < $dataEnd) {
                $cell = trim((string) ($values[$r][$col] ?? ''));

                if ($cell === '' || ! preg_match('/^\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}$/', $cell)) {
                    $r++;

                    continue;
                }

                [$start, $end] = array_map('trim', explode('-', $cell, 2));
                $subject = trim((string) ($values[$r + 1][$col] ?? ''));
                $instructor = trim((string) ($values[$r + 2][$col] ?? ''));
                $room = trim((string) ($values[$r + 3][$col] ?? ''));

                $r += 4;

                if ($subject === '' || $this->isSkippable($subject, $instructor)) {
                    continue;
                }

                $entry = new ParsedClass($subject, $programName, $yearLevel, $semester, $schoolYear);
                $key = $entry->key();

                if (! isset($parsed[$key])) {
                    $parsed[$key] = $entry;
                }

                if ($instructor !== '') {
                    if ($parsed[$key]->instructorName === null) {
                        $parsed[$key]->instructorName = $instructor;
                    } elseif ($this->normalizeName($parsed[$key]->instructorName) !== $this->normalizeName($instructor)) {
                        Log::warning("ClassSeeder: subject '{$subject}' ({$programName}, {$yearLevel} year) has inconsistent instructor names across meeting days: '{$parsed[$key]->instructorName}' vs '{$instructor}'. Keeping the first one seen.");
                    }
                }

                $parsed[$key]->slots[] = new MeetingSlot(
                    day: $dayCode,
                    start: $this->normalizeTime($start),
                    end: $this->normalizeTime($end),
                    room: $room !== '' ? $room : null,
                );
            }
        }
    }

    private function isSkippable(string $subject, string $instructor): bool
    {
        $haystack = mb_strtolower($subject.' '.$instructor);

        foreach (self::SKIP_KEYWORDS as $keyword) {
            if (str_contains($haystack, $keyword)) {
                return true;
            }
        }

        return false;
    }

    private function normalizeTime(string $time): string
    {
        [$h, $m] = array_pad(explode(':', $time), 2, '00');

        return sprintf('%02d:%02d', (int) $h, (int) $m);
    }

    /**
     * @return array<string, string>  normalized full name => user UUID
     */
    private function buildInstructorNameMap(): array
    {
        return User::query()
            ->whereIn('role', ['instructor', 'program_head'])
            ->get(['id', 'name'])
            ->mapWithKeys(fn (User $u) => [$this->normalizeName($u->name) => $u->id])
            ->all();
    }

    private function normalizeName(string $name): string
    {
        $name = trim($name);

        foreach (self::HONORIFIC_PREFIXES as $prefix) {
            if (stripos($name, $prefix.' ') === 0) {
                $name = trim(substr($name, strlen($prefix)));

                break;
            }
        }

        return mb_strtolower(preg_replace('/\s+/', ' ', $name));
    }
}