import { BarChart3, Boxes, Coffee, ReceiptText, Scissors, Shirt, ShoppingBag, Users, Workflow } from 'lucide-react'

export const businessCards = [
  { name: 'Retail & supermarkets', description: 'Every aisle. Every item. All in sync.', detail: 'Barcode billing · Inventory · Stock alerts', href: '/retail-services', icon: ShoppingBag, tone: 'blue', number: '01' },
  { name: 'Restaurants & cafés', description: 'From the first order to the last table.', detail: 'Orders · Kitchen · Billing', href: '/restaurant-cafe', icon: Coffee, tone: 'peach', number: '02' },
  { name: 'Fashion & textiles', description: 'A perfect fit for every size and style.', detail: 'Sizes & colours · Variants · Stock', href: '/textile-services', icon: Shirt, tone: 'lavender', number: '03' },
  { name: 'Salons & spas', description: 'More time for a little customer care.', detail: 'Appointments · Services · Staff', href: '/salon-spa', icon: Scissors, tone: 'mint', number: '04' },
]

export const everydayFeatures = [
  { icon: ReceiptText, title: 'Billing that keeps up', text: 'Bring products, payments and GST invoices together at your counter.' },
  { icon: Boxes, title: 'Know what’s on your shelves', text: 'Follow stock movements and spot low inventory before it slows you down.' },
  { icon: BarChart3, title: 'See the bigger picture', text: 'Turn day-to-day sales into clear reports for your next business decision.' },
  { icon: Users, title: 'Make every visit count', text: 'Keep customer details and purchase history close at hand.' },
]

export const workflowSteps = [
  { id: 'scan', label: 'Scan & add', icon: Boxes, eyebrow: '01 / A QUICK START', title: 'A little scan.\nA lot less typing.', text: 'Bring products straight into the bill with barcode scanning. Keep the queue moving and your team focused on the customer.', points: ['Quick product lookup', 'Accurate item selection', 'Stock connected to sales'], status: 'Product found. Ready to bill.' },
  { id: 'print', label: 'Bill & print', icon: ReceiptText, eyebrow: '02 / A HAPPY CHECKOUT', title: 'The final touch,\nbeautifully simple.', text: 'Go from a full basket to a clear, itemised receipt. Billing and supported thermal printers work together for a smooth finish.', points: ['Itemised GST invoices', 'Multiple payment options', 'Thermal printer support'], status: 'Payment recorded. Receipt ready.' },
  { id: 'report', label: 'Track & grow', icon: Workflow, eyebrow: '03 / YOUR NEXT MOVE', title: 'Close the day.\nOpen up possibilities.', text: 'See what sold, follow inventory and bring your business into focus with reports that make sense of the day.', points: ['Sales and revenue reports', 'Inventory movement', 'Multi-store visibility'], status: 'Your business, at a glance.' },
] as const

export const homepageFaqs = [
  { question: 'Is ZenxPOS right for my business?', answer: 'ZenxPOS supports retail, supermarkets, textile and fashion stores, restaurants, cafés, salons and spas. We’ll walk you through the workflows for your business during a personalised demo.' },
  { question: 'Can I connect my existing printer and scanner?', answer: 'ZenxPOS works with a range of standard POS terminals, thermal receipt printers, wired and wireless barcode scanners, cash drawers and weighing scales. Share your device models with our team so we can confirm compatibility before setup.' },
  { question: 'Does ZenxPOS support GST billing?', answer: 'Yes. ZenxPOS supports GST invoices, tax calculations and billing reports. Our team can help configure your business and tax settings during onboarding.' },
  { question: 'Can I manage more than one store?', answer: 'Yes. Multi-branch and multi-store workflows let you keep track of sales and inventory across your locations. Ask our team about the setup that fits your business.' },
  { question: 'Will you help my team get started?', answer: 'Yes. We provide assistance with software configuration, hardware setup and staff training, with technical support available after onboarding.' },
]
