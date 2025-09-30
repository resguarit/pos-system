<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\BranchController;

Route::get('/', function () {
    return view('welcome');
});

// Route::resource('branches', BranchController::class);
