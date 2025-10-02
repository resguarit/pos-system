# Testing Guide

## Frontend Testing

### Running Tests
```bash
cd apps/frontend
npm test
```

### Test Structure
- Unit tests in `src/components/__tests__/`
- Integration tests in `src/pages/__tests__/`
- E2E tests in `cypress/`

### Testing Tools
- **Vitest** for unit testing
- **React Testing Library** for component testing
- **MSW** for API mocking

## Backend Testing

### Running Tests
```bash
cd apps/backend
php artisan test
```

### Test Structure
- Feature tests in `tests/Feature/`
- Unit tests in `tests/Unit/`

### Testing Tools
- **PHPUnit** for unit testing
- **Laravel's testing utilities**
- **Database factories and seeders**

## E2E Testing

### Setup
```bash
cd apps/frontend
npx cypress install
```

### Running E2E Tests
```bash
npm run test:e2e
```