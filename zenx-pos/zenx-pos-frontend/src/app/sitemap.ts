import type { MetadataRoute } from 'next'
import { site } from '@/content/site'

const paths = ['', '/about-us', '/services', '/retail-services', '/textile-services', '/restaurant-cafe', '/salon-spa', '/pricing', '/integrations', '/hardware', '/contact-us', '/privacy-policy', '/terms-conditions', '/refund-policy', '/shipping-policy', '/delete-account']

export default function sitemap(): MetadataRoute.Sitemap {
  return paths.map(path => ({ url: `${site.url}${path}`, changeFrequency: 'monthly', priority: path === '' ? 1 : path.includes('-services') || path === '/restaurant-cafe' || path === '/salon-spa' ? 0.8 : 0.6 }))
}
