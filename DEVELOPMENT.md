# 🛠️ Development Guide

This guide covers the development workflow, coding standards, and best practices for the POS System.

## 🏗️ Project Structure

### Monorepo Organization

```
pos-system/
├── apps/
│   ├── frontend/                 # React + TypeScript + Vite
│   │   ├── src/
│   │   │   ├── components/       # Reusable UI components
│   │   │   ├── pages/           # Page components
│   │   │   ├── hooks/           # Custom React hooks
│   │   │   ├── lib/             # Utility libraries
│   │   │   ├── types/           # TypeScript type definitions
│   │   │   ├── context/         # React context providers
│   │   │   └── assets/          # Static assets
│   │   ├── public/              # Public static files
│   │   ├── dist/                # Built files (production)
│   │   ├── package.json         # Frontend dependencies
│   │   ├── vite.config.ts       # Vite configuration
│   │   ├── tailwind.config.ts   # Tailwind CSS configuration
│   │   └── tsconfig.json        # TypeScript configuration
│   └── backend/                 # Laravel + PHP
│       ├── app/
│       │   ├── Http/
│       │   │   ├── Controllers/ # API controllers
│       │   │   ├── Middleware/  # Custom middleware
│       │   │   ├── Requests/    # Form request validation
│       │   │   └── Resources/   # API resources
│       │   ├── Models/          # Eloquent models
│       │   ├── Services/        # Business logic services
│       │   ├── Interfaces/      # Service interfaces
│       │   ├── Events/          # Event classes
│       │   ├── Listeners/       # Event listeners
│       │   └── Rules/           # Custom validation rules
│       ├── config/              # Configuration files
│       ├── database/
│       │   ├── migrations/      # Database migrations
│       │   ├── seeders/         # Database seeders
│       │   └── factories/       # Model factories
│       ├── routes/              # Route definitions
│       ├── storage/             # Logs, cache, and uploads
│       ├── tests/               # Test files
│       ├── composer.json        # Backend dependencies
│       └── artisan              # Laravel command line tool
├── .github/workflows/           # CI/CD pipelines
├── scripts/                     # Development and deployment scripts
├── package.json                 # Monorepo configuration
└── README.md                    # Project documentation
```

## 🚀 Development Workflow

### Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/resguarit/pos-system.git
   cd pos-system
   ```

2. **Install dependencies**
   ```bash
   ./scripts/dev.sh install
   ```

3. **Set up environment**
   ```bash
   # Frontend
   cp apps/frontend/.env.example apps/frontend/.env.development
   
   # Backend
   cp apps/backend/.env.example apps/backend/.env
   ```

4. **Start development servers**
   ```bash
   ./scripts/dev.sh dev
   ```

### Development Commands

#### Root Level Commands
```bash
# Development
./scripts/dev.sh install    # Install all dependencies
./scripts/dev.sh dev        # Start development servers
./scripts/dev.sh build      # Build for production
./scripts/dev.sh test       # Run all tests
./scripts/dev.sh lint       # Lint code
./scripts/dev.sh check      # Check dependencies

# Deployment
./scripts/deploy.sh frontend  # Deploy frontend only
./scripts/deploy.sh backend   # Deploy backend only
./scripts/deploy.sh all       # Deploy both
./scripts/deploy.sh check     # Check deployment environment
```

#### Frontend Commands
```bash
cd apps/frontend

# Development
npm run dev              # Start Vite dev server (http://localhost:3000)
npm run build            # Build for production
npm run preview          # Preview production build
npm run lint             # Lint code with ESLint
npm run type-check       # TypeScript type checking

# Testing
npm test                 # Run tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage
```

#### Backend Commands
```bash
cd apps/backend

# Development
php artisan serve        # Start Laravel dev server (http://localhost:8000)
php artisan tinker       # Interactive PHP shell
php artisan route:list   # List all routes
php artisan config:cache # Cache configuration
php artisan route:cache  # Cache routes
php artisan view:cache   # Cache views

# Database
php artisan migrate      # Run migrations
php artisan migrate:rollback # Rollback last migration
php artisan db:seed      # Run seeders
php artisan make:migration # Create new migration
php artisan make:model   # Create new model
php artisan make:controller # Create new controller

# Testing
php artisan test         # Run tests
php artisan test --coverage # Run tests with coverage
```

## 📝 Coding Standards

### Frontend (React + TypeScript)

#### Component Structure
```typescript
// components/ProductCard.tsx
import React from 'react';
import { Product } from '@/types/product';

interface ProductCardProps {
  product: Product;
  onEdit?: (product: Product) => void;
  onDelete?: (id: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onEdit,
  onDelete
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-lg font-semibold">{product.name}</h3>
      <p className="text-gray-600">${product.price}</p>
      {/* Component content */}
    </div>
  );
};
```

#### Custom Hooks
```typescript
// hooks/useProducts.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productService } from '@/lib/api/productService';

export const useProducts = () => {
  return useQuery({
    queryKey: ['products'],
    queryFn: productService.getAll,
  });
};

export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: productService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
};
```

#### API Services
```typescript
// lib/api/productService.ts
import { api } from './config';
import { Product, CreateProductRequest } from '@/types/product';

export const productService = {
  getAll: async (): Promise<Product[]> => {
    const response = await api.get('/products');
    return response.data;
  },

  create: async (data: CreateProductRequest): Promise<Product> => {
    const response = await api.post('/products', data);
    return response.data;
  },

  update: async (id: string, data: Partial<Product>): Promise<Product> => {
    const response = await api.put(`/products/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/products/${id}`);
  },
};
```

### Backend (Laravel + PHP)

#### Controller Structure
```php
<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreProductRequest;
use App\Http\Requests\UpdateProductRequest;
use App\Http\Resources\ProductResource;
use App\Services\ProductServiceInterface;
use Illuminate\Http\JsonResponse;

class ProductController extends Controller
{
    public function __construct(
        private ProductServiceInterface $productService
    ) {}

    public function index(): JsonResponse
    {
        $products = $this->productService->getAll();
        return response()->json(ProductResource::collection($products));
    }

    public function store(StoreProductRequest $request): JsonResponse
    {
        $product = $this->productService->create($request->validated());
        return response()->json(new ProductResource($product), 201);
    }

    public function show(string $id): JsonResponse
    {
        $product = $this->productService->findById($id);
        return response()->json(new ProductResource($product));
    }

    public function update(UpdateProductRequest $request, string $id): JsonResponse
    {
        $product = $this->productService->update($id, $request->validated());
        return response()->json(new ProductResource($product));
    }

    public function destroy(string $id): JsonResponse
    {
        $this->productService->delete($id);
        return response()->json(null, 204);
    }
}
```

#### Service Layer
```php
<?php

namespace App\Services;

use App\Interfaces\ProductServiceInterface;
use App\Models\Product;
use Illuminate\Database\Eloquent\Collection;

class ProductService implements ProductServiceInterface
{
    public function getAll(): Collection
    {
        return Product::with(['category', 'supplier'])->get();
    }

    public function findById(string $id): Product
    {
        return Product::with(['category', 'supplier'])->findOrFail($id);
    }

    public function create(array $data): Product
    {
        return Product::create($data);
    }

    public function update(string $id, array $data): Product
    {
        $product = $this->findById($id);
        $product->update($data);
        return $product->fresh();
    }

    public function delete(string $id): bool
    {
        $product = $this->findById($id);
        return $product->delete();
    }
}
```

#### Model Structure
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'price',
        'stock',
        'category_id',
        'supplier_id',
        'is_active',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function saleItems(): HasMany
    {
        return $this->hasMany(SaleItem::class);
    }
}
```

## 🧪 Testing

### Frontend Testing

#### Component Testing
```typescript
// components/__tests__/ProductCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductCard } from '../ProductCard';
import { Product } from '@/types/product';

const mockProduct: Product = {
  id: '1',
  name: 'Test Product',
  price: 10.99,
  stock: 100,
  category_id: '1',
  supplier_id: '1',
  is_active: true,
};

describe('ProductCard', () => {
  it('renders product information', () => {
    render(<ProductCard product={mockProduct} />);
    
    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('$10.99')).toBeInTheDocument();
  });

  it('calls onEdit when edit button is clicked', () => {
    const onEdit = jest.fn();
    render(<ProductCard product={mockProduct} onEdit={onEdit} />);
    
    fireEvent.click(screen.getByText('Edit'));
    expect(onEdit).toHaveBeenCalledWith(mockProduct);
  });
});
```

#### Hook Testing
```typescript
// hooks/__tests__/useProducts.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useProducts } from '../useProducts';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useProducts', () => {
  it('fetches products successfully', async () => {
    const { result } = renderHook(() => useProducts(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeDefined();
  });
});
```

### Backend Testing

#### Feature Testing
```php
<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_list_products(): void
    {
        Product::factory()->count(3)->create();

        $response = $this->getJson('/api/products');

        $response->assertStatus(200)
                ->assertJsonCount(3, 'data');
    }

    public function test_can_create_product(): void
    {
        $user = User::factory()->create();
        
        $productData = [
            'name' => 'Test Product',
            'price' => 10.99,
            'stock' => 100,
            'category_id' => 1,
            'supplier_id' => 1,
        ];

        $response = $this->actingAs($user)
                        ->postJson('/api/products', $productData);

        $response->assertStatus(201)
                ->assertJsonFragment(['name' => 'Test Product']);

        $this->assertDatabaseHas('products', $productData);
    }
}
```

#### Unit Testing
```php
<?php

namespace Tests\Unit;

use App\Models\Product;
use App\Services\ProductService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductServiceTest extends TestCase
{
    use RefreshDatabase;

    private ProductService $productService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->productService = new ProductService();
    }

    public function test_can_create_product(): void
    {
        $data = [
            'name' => 'Test Product',
            'price' => 10.99,
            'stock' => 100,
            'category_id' => 1,
            'supplier_id' => 1,
        ];

        $product = $this->productService->create($data);

        $this->assertInstanceOf(Product::class, $product);
        $this->assertEquals('Test Product', $product->name);
        $this->assertDatabaseHas('products', $data);
    }
}
```

## 🔧 Development Tools

### VS Code Extensions

#### Essential Extensions
- **ES7+ React/Redux/React-Native snippets** - React code snippets
- **TypeScript Importer** - Auto import TypeScript modules
- **Tailwind CSS IntelliSense** - Tailwind CSS autocomplete
- **Laravel Blade Snippets** - Laravel Blade template support
- **PHP Intelephense** - PHP language server
- **GitLens** - Git supercharged
- **Prettier** - Code formatter
- **ESLint** - JavaScript/TypeScript linter

#### Recommended Settings
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.preferences.importModuleSpecifier": "relative",
  "emmet.includeLanguages": {
    "blade": "html"
  }
}
```

### Browser Extensions
- **React Developer Tools** - React component inspection
- **Redux DevTools** - State management debugging
- **Laravel Debugbar** - Laravel debugging (development only)

## 📊 Performance Optimization

### Frontend Optimization

#### Code Splitting
```typescript
// Lazy load components
const ProductList = lazy(() => import('@/pages/ProductList'));
const ProductForm = lazy(() => import('@/components/ProductForm'));

// Use Suspense
<Suspense fallback={<Loading />}>
  <ProductList />
</Suspense>
```

#### Memoization
```typescript
// Memoize expensive calculations
const expensiveValue = useMemo(() => {
  return products.reduce((sum, product) => sum + product.price, 0);
}, [products]);

// Memoize components
const ProductCard = memo(({ product, onEdit }) => {
  return (
    <div>
      {/* Component content */}
    </div>
  );
});
```

### Backend Optimization

#### Database Optimization
```php
// Eager loading to prevent N+1 queries
$products = Product::with(['category', 'supplier'])->get();

// Use database indexes
Schema::table('products', function (Blueprint $table) {
    $table->index(['category_id', 'is_active']);
});

// Query optimization
$products = Product::where('is_active', true)
    ->whereHas('category', function ($query) {
        $query->where('name', 'Electronics');
    })
    ->get();
```

#### Caching
```php
// Cache expensive operations
$products = Cache::remember('products.active', 3600, function () {
    return Product::where('is_active', true)->get();
});

// Cache API responses
public function index(): JsonResponse
{
    $products = Cache::remember('api.products', 300, function () {
        return $this->productService->getAll();
    });
    
    return response()->json(ProductResource::collection($products));
}
```

## 🐛 Debugging

### Frontend Debugging

#### React DevTools
- Inspect component props and state
- Profile component performance
- Debug React hooks

#### Browser DevTools
- Network tab for API calls
- Console for JavaScript errors
- Performance tab for optimization

### Backend Debugging

#### Laravel Debugbar
```php
// Install in development
composer require barryvdh/laravel-debugbar --dev

// Use in code
debug($variable);
dd($variable); // Dump and die
```

#### Logging
```php
// Custom logging
Log::info('Product created', ['product_id' => $product->id]);
Log::error('Failed to create product', ['error' => $exception->getMessage()]);

// View logs
tail -f storage/logs/laravel.log
```

## 🔄 Git Workflow

### Branch Strategy
- **main**: Production-ready code
- **develop**: Integration branch
- **feature/**: New features
- **bugfix/**: Bug fixes
- **hotfix/**: Critical fixes

### Commit Messages
```
feat: add product search functionality
fix: resolve inventory calculation bug
docs: update API documentation
style: format code with prettier
refactor: extract product service logic
test: add unit tests for product controller
```

### Pull Request Process
1. Create feature branch from `develop`
2. Make changes and commit
3. Push branch and create PR
4. Code review and approval
5. Merge to `develop`
6. Deploy to staging for testing
7. Merge to `main` for production

---

For additional information, refer to the main [README.md](./README.md) or [DEPLOYMENT.md](./DEPLOYMENT.md).
