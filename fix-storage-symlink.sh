#!/bin/bash
echo "🔧 Fixing storage symlink on production server..."

ssh -p 5507 posdeployer@149.50.138.145 << 'REMOTE'
    echo "1️⃣ Navigating to backend directory..."
    cd /home/api.heroedelwhisky.com.ar/public_html/apps/backend
    
    echo "2️⃣ Creating storage symlink..."
    php artisan storage:link
    
    echo "3️⃣ Verifying symlink exists..."
    ls -la public/storage
    
    echo "4️⃣ Setting permissions..."
    chmod -R 755 storage/app/public
    chown -R www-data:www-data storage/app/public
    
    echo "5️⃣ Checking if logo files exist..."
    ls -la storage/app/public/system/logos/
    
    echo "✅ Storage symlink fixed!"
REMOTE

echo ""
echo "✅ Fix applied! Now re-upload your logo in the application."

