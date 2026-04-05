<?php

namespace Tests\Unit;

use Illuminate\Support\Facades\Validator;
use Tests\TestCase;

class RoleColorValidationTest extends TestCase
{
    public function test_accepts_valid_hex_color(): void
    {
        $v = Validator::make(
            ['color' => '#aABBcc'],
            ['color' => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/']]
        );
        $this->assertTrue($v->passes());
    }

    public function test_rejects_invalid_hex_color(): void
    {
        $v = Validator::make(
            ['color' => '#abc'],
            ['color' => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/']]
        );
        $this->assertFalse($v->passes());
    }

    public function test_null_color_passes(): void
    {
        $v = Validator::make(
            ['color' => null],
            ['color' => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/']]
        );
        $this->assertTrue($v->passes());
    }
}
