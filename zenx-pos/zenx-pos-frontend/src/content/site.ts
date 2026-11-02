// Site-wide content: navigation, contact details and footer links.

export const site = {
  name: 'ZenxPOS',
  url: 'https://www.zenxpos.com',
  tagline: 'The simple, secure and scalable way to run your business',
  description:
    'ZenxPOS is a fully integrated point-of-sale system for retail, textile, restaurant and salon businesses: billing, inventory, reports and integrations in one platform.',
  footerBlurb:
    'Empowering businesses with smart POS solutions for billing, inventory, customer management, and business growth—all from a single platform.',
  email: 'info@slifax.com',
  phones: ['+91 93470 30889', '+91 93470 30883'],
  address:
    'Flat No. 502, 5th Floor, Om Sri Maa Gayatri Plaza, 3-4-493 1 To 4, Street No. 11, Barkatpura Housing Board Colony, Chitrapuri Colony, Barkatpura, Narayanguda, Hyderabad, Telangana 500027',
}

export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`

export type NavLink = { label: string; href: string }

export const industries: Array<NavLink & { description: string }> = [
  { label: 'Retail Services', href: '/retail-services', description: 'Supermarkets, departmental and specialty stores' },
  { label: 'Textile Services', href: '/textile-services', description: 'Fashion, boutiques, lifestyle and footwear' },
  { label: 'Restaurant & Cafe', href: '/restaurant-cafe', description: 'Dine-in, QSR, cafes, bakeries and cloud kitchens' },
  { label: 'Salon & Spa', href: '/salon-spa', description: 'Salons, spas, beauty parlours and tattoo studios' },
]

export const mainNav: NavLink[] = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about-us' },
  { label: 'Services', href: '/services' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Integrations', href: '/integrations' },
  { label: 'Hardware', href: '/hardware' },
]

export const footerQuickLinks: NavLink[] = [
  { label: 'About us', href: '/about-us' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Integrations', href: '/integrations' },
  { label: 'Hardware', href: '/hardware' },
  { label: 'Contact us', href: '/contact-us' },
]

export const footerServiceLinks: NavLink[] = [
  { label: 'Super Markets', href: '/retail-services#supermarket' },
  { label: 'Fruits & Vegetables', href: '/retail-services#fruits' },
  { label: 'Books & Stationery', href: '/retail-services#books' },
  { label: 'Departmental Stores', href: '/retail-services#departmental' },
  { label: 'Fashion & Clothing Stores', href: '/textile-services#fashion' },
  { label: 'Bar & Restaurant', href: '/restaurant-cafe#bar-restaurant' },
  { label: 'Fine Dining', href: '/restaurant-cafe#fine-dining' },
  { label: 'Cafe', href: '/restaurant-cafe#cafe' },
  { label: 'Ice Cream Parlour', href: '/restaurant-cafe#ice-cream' },
  { label: 'QSR', href: '/restaurant-cafe#qsr' },
  { label: 'Cloud Kitchen', href: '/restaurant-cafe#cloud-kitchen' },
  { label: 'Bakery', href: '/restaurant-cafe#bakery' },
  { label: 'Salon & Spa', href: '/salon-spa' },
]

// Shown in "Our Clients" sections; logos from slifax.com/clients (all 3:2).
const client = (name: string, file: string) => ({ name, logo: `/img/clients/${file}.webp` })
export const clients: Array<{ name: string; logo: string }> = [
  client('Chermas', 'chermas'),
  client('DS Mart', 'ds-mart'),
  client('Himalaya Book World', 'himalaya-book-world'),
  client('G Shopping Mall', 'g-shopping-mall'),
  client('Jaithra', 'jaithra'),
  client('Imparadise Shopping Mall', 'imparadise-shopping-mall'),
  client('Ishna', 'ishna'),
  client('Kundan Stores', 'kundan-stores'),
  client("Lakshya's Natural Foods", 'lakshyas-natural-foods'),
  client('Liberty Fresh', 'liberty-fresh'),
  client('Mahavir Sweet Mart', 'mahavir-sweet-mart'),
  client('Mamtha Sales Agencies', 'mamtha-sales-agencies'),
  client('Maruthi Mart', 'maruthi-mart'),
  client('Maruthi Mega Mart', 'maruthi-mega-mart'),
  client('Nakoda Jewellers', 'nakoda-jewellers'),
  client('Ntree Mart', 'ntree-mart'),
  client('Payal', 'payal'),
  client('Pick & Buy', 'pick-and-buy'),
  client('R.K Super Market', 'rk-super-market'),
  client('Steel Big Bazaar', 'steel-big-bazaar'),
  client('Super Bazar', 'super-bazar'),
  client('Value Mart', 'value-mart'),
  client('Vijayadurga', 'vijayadurga'),
  client('Sloka The Global School', 'sloka-global-school'),
  client('KTS', 'kts'),
  client('Krishnaveni', 'krishnaveni'),
  client('Pragnya', 'pragnya'),
  client("Sri Sai Nilayam Executive Women's Hostel", 'sri-sai-nilayam-womens-hostel'),
  client("Sreya Executive Women's Hostel", 'sreya-womens-hostel'),
  client("Sri Sai Nilayam Executive Men's Hostel", 'sri-sai-nilayam-mens-hostel'),
]

export const cta = {
  title: 'Ready to modernize your storefront?',
  text: 'Your store deserves more than basic billing software. ZenxPOS delivers complete retail management with smart inventory tracking, multi-payment support, analytics, and faster operations.',
}
