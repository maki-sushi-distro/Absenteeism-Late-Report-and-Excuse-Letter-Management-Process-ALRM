<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\ClassModel;
use App\Models\Enrollment;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class DevInstructorClassSeeder extends Seeder
{
    public const array DEV_INSTRUCTOR_EMAILS = [
        'marwin.mandocdoc@student.laverdad.edu.ph',
        'macrobert.savandal@student.laverdad.edu.ph',
        'jimueljarina@student.laverdad.edu.ph',
        'ranceljoycuervo@student.laverdad.edu.ph',
    ];

    private const string PREFERRED_SUBJECT_PREFIX = 'System Integration and Architecture';

    public function run(): void
    {
        $devs = User::query()->whereIn('email', self::DEV_INSTRUCTOR_EMAILS)->get();

        $missing = array_values(array_diff(self::DEV_INSTRUCTOR_EMAILS, $devs->pluck('email')->all()));

        if ($missing !== []) {
            $msg = 'DevInstructorClassSeeder: dev user(s) not found, run AdminUserSeeder first: ' . implode(', ', $missing);
            Log::warning($msg);
            $this->command?->warn($msg);
        }

        if ($devs->isEmpty()) {
            return;
        }

        $devIds = $devs->pluck('id')->all();

        $enrolledClassIds = Enrollment::query()->distinct()->pluck('class_id')->flip();

        $groups = ClassModel::query()
            ->where(fn ($q) => $q->whereNull('instructor_id')->orWhereNotIn('instructor_id', $devIds))
            ->orderBy('subject_name')
            ->get()
            ->groupBy(fn (ClassModel $c) => implode('|', [
                $c->program_id,
                $c->year_level,
                $c->semester,
                $c->school_year,
                $c->section,
            ]));

        $sources = collect();
        $skippedSections = [];
        $fallbackSections = [];

        foreach ($groups as $group) {
            $pool = $group->filter(fn (ClassModel $c) => $enrolledClassIds->has($c->id));

            if ($pool->isEmpty()) {
                $skippedSections[] = $group->first()->section;

                continue;
            }

            $preferred = $pool->first(fn (ClassModel $c) => str_starts_with($c->subject_name, self::PREFERRED_SUBJECT_PREFIX));

            if ($preferred === null) {
                $fallbackSections[] = $group->first()->section;
            }

            $sources->push($preferred ?? $pool->first());
        }

        if ($sources->isEmpty()) {
            $msg = 'DevInstructorClassSeeder: no source class with enrollments found.';
            Log::warning($msg);
            $this->command?->warn($msg);

            return;
        }

        $enrollmentsAdded = 0;
        $keepIds = [];

        foreach ($sources as $source) {
            $toMirror = Enrollment::query()->where('class_id', $source->id)->get();

            foreach ($devs as $dev) {
                $copy = ClassModel::updateOrCreate(
                    [
                        'subject_name' => $source->subject_name,
                        'program_id' => $source->program_id,
                        'year_level' => $source->year_level,
                        'semester' => $source->semester,
                        'school_year' => $source->school_year,
                        'section' => $source->section,
                        'instructor_id' => $dev->id,
                    ],
                    ['schedule' => $source->schedule],
                );

                $keepIds[] = $copy->id;

                $existing = Enrollment::query()
                    ->where('class_id', $copy->id)
                    ->pluck('student_id')
                    ->flip();

                foreach ($toMirror as $enrollment) {
                    if ($enrollment->student_id === $dev->id || $existing->has($enrollment->student_id)) {
                        continue;
                    }

                    Enrollment::create([
                        'student_id' => $enrollment->student_id,
                        'class_id' => $copy->id,
                        'year_level' => $enrollment->year_level,
                    ]);

                    $enrollmentsAdded++;
                }
            }
        }

        $removedStale = ClassModel::query()
            ->whereIn('instructor_id', $devIds)
            ->whereNotIn('id', $keepIds)
            ->delete();

        Log::info('ClassSeeder: dev classes synced', [
            'dev_users' => $devs->count(),
            'sections' => $sources->count(),
            'enrollments_added' => $enrollmentsAdded,
            'removed_stale_dev_classes' => $removedStale,
            'skipped_sections_without_enrollments' => $skippedSections,
        ]);

        $this->command?->info("Dev classes synced: {$devs->count()} dev user(s) x {$sources->count()} section(s), {$enrollmentsAdded} enrollment(s) added, {$removedStale} stale removed.");

        $conn = DB::connection();
        $this->command?->info('DB used: ' . $conn->getConfig('host') . ' / ' . $conn->getDatabaseName());
        $this->command?->info('Dev classes now in DB: ' . ClassModel::query()->whereIn('instructor_id', $devIds)->count());

        $this->command?->info('Picked: ' . $sources->map(fn (ClassModel $c) => "{$c->section} => {$c->subject_name}")->implode(' | '));

        if ($fallbackSections !== []) {
            $this->command?->warn("'" . self::PREFERRED_SUBJECT_PREFIX . "' not found (with enrollments) in: " . implode(', ', array_unique($fallbackSections)));
        }

        if ($skippedSections !== []) {
            $this->command?->warn('Skipped (no enrollments): ' . implode(', ', array_unique($skippedSections)));
        }
    }
}