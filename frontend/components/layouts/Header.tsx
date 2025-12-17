import Link from 'next/link'

export default function Header() {
  return (
    <header className="bg-blue-600 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-xl font-bold">Communse</Link>
        <nav>
          <ul className="flex space-x-4">
            <li><Link href="/" className="hover:underline">Home</Link></li>
            <li><Link href="/signin" className="hover:underline">Sign In</Link></li>
            <li><Link href="/signup" className="hover:underline">Sign Up</Link></li>
          </ul>
        </nav>
      </div>
    </header>
  )
}