import { SignIn } from '@clerk/nextjs'
import Link from 'next/link'

export default function SignInPage() {
  return (
    <div className="flex flex-col items-center gap-6">
      <SignIn />
      <p className="text-sm text-muted-foreground">
        Nao tem conta?{' '}
        <Link
          href="/sign-up"
          className="font-medium text-vox-primary hover:underline"
        >
          Cadastre-se
        </Link>
      </p>
    </div>
  )
}
