# Development Setup Guide

This document provides an overview of the development tools and setup that have been implemented in your frontend project.

## 🛠️ Implemented Development Tools

### 1. Storybook
- **Status**: ✅ Fully Configured
- **Purpose**: Component documentation and development
- **Location**: `.storybook/` directory with configuration files
- **Scripts**:
  - `npm run storybook` - Start Storybook dev server (port 6006)
  - `npm run build-storybook` - Build static Storybook for deployment

### 2. Jest Testing Framework
- **Status**: ✅ Fully Configured
- **Purpose**: Unit and integration testing
- **Configuration**: 
  - `jest.config.js` - Jest configuration for Next.js
  - `jest.setup.js` - Setup file with common mocks and imports
- **Scripts**:
  - `npm test` - Run tests once
  - `npm run test:watch` - Run tests in watch mode
  - `npm run test:coverage` - Run tests with coverage report

### 3. TypeScript Support
- **Status**: ✅ Configured
- **Purpose**: Type checking and enhanced development experience
- **Configuration**: `tsconfig.json` with Next.js optimized settings
- **Script**: `npm run type-check` - Run TypeScript type checking

## 📁 Project Structure

```
frontend/
├── .storybook/              # Storybook configuration
│   ├── main.js             # Storybook main configuration
│   └── preview.js          # Storybook preview configuration
├── __tests__/              # Test files
│   └── sample.test.js      # Example test file
├── components/
│   ├── Layout.js           # Main layout component
│   └── Layout.stories.js   # Storybook stories for Layout
├── contexts/
├── pages/
├── hooks/
├── types/
├── utils/
├── jest.config.js          # Jest configuration
├── jest.setup.js           # Jest setup file
├── tsconfig.json           # TypeScript configuration
└── package.json            # Updated with new scripts and dependencies
```

## 🚀 Getting Started

### Run Storybook
```bash
cd frontend
npm run storybook
```
Then open http://localhost:6006 in your browser to view the component documentation.

### Run Tests
```bash
cd frontend
npm test
```

### Run Type Checking
```bash
cd frontend
npm run type-check
```

### Development Workflow
1. **Component Development**: Use Storybook to develop and test components in isolation
2. **Writing Tests**: Add test files alongside your components
3. **Type Safety**: Use TypeScript for better code quality and developer experience

## 📚 Creating New Stories

To create stories for your components:

1. Create a `.stories.js` file next to your component
2. Follow the pattern in `components/Layout.stories.js`
3. Import necessary dependencies and mock external dependencies
4. Define different variations of your component

Example:
```javascript
import React from 'react';
import YourComponent from './YourComponent';

const meta = {
  title: 'Components/YourComponent',
  component: YourComponent,
};

export default meta;

export const Default = () => <YourComponent />;
```

## 🧪 Adding Tests

To add tests for your components:

1. Create a `.test.js` file in `__tests__/` directory
2. Follow the pattern in `__tests__/sample.test.js`
3. Use `@testing-library/react` for component testing
4. Mock external dependencies like Next.js router and context providers

Example:
```javascript
import { render, screen } from '@testing-library/react';
import YourComponent from '../components/YourComponent';

describe('YourComponent', () => {
  test('renders correctly', () => {
    render(<YourComponent />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

## 📋 Available Scripts

- `npm run dev` - Start Next.js development server
- `npm run build` - Build Next.js application
- `npm run start` - Start production Next.js server
- `npm run lint` - Run ESLint
- `npm run test` - Run Jest tests
- `npm run test:watch` - Run Jest in watch mode
- `npm run test:coverage` - Run tests with coverage
- `npm run storybook` - Start Storybook
- `npm run build-storybook` - Build Storybook
- `npm run type-check` - Run TypeScript type checking

## 🎯 Next Steps

1. **Create Stories**: Add story files for all your components
2. **Write Tests**: Add comprehensive test coverage for your components and pages
3. **Type Conversion**: Consider converting JavaScript files to TypeScript for better type safety
4. **CI/CD**: Add these scripts to your CI/CD pipeline for automated testing and building

## 🔧 Dependencies Added

### Storybook
- `@storybook/react`
- `@storybook/nextjs`
- `@storybook/addon-essentials`
- `@storybook/addon-interactions`
- `@storybook/addon-links`
- `@storybook/blocks`
- `@storybook/testing-library`
- `@storybook/jest`

### Testing
- `@testing-library/react`
- `@testing-library/jest-dom`
- `jest`
- `jest-environment-jsdom`
- `@types/jest`
- `ts-jest`

### TypeScript
- `typescript`
- `@types/react`
- `@types/react-dom`

All development tools are now fully configured and ready to use!