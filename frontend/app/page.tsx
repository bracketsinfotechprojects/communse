import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
      <main className="text-center">
        <h1 className="text-4xl font-bold mb-8">Welcome to Communse</h1>
        <p className="text-lg mb-8">Connect with communities around you</p>
        <div className="space-x-4">
          <Link href="/signin" className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600">Sign In</Link>
          <Link href="/signup" className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600">Sign Up</Link>
        </div>
        <div className="mt-8 space-x-4">
          <Link href="/forgot-password" className="text-blue-600 hover:underline">Forgot Password</Link>
          <Link href="/verify-email" className="text-blue-600 hover:underline">Verify Email</Link>
        </div>
      </main>
    </div>
  )
}
