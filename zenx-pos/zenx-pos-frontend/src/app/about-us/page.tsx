import type { Metadata } from 'next'
import { ClientLogos, CtaBanner, FeatureGrid, SplitSection, StatGrid } from '@/components/sections/blocks'
import { PageHero } from '@/components/sections/page-hero'
import { CheckList } from '@/components/ui/check-list'
import { Container, Section, SectionHeading } from '@/components/ui/layout'
import { about } from '@/content/pages'

export const metadata: Metadata = {
  title: 'About Us',
  description: 'ZenxPOS builds smart, simple and affordable POS technology that streamlines daily operations for businesses of every size.',
}

export default function AboutPage() {
  return (
    <>
      <PageHero title={about.hero.title} highlight={about.hero.highlight} after={about.hero.after} description={about.hero.text} crumbs={[{ label: 'About Us' }]} image={about.hero.image} />

      <Container className="relative -mt-10">
        <StatGrid stats={about.stats} />
      </Container>

      <SplitSection eyebrow="Our mission" title="Our Mission" text={<p>{about.mission.text}</p>} image={about.mission.image}>
        <CheckList items={about.mission.points} columns={2} className="mt-6" />
      </SplitSection>

      <SplitSection eyebrow="Our vision" title="Our Vision" text={<p>{about.vision.text}</p>} bullets={about.vision.points} image={about.vision.image} reverse tone="surface" />

      <Section>
        <SectionHeading title="What we" highlight="stand for" description={about.values.text} />
        <FeatureGrid features={about.values.items} columns={4} className="mt-12" />
      </Section>

      <ClientLogos />
      <CtaBanner />
    </>
  )
}
