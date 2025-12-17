import Link from 'next/link'

export default function Nav() {
  return (
    <nav className="bg-gray-100 p-4">
      <ul className="flex space-x-4">
        <li><Link href="/" className="text-blue-600 hover:underline">Home</Link></li>
        <li><Link href="/communities" className="text-blue-600 hover:underline">Communities</Link></li>
        <li><Link href="/profile" className="text-blue-600 hover:underline">Profile</Link></li>
      </ul>
    </nav>
  )
}