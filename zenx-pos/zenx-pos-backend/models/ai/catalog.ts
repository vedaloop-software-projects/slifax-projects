// Built-in retail knowledge for ZenxPOS AI product creation: common Indian retail item
// types with their category, sub-category, HSN and usual GST, and well-known brands.
// These are starting examples for the product model; a store's own products teach it
// the store's naming and take priority, including for the GST rate (an HSN the store
// already uses keeps the store's rate). GST here follows the September 2025 slabs and
// is always shown to the user to confirm.

// `phrases` are comma-separated names the item is sold under; each is one example.
export type CatalogEntry = { phrases: string[]; category: string; subCategory: string; hsn: string; gst: number; loose?: boolean }

const rows: [string, string, string, string, number, boolean?][] = [
  // Dairy
  ['milk, toned milk, full cream milk, double toned milk, cow milk, buffalo milk', 'Dairy', 'Milk', '0401', 0],
  ['curd, dahi, yogurt, yoghurt, lassi, buttermilk, chaas', 'Dairy', 'Curd and Yogurt', '0403', 5],
  ['butter, salted butter, unsalted butter, table butter', 'Dairy', 'Butter and Ghee', '0405', 5],
  ['ghee, cow ghee, desi ghee', 'Dairy', 'Butter and Ghee', '0405', 5],
  ['cheese, cheese slices, cheese spread, mozzarella', 'Dairy', 'Cheese and Paneer', '0406', 5],
  ['paneer, cottage cheese', 'Dairy', 'Cheese and Paneer', '0406', 0],
  ['milk powder, dairy whitener', 'Dairy', 'Milk Powder', '0402', 5],
  ['condensed milk, milkmaid', 'Dairy', 'Milk Powder', '0402', 5],
  ['eggs, egg tray, brown eggs', 'Dairy', 'Eggs', '0407', 0],
  // Bakery, biscuits, confectionery
  ['biscuits, biscuit, cookies, cream biscuits, marie, glucose biscuits, digestive, crackers', 'Bakery and Biscuits', 'Biscuits', '1905', 5],
  ['bread, brown bread, white bread, pav, buns', 'Bakery and Biscuits', 'Bread', '1905', 0],
  ['cake, muffin, rusk, toast', 'Bakery and Biscuits', 'Cakes and Rusk', '1905', 5],
  ['chocolate, chocolate bar, wafer, wafer chocolate', 'Confectionery', 'Chocolates', '1806', 5],
  ['candy, toffee, lollipop, chewing gum, mints, eclairs', 'Confectionery', 'Candies and Gum', '1704', 5],
  // Snacks and packaged food
  ['chips, potato chips, wafers, crisps, nachos', 'Snacks', 'Chips', '2005', 5],
  ['namkeen, bhujia, mixture, sev, chivda, aloo bhujia', 'Snacks', 'Namkeen', '2106', 5],
  ['noodles, instant noodles, masala noodles, hakka noodles', 'Packaged Food', 'Noodles and Pasta', '1902', 5],
  ['pasta, macaroni, penne, spaghetti, vermicelli, seviyan', 'Packaged Food', 'Noodles and Pasta', '1902', 5],
  ['cornflakes, corn flakes, oats, muesli, chocos, breakfast cereal', 'Packaged Food', 'Breakfast Cereals', '1904', 5],
  ['ketchup, sauce, tomato sauce, chilli sauce, soya sauce, mayonnaise', 'Packaged Food', 'Sauces and Spreads', '2103', 5],
  ['jam, fruit jam, marmalade', 'Packaged Food', 'Sauces and Spreads', '2007', 5],
  ['peanut butter, chocolate spread', 'Packaged Food', 'Sauces and Spreads', '2008', 5],
  ['pickle, achar, mango pickle, lime pickle', 'Packaged Food', 'Pickles', '2001', 5],
  ['honey, pure honey', 'Packaged Food', 'Honey', '0409', 5],
  ['ready to eat, instant mix, idli mix, dosa mix, gulab jamun mix', 'Packaged Food', 'Ready Mixes', '2106', 5],
  ['soup, instant soup', 'Packaged Food', 'Soups', '2104', 5],
  // Frozen
  ['ice cream, cone, ice cream cup, kulfi, frozen dessert', 'Frozen Foods', 'Ice Cream', '2105', 5],
  ['frozen peas, frozen fries, nuggets, frozen snacks', 'Frozen Foods', 'Frozen Snacks', '2004', 5],
  // Beverages
  ['tea, leaf tea, dust tea, green tea, tea bags, chai', 'Beverages', 'Tea', '0902', 5],
  ['coffee, filter coffee, instant coffee', 'Beverages', 'Coffee', '2101', 5],
  ['health drink, malt drink, chocolate drink', 'Beverages', 'Health Drinks', '1901', 5],
  ['juice, fruit juice, mango drink, orange juice', 'Beverages', 'Juices', '2009', 5],
  ['soft drink, cola, cold drink, soda, aerated drink', 'Beverages', 'Soft Drinks', '2202', 40],
  ['energy drink', 'Beverages', 'Soft Drinks', '2202', 40],
  ['water, mineral water, packaged drinking water', 'Beverages', 'Water', '2201', 18],
  // Staples
  ['rice, basmati rice, sona masoori, raw rice, boiled rice', 'Staples', 'Rice', '1006', 5],
  ['atta, wheat flour, chakki atta', 'Staples', 'Atta and Flours', '1101', 5],
  ['maida, besan, rava, sooji, ragi flour, rice flour, corn flour', 'Staples', 'Atta and Flours', '1106', 5],
  ['dal, toor dal, moong dal, chana dal, urad dal, masoor dal, rajma, chana, pulses', 'Staples', 'Dals and Pulses', '0713', 5],
  ['sugar, white sugar', 'Staples', 'Sugar and Jaggery', '1701', 5],
  ['jaggery, gur', 'Staples', 'Sugar and Jaggery', '1701', 0],
  ['salt, iodised salt, rock salt', 'Staples', 'Salt', '2501', 0],
  ['poha, flattened rice', 'Staples', 'Rice', '1904', 5],
  ['almonds, cashew, raisins, dry fruits, walnuts, pista, dates', 'Staples', 'Dry Fruits', '0801', 5],
  // Edible oils
  ['sunflower oil, refined oil', 'Edible Oils', 'Sunflower Oil', '1512', 5],
  ['groundnut oil, peanut oil', 'Edible Oils', 'Groundnut Oil', '1508', 5],
  ['mustard oil, kachi ghani', 'Edible Oils', 'Mustard Oil', '1514', 5],
  ['rice bran oil', 'Edible Oils', 'Rice Bran Oil', '1515', 5],
  ['coconut oil, edible coconut oil', 'Edible Oils', 'Coconut Oil', '1513', 5],
  ['olive oil', 'Edible Oils', 'Olive Oil', '1509', 5],
  ['palm oil, palmolein', 'Edible Oils', 'Palm Oil', '1511', 5],
  // Spices
  ['turmeric, haldi, turmeric powder', 'Spices and Masalas', 'Powders', '0910', 5],
  ['chilli powder, red chilli, mirchi powder', 'Spices and Masalas', 'Powders', '0904', 5],
  ['coriander powder, dhania powder, jeera, cumin', 'Spices and Masalas', 'Powders', '0909', 5],
  ['masala, garam masala, chicken masala, sambar powder, biryani masala, chole masala', 'Spices and Masalas', 'Blended Masalas', '0910', 5],
  ['pepper, black pepper, cardamom, elaichi, cloves, cinnamon', 'Spices and Masalas', 'Whole Spices', '0904', 5],
  // Personal care
  ['shampoo, anti dandruff shampoo, conditioner', 'Personal Care', 'Hair Care', '3305', 5],
  ['hair oil, coconut hair oil, amla hair oil', 'Personal Care', 'Hair Care', '3305', 5],
  ['toothpaste, tooth paste', 'Personal Care', 'Oral Care', '3306', 5],
  ['toothbrush, tooth brush', 'Personal Care', 'Oral Care', '9603', 5],
  ['soap, bath soap, bathing bar, handwash, hand wash, body wash', 'Personal Care', 'Bath and Body', '3401', 5],
  ['face wash, face cream, cold cream, moisturiser, lotion, fairness cream', 'Personal Care', 'Skin Care', '3304', 18],
  ['talcum powder, talc', 'Personal Care', 'Skin Care', '3304', 5],
  ['deodorant, deo, perfume, body spray', 'Personal Care', 'Fragrances', '3307', 18],
  ['shaving cream, razor, blades, shaving foam', 'Personal Care', 'Shaving', '3307', 5],
  ['sanitary pads, sanitary napkins', 'Personal Care', 'Feminine Care', '9619', 0],
  // Home care
  ['detergent, detergent powder, washing powder, detergent liquid, matic', 'Home Care', 'Laundry', '3402', 18],
  ['detergent bar, washing bar', 'Home Care', 'Laundry', '3401', 18],
  ['dishwash bar, dish wash, dishwash liquid, utensil cleaner', 'Home Care', 'Dishwash', '3402', 18],
  ['toilet cleaner, floor cleaner, disinfectant, surface cleaner', 'Home Care', 'Cleaners', '3402', 18],
  ['mosquito repellent, coil, liquidator, insect spray', 'Home Care', 'Repellents', '3808', 18],
  ['agarbatti, incense sticks, dhoop', 'Home Care', 'Pooja Items', '3307', 5],
  ['tissue paper, napkins, toilet roll, kitchen towel', 'Home Care', 'Tissues', '4818', 18],
  ['garbage bags, trash bags, aluminium foil, cling wrap', 'Home Care', 'Kitchen Supplies', '3923', 18],
  ['candles', 'Home Care', 'Pooja Items', '3406', 5],
  // Baby care
  ['diapers, baby diapers, diaper pants', 'Baby Care', 'Diapers', '9619', 5],
  ['baby food, infant food', 'Baby Care', 'Baby Food', '1901', 5],
  ['baby soap, baby oil, baby powder, baby lotion', 'Baby Care', 'Baby Toiletries', '3401', 5],
  // Fruits and vegetables (sold loose)
  ['tomato, onion, potato, carrot, beans, cabbage, cauliflower, brinjal, okra, bhindi, capsicum', 'Fruits and Vegetables', 'Vegetables', '0709', 0, true],
  ['coriander leaves, mint, curry leaves, spinach, palak, methi', 'Fruits and Vegetables', 'Leafy Vegetables', '0709', 0, true],
  ['banana, apple, orange, mango, grapes, papaya, pomegranate, watermelon', 'Fruits and Vegetables', 'Fruits', '0810', 0, true],
  ['ginger, garlic, green chilli, lemon', 'Fruits and Vegetables', 'Vegetables', '0709', 0, true],
]

export const CATALOG: CatalogEntry[] = rows.map(([phrases, category, subCategory, hsn, gst, loose]) => ({ phrases: phrases.split(',').map(phrase => phrase.trim()), category, subCategory, hsn, gst, loose }))

export const KNOWN_BRANDS = [
  'Amul', 'Mother Dairy', 'Heritage', 'Nandini', 'Aavin', 'Milky Mist', 'Britannia', 'Parle', 'Sunfeast', 'Bisk Farm', 'Unibic', 'McVities', 'Oreo', 'Cadbury',
  'Nestle', 'Maggi', 'Kitkat', 'Ferrero', 'Haldiram', 'Bikaji', 'Balaji', 'Lays', 'Kurkure', 'Bingo', 'Uncle Chipps', 'Too Yumm', 'Pringles', 'Yippee', 'Top Ramen',
  'Chings', 'Knorr', 'Kissan', 'Del Monte', 'Mothers Recipe', 'Priya', 'Aachi', 'MTR', 'Gits', 'Eastern', 'Everest', 'MDH', 'Catch', 'Sakthi', 'Tata', 'Tata Sampann',
  'Aashirvaad', 'Pillsbury', 'Fortune', 'Saffola', 'Sundrop', 'Gold Winner', 'Gemini', 'Freedom', 'Dhara', 'Ruchi Gold', 'Emami', 'Patanjali', 'Dabur', 'India Gate',
  'Daawat', 'Kohinoor', 'Kelloggs', 'Quaker', 'Bournvita', 'Horlicks', 'Boost', 'Complan', 'Red Label', 'Taj Mahal', 'Brooke Bond', 'Tata Tea', 'Bru', 'Nescafe',
  'Coca Cola', 'Pepsi', 'Thums Up', 'Sprite', 'Fanta', 'Limca', 'Mirinda', '7Up', 'Frooti', 'Maaza', 'Slice', 'Real', 'Tropicana', 'Paper Boat', 'Bisleri', 'Kinley',
  'Aquafina', 'Red Bull', 'Kwality Walls', 'Vadilal', 'Havmor', 'Arun', 'Colgate', 'Pepsodent', 'Close Up', 'Sensodyne', 'Oral B', 'Dove', 'Lux', 'Lifebuoy',
  'Dettol', 'Savlon', 'Santoor', 'Pears', 'Cinthol', 'Medimix', 'Hamam', 'Margo', 'Vivel', 'Godrej', 'Godrej No 1', 'Head and Shoulders', 'Pantene', 'Sunsilk',
  'Clinic Plus', 'Tresemme', 'Parachute', 'Bajaj', 'Nivea', 'Ponds', 'Glow and Lovely', 'Himalaya', 'Vaseline', 'Lakme', 'Gillette', 'Fogg', 'Axe', 'Park Avenue',
  'Wild Stone', 'Engage', 'Whisper', 'Stayfree', 'Sofy', 'Pampers', 'Huggies', 'MamyPoko', 'Cerelac', 'Johnsons', 'Himalaya Baby', 'Surf Excel', 'Ariel', 'Tide',
  'Rin', 'Wheel', 'Nirma', 'Ghadi', 'Henko', 'Vim', 'Exo', 'Pril', 'Harpic', 'Lizol', 'Domex', 'Colin', 'Good Knight', 'All Out', 'Mortein', 'Hit', 'Odonil',
  'Cycle', 'Mangaldeep', 'Zed Black', 'Origami', 'Selpak', 'Hide and Seek', 'Good Day', 'Marie Gold', 'Bourbon', 'Monaco', 'Krackjack', 'Dairy Milk', '5 Star',
  'Perk', 'Munch', 'Eclairs', 'Alpenliebe', 'Center Fresh', 'Pulse', 'Epigamia', 'Yoga Bar', 'Act II', 'Saffola Oats',
]

// Brand names that say what the product is, used when the rest of the name does not.
export const BRAND_HINTS: Record<string, string> = {
  'Good Day': 'biscuits', 'Marie Gold': 'biscuits', 'Hide and Seek': 'biscuits', 'Bourbon': 'biscuits', 'Monaco': 'biscuits', 'Krackjack': 'biscuits', 'Oreo': 'biscuits',
  'Parle': 'biscuits', 'Sunfeast': 'biscuits', 'Unibic': 'cookies', 'McVities': 'biscuits', 'Bisk Farm': 'biscuits',
  'Surf Excel': 'detergent', 'Ariel': 'detergent', 'Tide': 'detergent', 'Rin': 'detergent', 'Wheel': 'detergent', 'Nirma': 'detergent', 'Ghadi': 'detergent', 'Henko': 'detergent',
  'Vim': 'dish wash', 'Exo': 'dish wash', 'Pril': 'dish wash', 'Harpic': 'toilet cleaner', 'Lizol': 'floor cleaner', 'Domex': 'toilet cleaner', 'Colin': 'surface cleaner',
  'Colgate': 'toothpaste', 'Pepsodent': 'toothpaste', 'Close Up': 'toothpaste', 'Sensodyne': 'toothpaste',
  'Lux': 'soap', 'Lifebuoy': 'soap', 'Santoor': 'soap', 'Pears': 'soap', 'Cinthol': 'soap', 'Medimix': 'soap', 'Hamam': 'soap', 'Margo': 'soap', 'Vivel': 'soap',
  'Head and Shoulders': 'shampoo', 'Pantene': 'shampoo', 'Sunsilk': 'shampoo', 'Clinic Plus': 'shampoo', 'Tresemme': 'shampoo',
  'Fogg': 'deodorant', 'Axe': 'deodorant', 'Park Avenue': 'deodorant', 'Wild Stone': 'deodorant', 'Engage': 'deodorant', 'Gillette': 'razor',
  'Whisper': 'sanitary pads', 'Stayfree': 'sanitary pads', 'Sofy': 'sanitary pads', 'Pampers': 'diapers', 'Huggies': 'diapers', 'MamyPoko': 'diapers', 'Cerelac': 'baby food',
  'Good Knight': 'mosquito repellent', 'All Out': 'mosquito repellent', 'Mortein': 'mosquito repellent', 'Hit': 'insect spray', 'Odonil': 'air freshener',
  'Cycle': 'agarbatti', 'Mangaldeep': 'agarbatti', 'Zed Black': 'agarbatti',
  'Lays': 'chips', 'Kurkure': 'namkeen', 'Bingo': 'chips', 'Uncle Chipps': 'chips', 'Pringles': 'chips', 'Too Yumm': 'chips', 'Haldiram': 'namkeen', 'Bikaji': 'namkeen', 'Balaji': 'chips',
  'Cadbury': 'chocolate', 'Dairy Milk': 'chocolate', '5 Star': 'chocolate', 'Perk': 'chocolate', 'Munch': 'chocolate', 'Kitkat': 'chocolate', 'Ferrero': 'chocolate',
  'Eclairs': 'toffee', 'Alpenliebe': 'candy', 'Center Fresh': 'chewing gum', 'Pulse': 'candy',
  'Maggi': 'noodles', 'Yippee': 'noodles', 'Top Ramen': 'noodles', 'Kissan': 'ketchup', 'Kelloggs': 'cornflakes', 'Quaker': 'oats', 'Saffola Oats': 'oats',
  'Bournvita': 'health drink', 'Horlicks': 'health drink', 'Boost': 'health drink', 'Complan': 'health drink',
  'Bru': 'coffee', 'Nescafe': 'coffee', 'Red Label': 'tea', 'Taj Mahal': 'tea', 'Brooke Bond': 'tea', 'Tata Tea': 'tea',
  'Coca Cola': 'soft drink', 'Pepsi': 'soft drink', 'Thums Up': 'soft drink', 'Sprite': 'soft drink', 'Fanta': 'soft drink', 'Limca': 'soft drink', 'Mirinda': 'soft drink', '7Up': 'soft drink',
  'Red Bull': 'energy drink', 'Frooti': 'mango drink', 'Maaza': 'mango drink', 'Slice': 'mango drink', 'Real': 'fruit juice', 'Tropicana': 'fruit juice', 'Paper Boat': 'fruit juice',
  'Bisleri': 'water', 'Kinley': 'water', 'Aquafina': 'water',
  'Kwality Walls': 'ice cream', 'Vadilal': 'ice cream', 'Havmor': 'ice cream', 'Arun': 'ice cream',
  'Everest': 'masala', 'MDH': 'masala', 'Catch': 'masala', 'Sakthi': 'masala', 'Aachi': 'masala',
  'India Gate': 'basmati rice', 'Daawat': 'basmati rice', 'Kohinoor': 'basmati rice', 'Aashirvaad': 'atta', 'Pillsbury': 'atta',
  'Fortune': 'refined oil', 'Saffola': 'refined oil', 'Sundrop': 'sunflower oil', 'Gold Winner': 'sunflower oil', 'Gemini': 'refined oil', 'Freedom': 'sunflower oil', 'Dhara': 'refined oil',
  'Amul': 'dairy', 'Mother Dairy': 'dairy', 'Heritage': 'dairy', 'Nandini': 'dairy', 'Aavin': 'dairy', 'Milky Mist': 'dairy', 'Epigamia': 'yogurt',
}
