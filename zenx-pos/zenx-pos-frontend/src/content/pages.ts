// Content for About, Services, Pricing, Integrations and Hardware, taken from the original site.
import {
  Cable, GraduationCap, Headset, HeartHandshake, Mail, MessageCircle, MessageSquare, ShieldCheck, Sparkles, Wallet,
} from 'lucide-react'
import type { Feature, Picture } from '@/components/sections/blocks'
import { pic } from './images'

const unsplash = (id: string, alt: string, width = 800, height = 533): Picture => ({ src: `https://images.unsplash.com/${id}?w=${width}&q=80`, alt, width, height })

export const about = {
  hero: { title: 'Powerful', highlight: 'POS Solutions', after: 'for Seamless Business Operations', text: "A POS (Point of Sale) system isn't just for billing anymore—it's the central hub of your business operations.", image: pic('/img/about-3.webp', 'Business owner with a tablet') },
  stats: [
    { value: '9k+', label: 'Clients', text: 'Empowering businesses nationwide.' },
    { value: '13k+', label: 'Downloads', text: 'Fast-growing retail management solution.' },
    { value: '500+', label: 'Reviews', text: 'Customer satisfaction that speaks for itself.' },
  ],
  mission: {
    text: 'To empower businesses with smart, simple, and affordable technology that streamlines daily operations, improves productivity, and drives sustainable growth.',
    points: ['Simplify sales, inventory, and billing management', 'Enable faster and smarter business decisions', 'Improve operational efficiency across all departments', 'Provide real-time insights through powerful analytics', 'Support businesses of all sizes with scalable solutions', 'Deliver reliable, secure, and user-friendly technology'],
    image: pic('/img/s4.webp', 'Billing counter'),
  },
  vision: {
    text: 'We envision a future where every business, regardless of size, can leverage powerful technology to streamline operations, improve efficiency, and achieve long-term success. Through continuous innovation, we aim to help businesses grow smarter, serve customers better, and stay ahead in a rapidly evolving marketplace.',
    points: ['Smart Business Operations', 'Faster Billing & Checkout', 'Data-Driven Growth & Success'],
    image: pic('/img/s1.webp', 'Payment terminal'),
  },
  values: {
    text: 'At ZenxPOS, we believe every business deserves powerful, easy-to-use technology that helps them sell smarter, manage better, and grow faster.',
    items: [
      { icon: HeartHandshake, title: 'Merchant First', text: 'We put business owners at the center of everything we build, helping them operate efficiently and serve customers better.' },
      { icon: ShieldCheck, title: 'Reliability Always', text: 'From billing to inventory, ZenxPOS delivers secure, stable, and dependable performance every day.' },
      { icon: Sparkles, title: 'Built With Care', text: 'Designed with simplicity and innovation in mind, our solutions make business management effortless and effective.' },
      { icon: Wallet, title: 'Honest Pricing', text: 'Transparent pricing with no hidden fees, ensuring maximum value for businesses of all sizes.' },
    ] satisfies Feature[],
  },
}

export const services = {
  intro: 'Whether you run a retail store, textile business, restaurant, or multi-location enterprise, ZenxPOS provides intelligent tools that streamline operations, optimize performance, and unlock new growth opportunities—all from a single, easy-to-use platform.',
  heroImage: pic('/img/soft.webp', 'ZenxPOS billing software on a laptop'),
  heroStats: [
    { value: '250+', label: 'Retail & textile stores' },
    { value: '250+', label: 'Restaurants & F&B' },
    { value: '100%', label: 'Reporting accuracy' },
  ],
  categories: [
    { title: 'Retail Stores', href: '/retail-services', image: pic('/img/services-1.webp', 'Retail store'), tags: ['Super Market', 'Fruits & Vegetables', 'Books & Stationery'], text: 'Empower your retail business with ZenxPOS, a complete solution designed to simplify billing, inventory management, and customer service. From supermarkets to specialty stores, ZenxPOS helps retailers operate efficiently, reduce errors, and increase profitability.' },
    { title: 'Textile Stores', href: '/textile-services', image: unsplash('photo-1558769132-cb1aea458c5e', 'Textile store'), tags: ['Sarees', 'Suits & Salwar', 'Dress Materials'], text: 'Streamline your textile and garment business with ZenxPOS. Easily manage thousands of products across different styles, sizes, colors, and brands while ensuring faster billing and accurate inventory tracking.' },
    { title: 'Restaurant', href: '/restaurant-cafe', image: unsplash('photo-1517248135467-4c7edcad34c4', 'Restaurant'), tags: ['Dine-in', 'Takeaway', 'Home Delivery'], text: 'Transform your restaurant operations with ZenxPOS. From quick order taking and table management to billing and inventory control, our solution helps you deliver exceptional dining experiences while improving efficiency.' },
    { title: 'Salon & Spa', href: '/salon-spa', image: unsplash('photo-1560066984-138dadb4c035', 'Salon and spa'), tags: ['Hair Salon', 'Spa & Massage', 'Beauty Parlour'], text: 'Elevate your salon and spa business with ZenxPOS. Simplify appointment scheduling, customer management, billing, and staff tracking while delivering exceptional experiences that keep clients coming back.' },
  ],
  engineered: {
    image: pic('/img/bgn.webp', 'Payment terminal transaction'),
    items: [
      { icon: ShieldCheck, title: 'Security & Compliance', text: 'Secure transactions with PCI DSS compliance. End-to-end encryption, tokenization, and fraud detection protect every payment. Stay compliant with GDPR, PCI-DSS, and local retail regulations—so you can focus on selling, not worrying.' },
      { icon: GraduationCap, title: 'Onboarding & Training', text: 'Get your team selling in hours, not weeks. Intuitive interface with guided tutorials, role-based training modules, and interactive simulations. Fast onboarding for cashiers, managers, and store owners—minimal downtime, maximum productivity.' },
      { icon: Cable, title: 'Integrations & API', text: 'Seamless connections with your retail ecosystem: barcode scanners, thermal printers, weighing scales and billing printers; PhonePe, Paytm, Pine Labs, UPI, cards and other major gateways. Our open APIs and pre-built connectors let you customize and scale without hassle.' },
      { icon: Headset, title: '24/7 Customer Support', text: 'Expert help whenever you need it. Round-the-clock live chat, phone, and email support from retail POS specialists. Dedicated success managers, an extensive knowledge base, and proactive monitoring ensure your stores never miss a beat.' },
    ] satisfies Feature[],
  },
}

// TODO(content): the original pricing page used placeholder text (Lorem Ipsum, the same
// feature repeated, Pro priced like Basic). Prices are as published there; replace the
// descriptions and features with the real plan details.
export const pricing = {
  hero: { text: "A POS (Point of Sale) system isn't just for billing anymore—it's the central hub of your business operations.", image: pic('/img/123.webp', 'A café worker using a POS system') },
  plans: [
    { name: 'Basic', price: '₹2,500', period: '/month', text: 'A simple way to get started with ZenxPOS.', featured: false },
    { name: 'Standard', price: '₹3,500', period: '/month', text: 'Our most popular plan.', featured: true },
    { name: 'Pro', price: '₹2,500', period: '/month', text: 'Talk to us about your advanced requirements.', featured: false },
  ],
  included: ['Fast GST billing', 'Inventory management', 'Reports & analytics', 'Customer management', 'Hardware support', 'Onboarding & training'],
  hardware: { image: pic('/img/pos.webp', 'POS hardware laptops'), text: 'Plug-and-play hardware kits that work seamlessly with ZenxPOS: tablet stands, thermal printers, cash drawers, barcode scanners and customer displays, ready for a fast and professional checkout.' },
}

export const integrations = {
  hero: { text: "A POS (Point of Sale) system isn't just for billing anymore—it's the central hub of your business operations.", image: pic('/img/in.webp', 'Person holding a POS payment terminal') },
  payment: {
    image: unsplash('photo-1556742044-3c52d6e88c62', 'Customer paying at a card terminal'),
    text: 'Stop manual entry errors and speed up your checkout lines with seamless payment syncing. ZenxPOS integrates directly with leading payment providers, ensuring that the bill amount is automatically pushed to the card terminal. Experience faster reconciliations, secure transactions, and a frictionless payment experience for your customers, whether they pay via QR code, Wallet, or Credit/Debit cards.',
    bullets: ['Paytm Integration: Accept payments through Paytm Wallet and QR codes with instant on-screen confirmation.', 'Pine Labs Integration: Connect your smart EDC terminals for secure and high-speed card processing.', 'PhonePe Integration: Offer contactless UPI payments that sync directly with your billing dashboard.'],
    partners: [pic('/img/paytm-logo.svg', 'Paytm'), pic('/img/pine.svg', 'Pine Labs'), pic('/img/phonepay.webp', 'PhonePe')],
    flow: ['Customer', 'Store', 'Payment Gateway', 'Payment Processor', 'Bank', 'Merchant Account'],
  },
  weighing: {
    image: pic('/img/h-w-1.webp', 'POS weighing machine'),
    text: 'Ideal for grocery stores, supermarkets, and sweet shops, ZenxPOS connects directly with digital weighing scales. Forget manual typing—as soon as an item is placed on the scale, the weight is captured in real-time on your billing screen. This integration ensures 100% accuracy in pricing, reduces product shrinkage, and significantly speeds up the service time for bulk or loose items.',
  },
  communication: {
    text: "Build stronger relationships with your customers through automated communication. ZenxPOS integrates with top messaging and email gateways, allowing you to go paperless while staying top-of-mind. Whether it's sending a digital receipt or a personalized discount for a customer’s birthday, our communication tools help you turn one-time shoppers into loyal brand advocates.",
    items: [
      { icon: MessageSquare, title: 'SMS Integration', text: 'Send instant transaction alerts, OTPs, and promotional offers directly to customer mobile phones.' },
      { icon: MessageCircle, title: 'WhatsApp Integration', text: "Deliver eco-friendly digital receipts and order updates to your customers on the world's most popular messaging app." },
      { icon: Mail, title: 'Email Integration', text: 'Automate professional e-receipts and targeted marketing newsletters to keep your audience engaged and informed.' },
    ] satisfies Feature[],
  },
}

export const hardware = {
  hero: { text: "A POS (Point of Sale) system isn't just for billing anymore—it's the central hub of your business operations.", image: pic('/img/hardware-removebg-preview.webp', 'ZenxPOS billing hardware') },
  kits: [
    {
      title: 'iPad POS hardware kit', image: pic('/img/ncr-silver-pos.webp', 'iPad POS kit'),
      text: 'Streamline your checkout process with our high-performance, plug-and-play hardware kits. Designed to work seamlessly with ZenxPOS, our hardware bundles provide everything you need for a fast, reliable, and professional billing experience. Whether you are running a single boutique or a large retail chain, our hardware solutions are built to handle high-volume sales while keeping your counter space clean and organized.',
      items: ['Sleek Tablet/iPad Stands', 'High-Speed Thermal Printers', 'Heavy-Duty Cash Drawers', 'Precision Barcode Scanners', 'Customer-Facing Displays', 'Plug-and-Play Setup'],
    },
    {
      title: 'Desktop hardware kit', image: pic('/img/desktop-pos-3-20230923140420-1.webp', 'Desktop POS kit'),
      text: 'Designed for high-volume environments and all-day reliability, our Desktop POS Hardware Kit provides a heavy-duty solution for busy retail counters. This kit is built for speed and stability, offering a powerful workstation setup that handles large inventories and complex transactions with ease. It is the perfect choice for retailers who require a permanent, robust, and high-performance billing station.',
      items: ['All-in-One Desktop PC', 'Fast Thermal Receipt Printer', 'Omni-directional Scanners', 'Large Electronic Cash Drawer', 'Customer Pole Display', 'Ergonomic Keyboard & Mouse'],
    },
  ],
  equipment: [
    { title: 'Stand for iPad', image: pic('/img/1.webp', 'Stand for iPad'), text: 'Elegant and durable iPad stands designed to provide a secure, ergonomic checkout experience with adjustable viewing angles.' },
    { title: 'Cash Drawer', image: pic('/img/2.webp', 'Cash drawer'), text: 'Heavy-duty, all-metal drawers built for security. Features electronic opening and multi-compartment layouts for cash.' },
    { title: 'Bluetooth Barcode Scanner', image: pic('/img/3.webp', 'Bluetooth barcode scanner'), text: 'Wireless scanners ideal for scanning bulky items or managing inventory on the shop floor without tethered wires.' },
    { title: 'Barcode Printers', image: pic('/img/1.webp', 'Barcode printer'), text: 'Create professional, high-resolution price tags and labels with industrial-grade precision and clarity.' },
    { title: 'Thermal Printers', image: pic('/img/6.webp', 'Thermal printer'), text: 'Lightning-fast receipt printing with zero ink required. Designed for quiet, reliable performance in high-traffic areas.' },
    { title: 'Barcode Labels', image: pic('/img/7.webp', 'Barcode labels'), text: 'Premium quality adhesive tags in multiple sizes. High-durability labels ensuring long-lasting readability.' },
    { title: 'Pole Displays', image: pic('/img/8.webp', 'Pole display'), text: 'Show itemized pricing and transaction totals in real-time to enhance customer trust and reduce errors.' },
    { title: 'Table Top Scanner', image: pic('/img/9.webp', 'Table top scanner'), text: 'Powerful omni-directional scanners for hands-free operation. Perfect for rapid checkout in busy supermarkets.' },
    { title: 'USB Barcode Scanner', image: pic('/img/10.webp', 'USB barcode scanner'), text: 'Reliable, plug-and-play handheld scanners providing instant and accurate 1D/2D code reading.' },
    { title: 'Weighing Machines', image: pic('/img/11.webp', 'Weighing machine'), text: 'Precision scales that integrate with your POS for accurate weight-based billing in grocery and sweet shops.' },
  ] satisfies Feature[],
}
