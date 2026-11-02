import type { Metadata } from 'next'
import { ContactSection } from '@/components/contact/contact-section'
import { PageHero } from '@/components/sections/page-hero'
import { pic } from '@/content/images'

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Book a ZenxPOS demo or talk to our team about billing, inventory, hardware and integrations for your business.',
}

export default function ContactPage() {
  return (
    <>
      <PageHero
        title="Get In"
        highlight="Touch"
        after="With Our Team. We're Here To Help"
        description="Have questions about our services or need assistance? Our team is ready to help you with expert guidance, quick support, and personalized solutions. Contact us today and let's discuss how we can help your business grow."
        crumbs={[{ label: 'Contact Us' }]}
        image={pic('/img/sup.webp', 'ZenxPOS support agent')}
      />
      <ContactSection
        title="Have Questions? Contact Now"
        text="Reach out to our team for inquiries, support, or business consultations. We're committed to providing prompt responses and reliable assistance."
      />
    </>
  )
}
