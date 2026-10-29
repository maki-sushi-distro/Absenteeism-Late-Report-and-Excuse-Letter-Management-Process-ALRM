<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class SendOtpCode extends Notification
{
    use Queueable;

    public function __construct(
        private readonly string $code,
        private readonly int $expiresInMinutes = 5,
    ) {}

    /**
     * Get the notification's delivery channels.
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    /**
     * Get the mail representation of the notification.
     *
     * Uses a fully custom Blade view (resources/views/emails/otp-code.blade.php)
     * instead of the default Markdown mail template, so we control the
     * ALRM branding, layout, and authentication-specific security notice.
     */
    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('[ALRM] Email verification code')
            ->view(['html' => 'emails.otp-code', 'text' => 'emails.otp-code-text'], [
                'name'              => $notifiable->name,
                'code'              => $this->code,
                'expiresInMinutes'  => $this->expiresInMinutes,
            ]);
    }
}
