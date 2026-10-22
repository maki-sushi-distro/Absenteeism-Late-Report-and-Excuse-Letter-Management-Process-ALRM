<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    private bool $authenticatedExchange = false;

    public static function forExchange($user): self
    {
        $resource = new self($user);
        $resource->authenticatedExchange = true;

        return $resource;
    }

    public function toArray(Request $request): array
    {
        $fields = ['id', 'name', 'email', 'role', 'program_id', 'school_student_id',
            'status', 'year_level', 'heads_program', 'headed_program_exists'];
        if ($this->authenticatedExchange || $request->user()?->id === $this->id || $request->user()?->role === 'administrator') {
            $fields = [...$fields, 'guardian_name', 'contact_number'];
        }

        return $this->resource->only($fields) + [
            'program' => $this->whenLoaded('program'),
            'programs' => $this->whenLoaded('programs'),
        ];
    }
}
