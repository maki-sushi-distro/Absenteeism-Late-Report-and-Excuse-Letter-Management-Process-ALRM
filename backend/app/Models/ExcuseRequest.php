<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

#[Fillable([
    'enrollment_id',
    'type',
    'date_of_absence',
    'reason',
    'evidence_file_url',
    'status',
    'date_reviewed',
    'reviewed_by',
])]
class ExcuseRequest extends Model
{
    /** @use HasFactory<\Database\Factories\ExcuseRequestFactory> */
    use HasFactory;

    // Actual table name is 'requests'
    protected $table = 'requests';

    /*
    |--------------------------------------------------------------------------
    | Casts
    |--------------------------------------------------------------------------
    */

    protected function casts(): array
    {
        return [
            'date_of_absence' => 'date',
            'date_reviewed'   => 'datetime',
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | Relationships
    |--------------------------------------------------------------------------
    */

    /**
     * The enrollment this request was filed under.
     * Resolves student + class + instructor automatically — never from user input.
     */
    public function enrollment(): BelongsTo
    {
        return $this->belongsTo(Enrollment::class);
    }

    /**
     * The user who reviewed this request (instructor/program_head).
     */
    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    /**
     * The follow-up flag associated with this request (if any).
     */
    public function followupFlag(): HasOne
    {
        return $this->hasOne(FollowupFlag::class, 'request_id');
    }

    /**
     * Notifications triggered by this request.
     */
    public function notifications(): HasMany
    {
        return $this->hasMany(UserNotification::class, 'request_id');
    }
}