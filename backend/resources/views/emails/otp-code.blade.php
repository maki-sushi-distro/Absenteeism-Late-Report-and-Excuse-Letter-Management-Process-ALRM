<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Your Verification Code</title>
</head>
<body style="margin:0; padding:0; background-color:#eef1f5; font-family:Arial, Helvetica, sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#eef1f5; padding:32px 12px;">
    <tr>
        <td align="center">
            <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 18px rgba(15,32,67,0.08);">

                {{-- Header --}}
                <tr>
                    <td align="center" style="background:linear-gradient(135deg,#0b2a52,#164a86); padding:32px 24px;">
                        <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:13px; letter-spacing:1.5px; text-transform:uppercase; color:#d9c07a; font-weight:bold;">
                            ALRM
                        </p>
                    </td>
                </tr>

                {{-- Body --}}
                <tr>
                    <td style="padding:36px 40px 8px;">
                        <h1 style="margin:0 0 8px; font-family:Arial, Helvetica, sans-serif; font-size:20px; color:#0b2a52;">
                            Hello {{ $name }},
                        </h1>
                        <p style="margin:0 0 24px; font-family:Arial, Helvetica, sans-serif; font-size:15px; line-height:1.6; color:#4a5568;">
                            Use the verification code below to complete your login to the ALRM system.
                        </p>
                    </td>
                </tr>

                {{-- OTP Code Box --}}
                <tr>
                    <td align="center" style="padding:0 40px 24px;">
                        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f4f7fb; border:1px dashed #164a86; border-radius:10px;">
                            <tr>
                                <td align="center" style="padding:22px 16px;">
                                    <span style="display:inline-block; font-family:'Courier New', Courier, monospace; font-size:34px; font-weight:bold; letter-spacing:10px; color:#0b2a52;">
                                        {{ $code }}
                                    </span>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>

                {{-- Expiry / Notes --}}
                <tr>
                    <td style="padding:0 40px 8px;">
                        <p style="margin:0 0 10px; font-family:Arial, Helvetica, sans-serif; font-size:14px; line-height:1.6; color:#4a5568;">
                            ⏱️ This code will expire in <strong>{{ $expiresInMinutes ?? 5 }} minutes</strong>.
                        </p>
                        <p style="margin:0 0 28px; font-family:Arial, Helvetica, sans-serif; font-size:14px; line-height:1.6; color:#8a94a6;">
                            If you did not request this code, you can safely ignore this email — no changes will be made to your account.
                        </p>
                    </td>
                </tr>

                <tr>
                    <td style="padding:0 40px;">
                        <hr style="border:none; border-top:1px solid #e6e9f0; margin:0 0 24px;">
                    </td>
                </tr>

                {{-- ALRM notification footer --}}
                <tr>
                    @include('mail.partials.footer')
                </tr>

            </table>

            <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%;">
                <tr>
                    <td align="center" style="padding:20px 12px 0;">
                        <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:11px; color:#9aa3b2;">
                            ALRM &middot; Attendance and Excuse Request Management
                        </p>
                    </td>
                </tr>
            </table>

        </td>
    </tr>
</table>
</body>
</html>