import { ButtonLink } from '@/components/ui/button'
import { Container } from '@/components/ui/layout'

export default function NotFound() {
  return (
    <Container className="flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <p className="font-display text-6xl font-bold text-brand-500">404</p>
      <h1 className="mt-4 text-3xl font-bold">Page not found</h1>
      <p className="mt-3 max-w-md text-muted">The page you are looking for has moved or does not exist.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/" arrow>Back to home</ButtonLink>
        <ButtonLink href="/contact-us" variant="outline">Contact us</ButtonLink>
      </div>
    </Container>
  )
}
