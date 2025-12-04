import React from 'react';
import Layout from '../components/Layout';

// Mock the AuthContext
const mockAuthContext = {
  user: { fullName: 'John Doe', username: 'johndoe', email: 'john@example.com' },
  logout: () => console.log('Logout clicked'),
  isAuthenticated: true,
};

// Mock the useAuth hook
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
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

const meta = {
  title: 'Components/Layout',
  component: Layout,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    children: {
      control: 'text',
      description: 'The content to be rendered inside the layout',
    },
  },
};

export default meta;

// Template for creating story variations
const Template = (args) => (
  <div style={{ minHeight: '100vh' }}>
    <Layout {...args} />
  </div>
);

// Default story - Authenticated user
export const Authenticated = Template.bind({});
Authenticated.args = {
  children: (
    <div className="mx-auto max-w-7xl py-6 px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">
        Welcome to the Community App
      </h1>
      <p className="mt-4 text-lg text-gray-600">
        This is the main content area. You can put any content here.
      </p>
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Posts</dt>
                  <dd className="text-lg font-medium text-gray-900">24</dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <a href="#" className="font-medium text-primary-600 hover:text-primary-500">
                View all
              </a>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Members</dt>
                  <dd className="text-lg font-medium text-gray-900">156</dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <a href="#" className="font-medium text-primary-600 hover:text-primary-500">
                View all
              </a>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Engagement</dt>
                  <dd className="text-lg font-medium text-gray-900">89%</dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <a href="#" className="font-medium text-primary-600 hover:text-primary-500">
                View details
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  ),
};

// Unauthenticated user story
export const Unauthenticated = Template.bind({});
Unauthenticated.decorators = [
  (Story) => {
    // Mock different auth context for unauthenticated state
    jest.mock('@/contexts/AuthContext', () => ({
      useAuth: () => ({
        user: null,
        logout: () => console.log('Logout clicked'),
        isAuthenticated: false,
      }),
    }));
    return <Story />;
  },
];
Unauthenticated.args = {
  children: (
    <div className="mx-auto max-w-7xl py-6 px-4 sm:px-6 lg:px-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
          <span className="block">Welcome to</span>
          <span className="block text-primary-600">Community App</span>
        </h1>
        <p className="mx-auto mt-3 max-w-md text-base text-gray-500 sm:text-lg md:mt-5 md:max-w-3xl md:text-xl">
          Join our community of developers, creators, and enthusiasts. Share your ideas, connect with others, and build something amazing together.
        </p>
        <div className="mx-auto mt-5 max-w-md sm:flex sm:justify-center md:mt-8">
          <div className="rounded-md shadow">
            <a
              href="/auth/register"
              className="flex w-full items-center justify-center rounded-md border border-transparent bg-primary-600 px-8 py-3 text-base font-medium text-white hover:bg-primary-700 md:py-4 md:px-10 md:text-lg"
            >
              Get started
            </a>
          </div>
          <div className="mt-3 rounded-md shadow sm:mt-0 sm:ml-3">
            <a
              href="/auth/login"
              className="flex w-full items-center justify-center rounded-md border border-transparent bg-white px-8 py-3 text-base font-medium text-primary-600 hover:bg-gray-50 md:py-4 md:px-10 md:text-lg"
            >
              Sign in
            </a>
          </div>
        </div>
      </div>
    </div>
  ),
};

// Mobile view story
export const Mobile = Template.bind({});
Mobile.parameters = {
  viewport: {
    defaultViewport: 'mobile',
  },
};
Mobile.args = {
  children: (
    <div className="mx-auto max-w-7xl py-6 px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold tracking-tight text-gray-900">
        Mobile Layout
      </h1>
      <p className="mt-2 text-sm text-gray-600">
        This content is displayed on mobile devices with the mobile navigation menu visible.
      </p>
    </div>
  ),
};