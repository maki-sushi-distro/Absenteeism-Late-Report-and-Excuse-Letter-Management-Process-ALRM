<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\RequestAttachment;
use Illuminate\Http\Request;

class EvidenceController extends Controller
{
    /**
     * Upload ng supporting document. Sa database ise-save ang file.
     * ID ng attachment ang ibinabalik (sa key na "path", para hindi na
     * magbago ang frontend); ito ang ipapasa sa POST /requests.
     */
    public function store(Request $request)
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:2048'], // 2MB
        ]);

        $file = $request->file('file');

        $attachment = RequestAttachment::create([
            'user_id'       => $request->user()->id,
            'original_name' => mb_substr($file->getClientOriginalName(), 0, 255),
            'mime_type'     => $file->getMimeType(),
            'size'          => $file->getSize(),
            'data'          => file_get_contents($file->getRealPath()),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'File uploaded.',
            'data'    => [
                'path' => $attachment->id,
                'name' => $attachment->original_name,
                'type' => $attachment->mime_type,
            ],
        ], 201);
    }
}