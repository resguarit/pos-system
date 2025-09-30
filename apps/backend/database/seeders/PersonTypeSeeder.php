<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\PersonType;

class PersonTypeSeeder extends Seeder
{
    public function run(): void
    {
        $data = [
            ['name' => 'Física'],
            ['name' => 'Jurídica'],
        ];
        foreach ($data as $item) {
            PersonType::create($item);
        }
    }
}
