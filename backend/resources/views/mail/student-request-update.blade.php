<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Request Update</title>
</head>
<body style="margin:0; padding:0; background-color:#eef1f5; font-family:Arial, Helvetica, sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#eef1f5; padding:32px 12px;">
    <tr>
        <td align="center">
            <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 18px rgba(15,32,67,0.08);">

                {{-- Header --}}
                <tr>
                    <td align="center" style="background-color:#0b2a52; background-image:linear-gradient(135deg,#0b2a52,#164a86); padding:32px 24px;">
                        <img src="{{ asset('images/mail/lv-logo.png') }}" alt="La Verdad Christian College" width="72" height="72" style="display:block; border:0; outline:none; text-decoration:none; border-radius:50%; background:#ffffff; padding:6px;">
                        <p style="margin:14px 0 0; font-family:Arial, Helvetica, sans-serif; font-size:13px; letter-spacing:1.5px; text-transform:uppercase; color:#d9c07a; font-weight:bold;">
                            La Verdad Christian College, Inc.
                        </p>
                    </td>
                </tr>

                {{-- Update message --}}
                <tr>
                    <td style="padding:36px 24px 8px;">
                        <p style="margin:0 0 12px; font-size:12px; letter-spacing:1.5px; text-transform:uppercase; color:#164a86; font-weight:bold;">Request Update</p>
                        <h1 style="margin:0 0 8px; font-size:20px; color:#0b2a52;">Hello {{ $student->name }},</h1>
                        <p style="margin:0 0 24px; font-size:15px; line-height:1.6; color:#4a5568;">
                            Your instructor has taken action on your <strong>{{ $excuseRequest->type === 'late' ? 'late' : 'absence' }}</strong> excuse request for <strong>{{ $class->subject_name }}</strong>. Please click the button below to view the details.
                        </p>
                    </td>
                </tr>
                <tr>
                    <td align="center" style="padding:0 24px 24px;">
                        <table role="presentation" cellpadding="0" cellspacing="0"><tr><td align="center" bgcolor="#164a86" style="border-radius:6px;">
                            <a href="{{ $viewUrl }}" style="display:inline-block; padding:15px 30px; border:1px solid #164a86; border-radius:6px; font-size:15px; font-weight:bold; color:#ffffff; text-decoration:none;">View Request</a>
                        </td></tr></table>
                    </td>
                </tr>
                <tr><td style="padding:0 24px;"><hr style="border:none; border-top:1px solid #e6e9f0; margin:0 0 24px;"></td></tr>

                {{-- Signature block --}}
                <tr>
                    <td style="padding:0 40px 32px; font-family:'Times New Roman', Times, serif;">
                        <p style="margin:0 0 4px; font-style:italic; font-size:13px; color:#1f3864;">"Wisdom Based on the Truth is Priceless."</p>
                        <p style="margin:0 0 2px; font-weight:bold; font-size:13.5px; color:#1f3864;">LA VERDAD CHRISTIAN COLLEGE, INC.</p>
                        <p style="margin:0 0 14px; font-style:italic; font-size:12.5px; color:#1f3864;">Mc Arthur Highway, Sampaloc, Apalit, Pampanga</p>
                        <p style="margin:0 0 18px; font-style:italic; font-size:11.5px; line-height:1.55; color:#1f3864;">
                            <strong style="font-style:italic;">Disclaimer:</strong> This communication may contain confidential or privileged information, and is intended solely for the individual or entity to whom it is originally addressed. Any disclosure, copying, dissemination, or any action taken in reliance on it by others, other than the intended recipient, is strictly prohibited. The opinions, conclusions, and statements expressed in this message are those of the sender and may not necessarily reflect the views of La Verdad Christian College, Inc.
                        </p>
                        <img src="{{ asset('images/mail/lv-badges.png') }}" alt="La Verdad Christian College Seal and DPO/DPS Registered" height="60" style="display:block; border:0; outline:none; text-decoration:none;">
                    </td>
                </tr>
            </table>

            <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%;">
                <tr>
                    <td align="center" style="padding:20px 12px 0;">
                        <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:11px; color:#9aa3b2;">
                            &copy; {{ date('Y') }} La Verdad Christian College, Inc. All rights reserved.
                        </p>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>
</body>
</html>