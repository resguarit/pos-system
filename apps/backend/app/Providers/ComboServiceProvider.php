<?php

declare(strict_types=1);

namespace App\Providers;

use App\Interfaces\ComboServiceInterface;
use App\Services\ComboService;
use Illuminate\Support\ServiceProvider;

class ComboServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     */
    public function register(): void
    {
        $this->app->bind(ComboServiceInterface::class, ComboService::class);
    }

    /**
     * Bootstrap services.
     */
    public function boot(): void
    {
        //
    }
}

