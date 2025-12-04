import { render, screen } from '@testing-library/react';
import Layout from '../components/Layout';

// Mock the AuthContext
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { fullName: 'Test User', username: 'testuser', email: 'test@example.com' },
    logout: jest.fn(),
    isAuthenticated: true,
  }),
}));

// Mock Next.js Link component
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('Layout Component', () => {
  test('renders navigation with user name', () => {
    render(
      <Layout>
        <div>Test Content</div>
      </Layout>
    );

    expect(screen.getByText('Welcome, Test User')).toBeInTheDocument();
    expect(screen.getByText('Community App')).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Posts')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
  });

  test('renders logout button when authenticated', () => {
    render(
      <Layout>
        <div>Test Content</div>
      </Layout>
    );

    expect(screen.getByText('Logout')).toBeInTheDocument();
  });

  test('renders login and register buttons when not authenticated', () => {
    // Mock unauthenticated state
    jest.mock('@/contexts/AuthContext', () => ({
      useAuth: () => ({
        user: null,
        logout: jest.fn(),
        isAuthenticated: false,
      }),
    }));

    render(
      <Layout>
        <div>Test Content</div>
      </Layout>
    );

    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.getByText('Register')).toBeInTheDocument();
  });
});