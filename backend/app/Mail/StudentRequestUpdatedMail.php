<?php

namespace App\Mail;

use App\Models\ExcuseRequest;
use App\Models\User;
use App\Models\ClassModel; 
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class StudentRequestUpdatedMail extends Mailable
{
    public function __construct(
        public ExcuseRequest $excuseRequest,
        public User $student,
        public ClassModel $class,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Update on Your Excuse Request');
    }

    public function content(): Content
    {
        return new Content(
            view: 'mail.student-request-update',
            with: [
                'viewUrl' => rtrim(config('app.frontend_url'), '/') . '/dashboard',
            ],
        );
    }
}
