<x-mail::message>
# New Excuse Request

Hello {{ $instructor->name }},

May bagong **{{ $excuseRequest->type === 'late' ? 'late' : 'absence' }}** excuse request na naghihintay ng review mo.

<x-mail::panel>
**Student:** {{ $student->name }}  
**Class:** {{ $class->subject_name }}@if($class->section) ({{ $class->section }})@endif  
**Subjects missed:** {{ $excuseRequest->subjects_missed }}  
@if($excuseRequest->type === 'late')
**Minutes late:** {{ $excuseRequest->minutes_late }}  
@else
**Date of absence:** {{ $excuseRequest->start_date_of_absence?->format('M d, Y') }}@if($excuseRequest->end_date_of_absence) to {{ $excuseRequest->end_date_of_absence->format('M d, Y') }}@endif  
@endif
**Reason:** {{ $excuseRequest->reason }}
</x-mail::panel>

<x-mail::button :url="$reviewUrl">
Review Request
</x-mail::button>

Salamat,  
{{ config('app.name') }}
</x-mail::message>