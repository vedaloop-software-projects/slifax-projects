import { BarChart3, Boxes, FileSpreadsheet, Plug, Receipt, ShieldCheck, TrendingUp, Users, Zap } from 'lucide-react'
import type { FaqGroup, Feature, Picture } from '@/components/sections/blocks'
import { pic } from './images'

export const heroSlides = [
  { eyebrow: 'Fully Integrated Point-of-sale System', title: 'The Simple, Secure, & Scalable Way to Run Your', highlight: 'Business' },
  { eyebrow: 'Sell Faster. Stock Smarter. Grow Bigger.', title: 'Transform Every Checkout into a Better Customer', highlight: 'Experience' },
  { eyebrow: 'Take Orders Faster. Serve Customers Better.', title: 'From Kitchen to Cash Counter, Fully', highlight: 'Connected' },
  { eyebrow: 'Manage Every Style, Size & Shade Effortlessly.', title: 'Designed for Modern Textile', highlight: 'Businesses' },
  { eyebrow: 'Helping Beauty Businesses Thrive Every Day', title: 'Deliver Exceptional Experiences. Every', highlight: 'Appointment' },
]
export const heroImage = pic('/img/img.webp', 'ZenxPOS billing on a POS terminal')

const unsplash = (id: string, alt: string): Picture => ({ src: `https://images.unsplash.com/${id}?w=640&q=80`, alt, width: 640, height: 427 })

export const supported = [
  { title: 'Retail Stores', href: '/retail-services', text: 'Smart billing and inventory management for modern retail businesses.', tags: ['Super Market', 'Fruits & Vegetables', 'Departmental Stores'], image: unsplash('photo-1542838132-92c53300491e', 'Retail grocery store checkout') },
  { title: 'Textile Stores', href: '/textile-services', text: 'Complete fashion retail solution with variant-wise stock control.', tags: ['Clothing Stores', 'Boutique', 'Lifestyle Stores'], image: unsplash('photo-1558769132-cb1aea458c5e', 'Textile clothing store') },
  { title: 'Restaurant & Cafe', href: '/restaurant-cafe', text: 'Fast ordering, billing, and kitchen management in one place.', tags: ['F&B', 'Bar & Restaurant', 'Food Court', 'Ice Cream Parlour'], image: unsplash('photo-1517248135467-4c7edcad34c4', 'Restaurant and cafe') },
  { title: 'Salon & Spa', href: '/salon-spa', text: 'Appointments, services and staff management made simple.', tags: ['Salon', 'Spa', 'Beauty Parlour', 'Tattoo Studio'], image: unsplash('photo-1560066984-138dadb4c035', 'Salon and spa') },
]

export const why = {
  title: 'Why businesses use a POS system?',
  text: "A POS (Point of Sale) system isn't just for billing anymore—it's the central hub of your business operations.",
  image: pic('/img/11-png.webp', 'Cashier using a POS system in a supermarket'),
  points: [
    { icon: Zap, title: 'Faster, accurate checkout', text: 'Reduces manual errors and speeds up checkout, improving customer experience and saving time.' },
    { icon: Boxes, title: 'Inventory on autopilot', text: 'Automatically updates stock levels, alerts for low inventory, and prevents overstocking.' },
    { icon: BarChart3, title: 'Real-time insight', text: 'Track sales, revenue, and trends instantly, helping you make smarter decisions on the go.' },
    { icon: TrendingUp, title: 'Grows with you', text: "Whether you're a small shop or expanding business, POS systems grow with you." },
  ],
}

export const features: Feature[] = [
  { icon: Receipt, title: 'Sales/Billing', text: 'Generate invoices quickly, manage payments, and streamline the entire billing process with ease.' },
  { icon: BarChart3, title: 'Reports & Analytics', text: 'Access real-time business reports and performance insights to make informed decisions.' },
  { icon: FileSpreadsheet, title: 'Tally Compatible', text: 'Seamlessly synchronize sales, inventory, and financial data with Tally for smooth accounting.' },
  { icon: Boxes, title: 'Stock Management', text: 'Monitor inventory levels, track stock movements, and prevent shortages or overstocking.' },
  { icon: Users, title: 'Customer Management', text: 'Maintain customer records, track purchase history, and enhance customer relationships.' },
  { icon: Plug, title: 'Third Party Integrations', text: 'Integrate with payment gateways, accounting software, and other business applications effortlessly.' },
]
export const featuresImage = pic('/img/mn-device.webp', 'ZenxPOS billing screen on a POS terminal')
export const featureBadges = [
  { icon: ShieldCheck, value: '3K+ Clients', label: 'Most Trusted' },
  { icon: Zap, value: '100%', label: 'Quick & Secure Billing' },
]

export const faqs: FaqGroup[] = [
  {
    title: 'Services',
    items: [
      { question: 'What businesses can use this POS software?', answer: 'Our POS solution is ideal for retail stores, supermarkets, restaurants, pharmacies, distributors, and service-based businesses.' },
      { question: 'Do you provide installation and setup support?', answer: 'Yes, our team assists with software setup, configuration, and onboarding to ensure a smooth start.' },
      { question: 'Is training provided for staff members?', answer: 'Absolutely. We offer user training to help your team quickly learn and operate the system efficiently.' },
      { question: 'Do you offer technical support?', answer: 'Yes, dedicated support is available to assist with technical issues, troubleshooting, and guidance.' },
      { question: 'Can I use the software at multiple locations?', answer: 'Yes, the system supports multi-branch and multi-store operations from a single platform.' },
    ],
  },
  {
    title: 'Features',
    items: [
      { question: 'Does the software support GST billing?', answer: 'Yes, it supports GST-compliant invoicing with tax calculations and detailed billing reports.' },
      { question: 'Can I manage inventory and stock levels?', answer: 'Yes, you can track stock, monitor inventory movements, and receive low-stock alerts.' },
      { question: 'Is Tally integration available?', answer: 'Yes, the software seamlessly integrates with Tally for accounting and financial management.' },
      { question: 'Can I generate sales and business reports?', answer: 'Yes, comprehensive reports and analytics are available to help monitor business performance.' },
      { question: 'Does it support third-party integrations?', answer: 'Yes, the platform can integrate with payment gateways, accounting tools, and other business applications.' },
    ],
  },
  {
    title: 'Hardware Support',
    items: [
      { question: 'Which hardware devices are supported?', answer: 'Our POS software supports barcode scanners, receipt printers, cash drawers, weighing scales, customer displays, and POS terminals.' },
      { question: 'Can I use my existing POS hardware?', answer: 'Yes, in most cases the software is compatible with standard POS hardware from leading brands.' },
      { question: 'Do you provide hardware installation support?', answer: 'Yes, our team can assist with hardware setup, configuration, and connectivity.' },
      { question: 'Which receipt printers are compatible?', answer: 'The software supports a wide range of thermal and USB receipt printers commonly used in retail businesses.' },
      { question: 'Does the system support barcode scanners?', answer: 'Yes, both wired and wireless barcode scanners are supported for fast and accurate billing.' },
    ],
  },
]
