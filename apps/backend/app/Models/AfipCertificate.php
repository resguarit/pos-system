<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;

class AfipCertificate extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'cuit',
        'razon_social',
        'environment',
        'alias',
        'valid_from',
        'valid_to',
        'active',
        'has_certificate',
        'has_private_key',
        'notes',
    ];

    protected $casts = [
        'valid_from' => 'date',
        'valid_to' => 'date',
        'active' => 'boolean',
        'has_certificate' => 'boolean',
        'has_private_key' => 'boolean',
    ];

    /**
     * Base path for certificates storage
     */
    public static function getBasePath(): string
    {
        return config('afip.certificates_base_path', storage_path('certificates'));
    }

    /**
     * Get the certificate directory path for this CUIT
     */
    public function getCertificateDirectoryAttribute(): string
    {
        return self::getBasePath() . '/' . $this->cuit;
    }

    /**
     * Get the certificate file path
     */
    public function getCertificatePathAttribute(): string
    {
        return $this->certificate_directory . '/certificate.crt';
    }

    /**
     * Get the private key file path
     */
    public function getPrivateKeyPathAttribute(): string
    {
        return $this->certificate_directory . '/private.key';
    }

    /**
     * Check if certificate files exist and update flags
     */
    public function syncCertificateStatus(): self
    {
        $this->has_certificate = file_exists($this->certificate_path);
        $this->has_private_key = file_exists($this->private_key_path);
        
        // Try to extract validity dates from certificate
        if ($this->has_certificate) {
            $this->extractCertificateDates();
        }
        
        $this->save();
        
        return $this;
    }

    /**
     * Extract validity dates from certificate file
     */
    protected function extractCertificateDates(): void
    {
        try {
            $certContent = file_get_contents($this->certificate_path);
            $certInfo = openssl_x509_parse($certContent);
            
            if ($certInfo) {
                if (isset($certInfo['validFrom_time_t'])) {
                    $this->valid_from = date('Y-m-d', $certInfo['validFrom_time_t']);
                }
                if (isset($certInfo['validTo_time_t'])) {
                    $this->valid_to = date('Y-m-d', $certInfo['validTo_time_t']);
                }
            }
        } catch (\Exception $e) {
            // Silently fail - dates will remain null
        }
    }

    /**
     * Check if certificate is valid (not expired)
     */
    public function isValid(): bool
    {
        if (!$this->active) {
            return false;
        }
        
        if (!$this->has_certificate || !$this->has_private_key) {
            return false;
        }
        
        if ($this->valid_to && $this->valid_to->isPast()) {
            return false;
        }
        
        return true;
    }

    /**
     * Check if certificate is expiring soon (within 30 days)
     */
    public function isExpiringSoon(int $days = 30): bool
    {
        if (!$this->valid_to) {
            return false;
        }
        
        return $this->valid_to->diffInDays(now()) <= $days;
    }

    /**
     * Scope for active certificates
     */
    public function scopeActive($query)
    {
        return $query->where('active', true);
    }

    /**
     * Scope for valid certificates (active + has files + not expired)
     */
    public function scopeValid($query)
    {
        return $query->active()
            ->where('has_certificate', true)
            ->where('has_private_key', true)
            ->where(function ($q) {
                $q->whereNull('valid_to')
                  ->orWhere('valid_to', '>=', now());
            });
    }

    /**
     * Scope for specific environment
     */
    public function scopeForEnvironment($query, string $environment)
    {
        return $query->where('environment', $environment);
    }

    /**
     * Find certificate by CUIT
     */
    public static function findByCuit(string $cuit): ?self
    {
        $cleanCuit = preg_replace('/[^0-9]/', '', $cuit);
        return static::where('cuit', $cleanCuit)->first();
    }

    /**
     * Get display name
     */
    public function getDisplayNameAttribute(): string
    {
        if ($this->alias) {
            return $this->alias;
        }
        
        return $this->razon_social ?: $this->formatted_cuit;
    }

    /**
     * Get formatted CUIT (XX-XXXXXXXX-X)
     */
    public function getFormattedCuitAttribute(): string
    {
        return substr($this->cuit, 0, 2) . '-' . 
               substr($this->cuit, 2, 8) . '-' . 
               substr($this->cuit, 10, 1);
    }

    /**
     * Create certificate directory if not exists
     */
    public function ensureDirectoryExists(): bool
    {
        $path = $this->certificate_directory;
        
        if (!is_dir($path)) {
            return mkdir($path, 0700, true);
        }
        
        return true;
    }

    /**
     * Store certificate file
     */
    public function storeCertificate(string $content): bool
    {
        $this->ensureDirectoryExists();
        
        $result = file_put_contents($this->certificate_path, $content);
        
        if ($result !== false) {
            $this->has_certificate = true;
            $this->extractCertificateDates();
            $this->save();
            return true;
        }
        
        return false;
    }

    /**
     * Store private key file
     */
    public function storePrivateKey(string $content): bool
    {
        $this->ensureDirectoryExists();
        
        $result = file_put_contents($this->private_key_path, $content);
        chmod($this->private_key_path, 0600); // Secure permissions
        
        if ($result !== false) {
            $this->has_private_key = true;
            $this->save();
            return true;
        }
        
        return false;
    }
}
