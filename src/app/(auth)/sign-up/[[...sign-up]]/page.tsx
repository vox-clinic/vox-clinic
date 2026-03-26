import { SignUp } from '@clerk/nextjs'
import Link from 'next/link'

export default function SignUpPage() {
  return (
    <div className="flex flex-col items-center gap-6">
      <SignUp />
      <p className="text-sm text-muted-foreground">
        Ja tem conta?{' '}
        <Link
          href="/sign-in"
          className="font-medium text-vox-primary hover:underline"
        >
          Entre
        </Link>
      </p>
    </div>
  )
}
