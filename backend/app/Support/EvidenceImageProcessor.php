<?php

namespace App\Support;

use InvalidArgumentException;
use RuntimeException;

final class EvidenceImageProcessor
{
    public static function process(string $data, string $mime): string
    {
        if (! extension_loaded('gd')) {
            throw new RuntimeException('The GD extension is required for evidence images.');
        }

        $expectedType = match ($mime) {
            'image/jpeg' => IMAGETYPE_JPEG,
            'image/png' => IMAGETYPE_PNG,
            default => throw new InvalidArgumentException('Choose a JPG or PNG image.'),
        };
        $info = @getimagesizefromstring($data);
        if (! $info || $info[2] !== $expectedType) {
            throw new InvalidArgumentException('The image contents do not match its type.');
        }

        [$width, $height] = $info;
        // Check the dimensions before allocating a decoded bitmap.
        if ($width < 1 || $height < 1 || $width > 8192 || $height > 8192
            || $width * $height > 8_000_000) {
            throw new InvalidArgumentException('Image dimensions are too large. Choose a smaller image.');
        }

        $source = @imagecreatefromstring($data);
        if ($source === false) {
            throw new InvalidArgumentException('The image is corrupt or cannot be decoded.');
        }

        $scale = min(1, 1600 / max($width, $height));
        $targetWidth = max(1, (int) round($width * $scale));
        $targetHeight = max(1, (int) round($height * $scale));
        $canvas = imagecreatetruecolor($targetWidth, $targetHeight);
        if ($canvas === false) {
            throw new RuntimeException('Unable to create an evidence image.');
        }
        imagefill($canvas, 0, 0, imagecolorallocate($canvas, 255, 255, 255));
        if (! imagecopyresampled($canvas, $source, 0, 0, 0, 0, $targetWidth, $targetHeight, $width, $height)) {
            throw new RuntimeException('Unable to resize an evidence image.');
        }

        ob_start();
        try {
            if (! imagejpeg($canvas, null, 85)) {
                throw new RuntimeException('Unable to encode an evidence image.');
            }
            $result = ob_get_contents();
        } finally {
            ob_end_clean();
        }

        if (! is_string($result) || $result === '' || strlen($result) > 2 * 1024 * 1024) {
            throw new InvalidArgumentException('The processed image exceeds the 2MB upload limit.');
        }

        // Only freshly encoded pixels are returned; original metadata/trailing bytes are omitted.
        return $result;
    }
}
