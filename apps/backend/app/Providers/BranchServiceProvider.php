<?php

namespace App\Providers;

use App\Interfaces\BranchServiceInterface;
use App\Services\BranchService;
use Illuminate\Support\ServiceProvider;

class BranchServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(BranchServiceInterface::class, BranchService::class);
    }

    public function boot(): void
    {
        //
    }
} 