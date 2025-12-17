'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function VerifyEmailForm() {
  const [code, setCode] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement verify email logic
    console.log('Verify email:', { code })
  }

  return (
    <div className="max-w-md mx-auto mt-10">
      <h1 className="text-2xl font-bold mb-4">Verify Email</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="code" className="block text-sm font-medium">Verification Code</label>
          <input
            type="text"
            id="code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600"
        >
          Verify
        </button>
      </form>
      <div className="mt-4 text-center">
        <Link href="/signin" className="text-blue-600 hover:underline">Back to sign in</Link>
      </div>
    </div>
  )
}