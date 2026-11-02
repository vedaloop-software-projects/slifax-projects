import type { Industry } from '@/components/sections/industry-page'
import { pic } from './images'

export const retail: Industry = {
  title: 'Retail',
  highlight: 'Services',
  intro: 'Empower your retail business with ZenxPOS, a complete solution designed to simplify billing, inventory management, and customer service. From supermarkets to specialty stores, ZenxPOS helps retailers operate efficiently, reduce errors, and increase profitability.',
  banner: pic('/img/blog-1.webp', 'Supermarket aisles'),
  segments: [
    {
      id: 'supermarket', title: 'Super Market', image: pic('/img/r1.webp', 'Supermarket checkout'),
      text: "ZenXPOS empowers supermarket owners to take full control of their operations. Our robust software handles everything from procurement and vendor management to the final tap of a customer's card. Designed specifically for the fast-paced retail environment, ZenXPOS is the digital backbone your supermarket needs to stay competitive in today's market.",
      bullets: ['100% Secure & Cloud-Based Data Management.', 'Seamless Integration with Retail Hardware.', 'Automated GST & Tax Calculation.', 'Dynamic Pricing & Promotional Campaign Tools.', '24/7 Dedicated Technical Support for Your Peace of Mind.'],
    },
    {
      id: 'fruits', title: 'Fruits & Vegetables', image: pic('/img/r2.webp', 'Fruits and vegetables section'),
      text: 'Managing a diverse fruits and vegetables section requires a flexible POS system. ZenXPOS provides an intuitive interface that makes it easy for staff to handle exotic fruits, local vegetables, and organic produce all in one transaction. With support for multiple units of measure and custom barcode generation for pre-packaged salads or cut fruits, ZenXPOS is the digital backbone your fresh section needs.',
      bullets: ['Multi-unit support (billing by piece, gram, or kilogram).', 'Easy custom barcode printing for pre-packed produce.', 'Vendor management for tracking local farm supplies.', 'One-tap billing for your top-selling "Hot Items."'],
    },
    {
      id: 'books', title: 'Books & Stationery', image: pic('/img/r3.webp', 'Books and stationery store'),
      text: 'Stationery retail is often driven by seasonal peaks and gift-buying. ZenXPOS empowers you to create "School Kits" or "Art Bundles" with a single click, increasing your average order value. Our software handles complex promotional offers, discount coupons, and loyalty points, turning one-time student shoppers into lifelong customers. Whether it\'s the start of a new semester or a holiday rush, ZenXPOS keeps your billing fast and your customers happy.',
      bullets: ['Product bundling tools for "Back-to-School" kits and gift sets.', 'Dynamic discount management for seasonal sales and clearance.', 'Integrated loyalty programs to reward frequent student and office buyers.', 'Fast-action keys for high-frequency items like pens, pencils, and erasers.'],
    },
    {
      id: 'departmental', title: 'Departmental Stores', image: pic('/img/r4.webp', 'Departmental store'),
      text: "In a busy departmental store, customer experience is everything. ZenXPOS is built to handle high footfall with lightning-fast billing and integrated loyalty programs that keep shoppers coming back. Whether it's a weekend rush or a festive sale, our POS ensures your checkout lines move smoothly. Use built-in CRM tools to offer personalized discounts based on shopping history, turning casual visitors into loyal members of your store.",
      bullets: ['High-speed barcode scanning to minimize checkout wait times.', 'Integrated CRM for personalized SMS and Email marketing.', 'Support for all payment modes: UPI, Credit/Debit Cards.', 'Automated promotional tools for "Buy One Get One" and bundle offers.'],
    },
    {
      id: 'homeappliance', title: 'Home Appliance Stores', image: pic('/img/r5.webp', 'Home appliance store'),
      text: 'In a home appliance store, customers have questions about specs, features, and availability. ZenXPOS gives your staff the answers instantly. Our software allows you to pull up detailed product technical specifications and real-time stock levels right at the point of sale. Close deals faster by providing accurate information and move straight to a quick, hassle-free checkout. No delays, no guesswork—just a smooth buying experience for your customers.',
      bullets: ['Instant access to product specifications and technical details.', 'Real-time stock visibility across the showroom and warehouse.', 'Quick-billing interface for a fast "Buy & Pay" experience.', 'Multi-payment support (UPI, Credit/Debit Cards, and Cash).', 'Comparison tools to help customers choose between models.'],
    },
    {
      id: 'petshops', title: 'Pet Shops', image: pic('/img/r6.webp', 'Pet shop'),
      text: 'Pet shops handle thousands of SKUs, from heavy bags of kibble to tiny aquatic accessories. ZenXPOS makes inventory management effortless with high-speed barcode scanning and real-time stock tracking. Crucially, our software includes "Expiry Alerts" for pet food and health supplements, ensuring you never sell an outdated product. Keep your shelves stocked with your best-sellers and reduce waste with our intelligent, data-driven retail solution.',
      bullets: ['Track expiration dates on pet food and health supplements.', 'Bulk inventory management for large bags and crates.', 'Real-time stock alerts to prevent running out of top-selling brands.', 'Categorize products by animal type (Dogs, Cats, Fish, Birds).', 'High-speed billing to keep lines moving during weekend rushes.'],
    },
    {
      id: 'mobile', title: 'Mobile & Electronics', image: pic('/img/r7.webp', 'Mobile and electronics store'),
      text: 'In a fast-paced electronics store, your POS shouldn\'t slow you down. ZenXPOS offers a sleek, intuitive "Buy & Pay" interface that lets you scan a smartphone, add a tempered glass protector, and process payment in seconds. Our software makes it easy to bundle accessories with main devices, increasing your average ticket size. With integrated payment options, your customers can pay via UPI, Card, or Cash and receive a professional digital receipt instantly.',
      bullets: ['Rapid barcode scanning for phones and accessories.', 'Smart "Quick-Add" buttons for frequently sold items.', 'One-click bundling for "Phone + Case + Charger" kits.', 'Seamless multi-mode payments (UPI, Credit/Debit, Cash).', 'Professional GST-ready invoices sent via SMS or Email.'],
    },
    {
      id: 'sports', title: 'Sports & Fitness Stores', image: pic('/img/r8.webp', 'Sports and fitness store'),
      text: 'In a busy fitness center or sports shop, customers want to grab their gear and get moving. ZenXPOS offers a high-speed, touch-screen interface designed for the "Buy & Pay" model. Accept all modern payment methods including UPI, QR codes, and cards with zero friction. Our cloud-based system ensures that your data is always synced, even if you run multiple outlets or a pro-shop within a larger gym. Focus on your clients\' fitness while we handle the technical heavy lifting.',
      bullets: ['Touch-optimized interface for ultra-fast transaction processing.', 'Seamless integration with UPI, Wallets, and Credit/Debit cards.', 'Offline billing mode to ensure your shop never stops.', 'Secure cloud dashboard to monitor sales from your smartphone.', 'Easy staff management to track sales performance and commissions.'],
    },
    {
      id: 'cosmetic', title: 'Cosmetic & Beauty Stores', image: pic('/img/r9.webp', 'Cosmetics and beauty store'),
      text: 'Managing a beauty store means handling thousands of small items with multiple variations in color, volume, and brand. ZenXPOS is designed to make this complexity simple. Our software allows you to categorize inventory by shade, skin type, or brand, ensuring you can find exactly what a customer needs in seconds. With high-speed barcode scanning and real-time stock updates, our "Buy & Pay" system ensures your boutique stays organized and your customers stay beautiful.',
      bullets: ['Advanced variant tracking for different shades, sizes, and colors.', 'High-speed scanning for small items like eyeliners and lipsticks.', 'Batch tracking for skincare products with expiration date alerts.', 'Detailed reports on top-performing categories (e.g., Luxury vs. Daily Wear).'],
    },
    {
      id: 'automobiles', title: 'Automobiles', image: pic('/img/r10.webp', 'Automobile parts store'),
      text: "In the automobile world, accuracy is everything. ZenXPOS provides a seamless billing experience that handles both retail sales and service charges in one go. Whether you're selling high-end car accessories or essential engine components, our system ensures professional, GST-ready invoicing every time. Our built-in CRM helps you track customer vehicle history, allowing you to send automated reminders for periodic maintenance or follow-up accessory offers, turning one-time buyers into loyal clients.",
      bullets: ['Seamless billing for both products (parts) and labor (services).', 'Integrated CRM to track customer vehicle history and preferences.', 'Smart bundling for "Service Kits" (e.g., Oil, Filter, and Coolant).', 'High-speed barcode scanning for rapid accessory checkout.'],
    },
  ],
}

export const textile: Industry = {
  title: 'Textile',
  highlight: 'Services',
  intro: 'Streamline your textile and garment business with ZenxPOS. Easily manage thousands of products across different styles, sizes, colors, and brands while ensuring faster billing and accurate inventory tracking.',
  banner: pic('/img/blog-2.webp', 'Clothing store'),
  segments: [
    {
      id: 'fashion', title: 'Fashion & Clothing Stores', image: pic('/img/f1.webp', 'Fashion and clothing store'),
      text: 'In the fast-paced world of fashion, staying ahead of trends requires a POS system that is as agile as your business. ZenxPOS is designed to handle the unique complexities of apparel retail, from managing deep inventory matrices of sizes and colors to providing a seamless omnichannel experience. Our software streamlines your daily operations, allowing you to focus on what matters most—curating the perfect collection and delivering an exceptional shopping experience to your customers. Whether you manage a high-end boutique or a multi-location clothing chain, ZenxPOS provides the real-time data and tools you need to grow your brand.',
      bullets: ['Size & Color Management: Easily manage items with multiple sizes, colors, and styles.', 'Customer Loyalty: Built-in rewards and discount tools to keep shoppers coming back.', 'Fast & Easy Billing: Speed up checkout lines with a simple, touch-screen interface.', 'Trend Reporting: See your best-selling items and seasonal trends with one click.'],
    },
    {
      id: 'lifestyle', title: 'Life Style', image: pic('/img/f2.webp', 'Lifestyle store'),
      text: "Lifestyle stores are unique because they manage a diverse range of products, from home décor and fragrances to fashion accessories. ZenxPOS provides a unified platform to handle this variety with ease. Our software simplifies complex inventory management, tracks customer preferences across different product categories, and helps you create a cohesive brand experience. Whether you're running a curated gift shop or a large-scale lifestyle showroom, ZenxPOS gives you the tools to manage your stock, staff, and sales from one centralized dashboard.",
      bullets: ['Multi-Category Inventory: Easily manage diverse stock from home goods to personal care in one system.', 'Smart Bundle Offers: Create "Buy the Look" deals or mix-and-match promotions across different categories.', 'Unified Customer Profiles: Track purchase history to offer personalized recommendations and loyalty rewards.', 'Easy Barcode Labeling: Quickly generate and print tags for thousands of unique items and gift sets.', 'Anywhere Access: Monitor your sales, stock levels, and store performance from any device, anywhere.'],
    },
    {
      id: 'boutiques', title: 'Boutiques', image: pic('/img/f4.webp', 'Boutique'),
      text: "Running a boutique is about more than just selling clothes; it's about providing a curated experience. ZenxPOS is designed to help boutique owners manage unique, limited-edition inventory with precision. From tracking high-value items to maintaining personal relationships with your VIP clients, our software handles the technical details so you can focus on style. Whether you are a solo designer or a multi-brand boutique, ZenxPOS brings modern efficiency to your luxury retail space.",
      bullets: ['Unique Stock Tracking: Easily manage one-of-a-kind items, limited editions, and designer collections.', 'Mobile Checkout: Use a tablet to check out customers anywhere on the floor for a high-end, seamless service.', 'Gift & Loyalty Perks: Create elegant gift cards and reward programs that keep your best customers coming back.', 'Sales Performance Data: Identify your most profitable brands and top-spending clients with instant reports.'],
    },
    {
      id: 'footwear', title: 'Footwear', image: pic('/img/f3.webp', 'Footwear store'),
      text: 'Managing a shoe store comes with unique challenges, specifically the need to track thousands of size and color combinations. ZenxPOS is built to handle the footwear industry\'s complex "size-matrix" with ease. Our software allows your staff to instantly check stock levels for specific sizes across multiple branches, ensuring you never lose a sale. From athletic sneakers to formal leather shoes, ZenxPOS provides the speed, accuracy, and inventory control required to keep your footwear business running one step ahead of the competition.',
      bullets: ['Instant Stock Lookup: Find out immediately if a specific size is in the backroom or another branch.', 'Barcode & Labeling: Quickly scan and sell items with integrated barcode printing for all shoe boxes.', 'Brand Performance: Track which shoe brands and seasonal styles are your top profit makers.'],
    },
  ],
}

export const restaurant: Industry = {
  title: 'Restaurant',
  highlight: '& Cafe',
  intro: 'Transform your restaurant operations with ZenxPOS. From quick order taking and table management to billing and inventory control, our solution helps you deliver exceptional dining experiences while improving efficiency.',
  banner: pic('/img/blog-3.webp', 'Restaurant dining area'),
  segments: [
    {
      id: 'bar-restaurant', title: 'Bar & Restaurant', image: pic('/img/bar.webp', 'Bar and restaurant'),
      text: 'In the fast-paced hospitality industry, speed and accuracy are everything. ZenxPOS is designed to handle the heat of the kitchen and the rush of the bar. Our software simplifies the entire dining experience—from taking table-side orders to managing kitchen tickets and final billing.',
      bullets: ['Table Management: Easily manage floor layouts, track occupied tables, and handle reservations.', 'Kitchen Display Screen (KDS): Digital screens for instant, error-free communication between floor and kitchen.', 'Instant Kitchen Orders (KOT): Send orders directly from the table to the kitchen or bar printer.', 'Recipe & Stock Tracking: Monitor ingredient levels and alcohol stock to prevent wastage.', 'Split Billing: Quickly split checks by person, item, or percentage.'],
    },
    {
      id: 'fine-dining', title: 'Fine Dining', image: pic('/img/fine.webp', 'Fine dining restaurant'),
      text: 'Excellence is found in the details. ZenxPOS supports high-standard service by providing tools that manage complex course pacing and detailed guest preferences, ensuring your culinary team stays in perfect sync with the front-of-house.',
      bullets: ['Course-by-Course Management: Manage Appetizers, Mains, and Desserts with "Hold & Fire" features.', 'VIP Guest Profiling: Record preferences, allergies, and favorite wines for personalized service.', 'Visual Table Layouts: Track table status and seating times through an interactive map.', 'Seamless Course Routing: Automatically route orders to specialized stations (Pastry, Grill, Sauté).', 'Elegant Billing: Handle split checks and service charges quickly and discreetly.'],
    },
    {
      id: 'cafe', title: 'Cafe', image: pic('/img/cafe.webp', 'Cafe counter'),
      text: "Every second counts during the morning rush. ZenxPOS allows baristas to take complex orders and process payments in seconds. From fresh bakery inventory to digital loyalty programs, it's the secret ingredient to an efficient cafe.",
      bullets: ['Quick-Order Interface: Rapid-fire checkout designed to handle high-volume morning rushes.', 'Custom Modifiers: Add "extra shots" or "milk alternatives" with just one tap.', 'KDS: Dedicated Kitchen Display System to track orders in real-time, reducing errors.', 'Combo & Deal Creator: Quickly set up "Coffee + Muffin" breakfast deals.'],
    },
    {
      id: 'bakery', title: 'Bakery & Sweet Shops', image: pic('/img/bakery.webp', 'Bakery and sweet shop'),
      text: 'Manage the balance of fresh production and fast service. ZenxPOS handles everything from weight-based "Mithai" sales to complex custom cake orders, while keeping bakers updated in real-time via KDS.',
      bullets: ['Weight-Scale Integration: Connect with scales for fast billing of sweets and bulk items.', 'Bakery KDS: Paperless system that alerts bakers of new orders and special instructions.', 'Ingredient Level Tracking: Automatically deduct flour, sugar, and butter as you sell goods.', 'Combo & Gift Box Pricing: Easily create "Assorted Sweet Box" prices to increase sales.'],
    },
    {
      id: 'coffee-shops', title: 'Coffee Shops', image: pic('/img/coffe.webp', 'Coffee shop'),
      text: 'Built for high-volume environments, ZenxPOS simplifies complex customizations while keeping the barista station organized. Serve more customers in less time while building a community of loyal regulars.',
      bullets: ['Fast Modifiers: One-tap buttons for milk alternatives and syrup flavors.', 'Digital Loyalty Rewards: Track rewards digitally to keep your regulars coming back daily.', 'Quick "To-Go" Billing: Streamlined checkout process designed to move lines fast.', 'Combo & Morning Deals: Automated discounts for "Coffee + Bagel" specials.'],
    },
    {
      id: 'qsr', title: 'QSR (Quick Service Restaurant)', image: pic('/img/quick.webp', 'Quick service restaurant'),
      text: 'Engineered for high-volume surges, ZenxPOS simplifies menu management—from meal combos to custom add-ons—ensuring your counter staff can process orders in seconds without lag.',
      bullets: ['High-Speed KDS: Orders routed instantly to digital screens for fastest delivery time.', 'Smart Combo Management: Effortlessly create and upsell meal deals with a single tap.', 'Queue-Busting Interface: Intuitive checkout designed for peak-hour crowds.', 'Real-Time Stock Alerts: Get notified immediately when items like buns or patties run low.'],
    },
    {
      id: 'ice-cream', title: 'Ice Cream Parlors', image: pic('/img/ice.webp', 'Ice cream parlour'),
      text: 'Handle the summer rush with ease. Manage dozens of flavors and topping combinations while keeping the back-of-house in sync for prep-heavy items like sundaes and waffles.',
      bullets: ['Preparation KDS: Track complex orders like sundaes and shakes in real-time.', 'Weight-Scale Integration: Connect for accurate billing of self-serve froyo or bulk tubs.', 'Inventory & Expiry: Monitor stock of flavors and dairy with automated freshness alerts.', 'Fast Checkout: Interface designed to clear queues before the ice cream melts.'],
    },
    {
      id: 'cloud-kitchen', title: 'Cloud Kitchen', image: pic('/img/cloud.webp', 'Cloud kitchen'),
      text: 'Manage multiple virtual brands from a single system. ZenxPOS aggregates orders from UberEats, Zomato, and Swiggy into one digital workflow, reducing errors and preparation times.',
      bullets: ['Multi-Brand Management: Run 5 or 10 virtual brands from one single POS dashboard.', 'Smart KDS Routing: Route specific items to different stations based on the brand.', 'Brand-Wise Analytics: Get detailed reports on which virtual brand is performing best.', 'Ingredient Control: Monitor stock across all brands to prevent shortages.'],
    },
    {
      id: 'liquor-mart', title: 'Liquor Mart', image: pic('/img/marts.webp', 'Liquor store shelves'),
      text: 'Handle high-SKU inventory demands with ease. ZenxPOS tracks individual bottles, multi-pack cases, and vintage wines while ensuring compliance with age-verification prompts.',
      bullets: ['Order Picking Display: Digital screens in stockrooms for quick picking of online/phone orders.', 'High-SKU Search: Instantly find any brand or vintage using lightning-fast search tools.', 'Mix-and-Match Promos: Automate discounts for "Build your own 6-pack" deals.', 'Shrinkage Tracking: Easily log damaged or stolen items for accurate stock levels.'],
    },
  ],
}

export const salon: Industry = {
  title: 'Salon',
  highlight: '& Spa',
  intro: 'Elevate your salon and spa business with ZenxPOS. Simplify appointment scheduling, customer management, billing, and staff tracking while delivering exceptional experiences that keep clients coming back.',
  banner: pic('/img/blog-2.webp', 'Salon and wellness'),
  segments: [
    {
      id: 'salon', title: 'Salon', image: pic('/img/saloon.webp', 'Hair salon'),
      text: 'Running a busy salon requires balancing high-speed service with artistic precision. ZenxPOS is designed to keep your chairs full and your stylists organized. Our software simplifies complex appointment scheduling, tracks professional-grade retail stock, and manages stylist commissions automatically.',
      bullets: ['Visual Appointment Calendar: Easily drag-and-drop bookings and manage stylist shifts in one clean interface.', 'Retail Inventory Management: Track shampoos, conditioners, and styling tools with automated low-stock alerts.', 'Appointments: Real-time calendar sync & automated SMS reminders to ensure smooth daily operations.', 'Automated SMS Reminders: Drastically reduce "no-shows" with automated appointment confirmations.'],
    },
    {
      id: 'spa', title: 'Spa', image: pic('/img/sp.webp', 'Spa treatment room'),
      text: 'In a spa environment, the guest’s peace of mind is your top priority. ZenxPOS handles the administrative heavy lifting so you can focus on relaxation. Our system manages therapists, room availability, and specialized equipment while tracking the usage of oils and lotions.',
      bullets: ['Appointments: Real-time calendar sync & automated SMS reminders for wellness sessions.', 'Item Sales: Barcode scanning for retail products & automated stock alerts for oils and lotions.', 'Employee Management: Performance dashboards & customized commission profiles for therapists.', 'Package Management: Easily manage multi-session wellness packages and recurring memberships.'],
    },
    {
      id: 'beauty-parlor', title: 'Beauty Parlor', image: pic('/img/beauty.webp', 'Beauty parlour'),
      text: 'Running a successful beauty parlor requires the perfect balance of client services and retail growth. ZenxPOS is designed to help you manage your busy schedule with an easy-to-use pre-booking and appointment system for everything from quick touch-ups to bridal makeovers.',
      bullets: ['Easy Pre-booking: Manage all appointments on a visual calendar to avoid overlaps and keep staff organized.', 'Retail Item Sales: Sell cosmetics, skincare, and hair products at checkout with simple barcode scanning.', 'Employee Management: Track staff attendance, work hours, and individual performance from one dashboard.'],
    },
    {
      id: 'tattoo-studio', title: 'Tattoo Studio', image: pic('/img/tatoo.webp', 'Tattoo studio'),
      text: 'Your art is permanent, and your business management should be seamless. ZenxPOS is designed specifically for the unique workflow of tattoo and piercing studios, managing everything from artist commissions to booth rentals.',
      bullets: ['Smart Pre-booking: Manage artist calendars for consultations and multi-hour sessions with a visual scheduler.', 'Artist Management: Track individual artist performance and automatically calculate commissions or booth rent.', 'Client Records & Notes: Store client contact info, past tattoo details, and placement notes for future sessions.', 'Automated Reminders: Send SMS and email reminders to clients to reduce no-shows.'],
    },
  ],
}
