import React from 'react';
import Head from 'next/head'
import Link from 'next/link'

export default function Home() {
  return (
    <>
      <Head>
        <title>Community App</title>
        <meta name="description" content="A community platform built with Next.js and Node.js" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="min-h-screen">
        <div className="bg-white">
          {/* Hero Section */}
          <div className="relative isolate px-6 pt-14 lg:px-8">
            <div className="mx-auto max-w-2xl py-32 sm:py-48 lg:py-56">
              <div className="text-center">
                <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
                  Welcome to Community App
                </h1>
                <p className="mt-6 text-lg leading-8 text-gray-600">
                  Connect, share, and engage with like-minded people in our vibrant community platform.
                </p>
                <div className="mt-10 flex items-center justify-center gap-x-6">
                  <Link
                    href="/auth/login"
                    className="btn btn-primary text-sm font-semibold leading-6"
                  >
                    Login
                  </Link>
                  <Link
                    href="/auth/register"
                    className="text-sm font-semibold leading-6 text-gray-900"
                  >
                    Register <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Features Section */}
          <div className="bg-gray-50 py-24 sm:py-32">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
              <div className="mx-auto max-w-2xl lg:text-center">
                <h2 className="text-base font-semibold leading-7 text-primary-600">Features</h2>
                <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                  Everything you need for community building
                </p>
              </div>
              <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
                <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-2 lg:gap-y-16">
                  <div className="relative pl-16">
                    <dt className="text-base font-semibold leading-7 text-gray-900">
                      <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600">
                        <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      Real-time posts
                    </dt>
                    <dd className="mt-2 text-base leading-7 text-gray-600">
                      Share your thoughts and updates with the community in real-time.
                    </dd>
                  </div>
                  <div className="relative pl-16">
                    <dt className="text-base font-semibold leading-7 text-gray-900">
                      <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600">
                        <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501-.72.374-1.417.749-2.157.916-.757.172-1.617.243-2.58.243h-.02c-.633 0-1.075-.069-1.36-.17-.287-.101-.568-.275-.756-.501-.198-.186-.515-.475-.865-.501-.74-.167-1.437-.542-2.157-.916-.74-.177-1.583-.243-2.58-.243-.96 0-1.853.07-2.58.243-.74.167-1.437.542-2.157.916-.198.186-.469.315-.756.501C3.75 9.79 3.307 9.77 2.63 9.77h-.02C1.62 9.77.75 9.84 0 9.77c-.35.026-.67.21-.865.501.72.374 1.417.749 2.157.916.757.172 1.617.243 2.58.243h.02c.633 0 1.075-.069 1.36-.17.287-.101.568-.275.756-.501.198-.186.515-.475.865-.501.74-.167 1.437-.542 2.157-.916.74-.177 1.583-.243 2.58-.243z" />
                        </svg>
                      </div>
                      Comments & Discussions
                    </dt>
                    <dd className="mt-2 text-base leading-7 text-gray-600">
                      Engage in meaningful conversations through threaded comments.
                    </dd>
                  </div>
                  <div className="relative pl-16">
                    <dt className="text-base font-semibold leading-7 text-gray-900">
                      <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600">
                        <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                        </svg>
                      </div>
                      User Profiles
                    </dt>
                    <dd className="mt-2 text-base leading-7 text-gray-600">
                      Create and customize your profile to connect with others.
                    </dd>
                  </div>
                  <div className="relative pl-16">
                    <dt className="text-base font-semibold leading-7 text-gray-900">
                      <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600">
                        <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-2.25-1.313M21 7.5v2.25m0-2.25h-2.25m2.25 0h-2.25m-2.25 2.25v2.25M2.25 7.5l2.25-1.313M2.25 7.5v2.25m0-2.25h2.25m2.25 0h2.25M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zm0 3a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12a.75.75 0 110-1.5.75.75 0 010 1.5zM12 17.25a.75.75 0 110-1.5.75.75 0 010 1.5z" />
                        </svg>
                      </div>
                      Social Features
                    </dt>
                    <dd className="mt-2 text-base leading-7 text-gray-600">
                      Like, share, and follow other community members.
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}