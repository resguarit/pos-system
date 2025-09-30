<?php

namespace App\Providers;

use App\Interfaces\StockServiceInterface;
use App\Services\StockService;
use Illuminate\Support\ServiceProvider;

class StockServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     */
    public function register(): void
    {
        $this->app->bind(StockServiceInterface::class, StockService::class);
    }

    /**
     * Bootstrap services.
     */
    public function boot(): void
    {
        //
    }
}