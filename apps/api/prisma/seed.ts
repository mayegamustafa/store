import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const CATEGORIES = [
  { name: 'Electronics',      slug: 'electronics',    icon: 'electronics', description: 'Phones, Laptops, Tablets & Accessories' },
  { name: 'Fashion',          slug: 'fashion',        icon: 'fashion', description: 'Clothes, Shoes, Bags & Accessories' },
  { name: 'Home & Living',    slug: 'home-living',    icon: 'home', description: 'Furniture, Decor, Kitchen & Bedding' },
  { name: 'Sports & Fitness', slug: 'sports',         icon: 'sports', description: 'Equipment, Apparel & Accessories' },
  { name: 'Health & Beauty',  slug: 'health-beauty',  icon: 'beauty', description: 'Cosmetics, Skincare & Healthcare' },
  { name: 'Groceries & Food', slug: 'food-grocery',   icon: 'food', description: 'Fresh produce, Packaged foods & Drinks' },
  { name: 'Books & Education',slug: 'books',          icon: 'books', description: 'Books, Stationery & School supplies' },
  { name: 'Automotive',       slug: 'automotive',     icon: 'automotive', description: 'Car accessories, Parts & Tools' },
  { name: 'Baby & Kids',      slug: 'baby-kids',      icon: 'kids', description: 'Toys, Clothes, Feeds & Accessories' },
  { name: 'Garden & Outdoor', slug: 'garden-outdoor', icon: 'garden', description: 'Plants, Tools, Furniture & BBQ' },
];

const SELLERS = [
  { email: 'seller.tech@demo.com',    phone: '+256702000001', firstName: 'Tech',   lastName: 'Hub',
    storeName: 'TechHub Uganda',    storeSlug: 'techhub-uganda',
    storeDescription: 'Your #1 stop for genuine electronics in Uganda',
    storeLogo: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=200&q=80' },
  { email: 'seller.fashion@demo.com', phone: '+256702000002', firstName: 'Trendy', lastName: 'Ug',
    storeName: 'Trendy UG',         storeSlug: 'trendy-ug',
    storeDescription: 'Local and imported fashion for men and women',
    storeLogo: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200&q=80' },
  { email: 'seller.home@demo.com',    phone: '+256702000003', firstName: 'Home',   lastName: 'Decor',
    storeName: 'HomeStyle UG',      storeSlug: 'homestyle-ug',
    storeDescription: 'Beautiful home décor and furniture at great prices',
    storeLogo: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=200&q=80' },
  { email: 'seller.sports@demo.com',  phone: '+256702000004', firstName: 'Active', lastName: 'Uganda',
    storeName: 'Active Uganda',     storeSlug: 'active-uganda',
    storeDescription: 'Sports gear, fitness equipment and outdoor essentials',
    storeLogo: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=200&q=80' },
  { email: 'seller.beauty@demo.com',  phone: '+256702000005', firstName: 'Glow',   lastName: 'UG',
    storeName: 'Glow Beauty UG',    storeSlug: 'glow-beauty-ug',
    storeDescription: 'Premium skincare, cosmetics and wellness products',
    storeLogo: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=200&q=80' },
];

const PRODUCTS: any[] = [
  // Electronics
  { storeSlug: 'techhub-uganda', categorySlug: 'electronics', name: 'Samsung Galaxy A55 5G', slug: 'samsung-galaxy-a55-5g',
    description: 'Samsung Galaxy A55 5G — 50MP main camera, 6.6" Super AMOLED, 5000mAh battery, 8GB RAM, 128GB storage.',
    basePrice: 1850000, comparePrice: 2100000, stock: 45, isFeatured: true, rating: 4.7, reviewCount: 124,
    images: ['https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=400&q=80','https://images.unsplash.com/photo-1580910051074-3eb694886505?w=400&q=80'],
    tags: ['samsung','5g','smartphone'] },
  { storeSlug: 'techhub-uganda', categorySlug: 'electronics', name: 'iPhone 15 128GB', slug: 'iphone-15-128gb',
    description: 'Apple iPhone 15 — A16 Bionic chip, 48MP main camera, Dynamic Island, USB-C.',
    basePrice: 4200000, comparePrice: 4800000, stock: 20, isFeatured: true, rating: 4.9, reviewCount: 213,
    images: ['https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=400&q=80','https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&q=80'],
    tags: ['iphone','apple','smartphone'] },
  { storeSlug: 'techhub-uganda', categorySlug: 'electronics', name: 'Tecno Camon 30 Pro', slug: 'tecno-camon-30-pro',
    description: 'Tecno Camon 30 Pro — 50MP AI camera, 6.77" AMOLED display, 5000mAh fast-charge battery.',
    basePrice: 780000, comparePrice: 920000, stock: 60, isFeatured: false, rating: 4.3, reviewCount: 87,
    images: ['https://images.unsplash.com/photo-1616778870645-d6a7571eb1c1?w=400&q=80'],
    tags: ['tecno','budget','smartphone'] },
  { storeSlug: 'techhub-uganda', categorySlug: 'electronics', name: 'HP Laptop 15s Intel Core i5', slug: 'hp-laptop-15s-core-i5',
    description: 'HP 15s — Intel Core i5 12th Gen, 8GB DDR4 RAM, 256GB SSD, 15.6" FHD display.',
    basePrice: 2400000, comparePrice: 2850000, stock: 18, isFeatured: true, rating: 4.6, reviewCount: 156,
    images: ['https://images.unsplash.com/photo-1496181133206-80ce9b88a0a4?w=400&q=80','https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=400&q=80'],
    tags: ['laptop','hp','computer'] },
  { storeSlug: 'techhub-uganda', categorySlug: 'electronics', name: 'Sony WH-1000XM5 Headphones', slug: 'sony-wh-1000xm5',
    description: 'Sony WH-1000XM5 — Industry-leading noise cancellation, 30-hour battery.',
    basePrice: 1100000, comparePrice: 1400000, stock: 30, isFeatured: true, rating: 4.8, reviewCount: 98,
    images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80'],
    tags: ['sony','headphones','wireless'] },
  { storeSlug: 'techhub-uganda', categorySlug: 'electronics', name: 'Samsung 55" 4K Smart TV', slug: 'samsung-55-4k-smart-tv',
    description: 'Samsung Crystal 4K UHD 55-inch Smart TV — Bixby voice control, 4K HDR, built-in Netflix.',
    basePrice: 3500000, comparePrice: 4200000, stock: 12, isFeatured: true, rating: 4.5, reviewCount: 64,
    images: ['https://images.unsplash.com/photo-1593784991095-a205069470b6?w=400&q=80'],
    tags: ['samsung','tv','4k','smart-tv'] },
  { storeSlug: 'techhub-uganda', categorySlug: 'electronics', name: 'Apple iPad Pro 11" M2', slug: 'apple-ipad-pro-11-m2',
    description: 'Apple iPad Pro 11-inch M2 chip — Liquid Retina display, 256GB, Wi-Fi 6E, USB-C.',
    basePrice: 3800000, comparePrice: 4300000, stock: 8, isFeatured: false, rating: 4.7, reviewCount: 43,
    images: ['https://images.unsplash.com/photo-1544244015-0df4592987d0?w=400&q=80'],
    tags: ['apple','ipad','tablet'] },
  { storeSlug: 'techhub-uganda', categorySlug: 'electronics', name: 'JBL Flip 6 Bluetooth Speaker', slug: 'jbl-flip-6-bluetooth',
    description: 'JBL Flip 6 — IP67 waterproof, 12-hour playtime, PartyBoost.',
    basePrice: 430000, comparePrice: 520000, stock: 55, isFeatured: false, rating: 4.6, reviewCount: 201,
    images: ['https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&q=80'],
    tags: ['jbl','speaker','bluetooth'] },
  { storeSlug: 'techhub-uganda', categorySlug: 'electronics', name: 'Xiaomi Redmi Note 13 5G', slug: 'xiaomi-redmi-note-13-5g',
    description: 'Redmi Note 13 5G — 108MP camera, 120Hz AMOLED, 5000mAh, MediaTek Dimensity 6080.',
    basePrice: 1050000, comparePrice: 1280000, stock: 38, isFeatured: false, rating: 4.5, reviewCount: 167,
    images: ['https://images.unsplash.com/photo-1598965402089-897ce52e8355?w=400&q=80'],
    tags: ['xiaomi','redmi','5g','smartphone'] },
  { storeSlug: 'techhub-uganda', categorySlug: 'electronics', name: 'Anker 65W GaN Charger', slug: 'anker-65w-gan-charger',
    description: 'Anker 735 GaN charger — 65W, 3 ports (2×USB-C + 1×USB-A), folds flat.',
    basePrice: 185000, comparePrice: 240000, stock: 50, isFeatured: false, rating: 4.7, reviewCount: 89,
    images: ['https://images.unsplash.com/photo-1621163561777-d4ce73a5df17?w=400&q=80'],
    tags: ['charger','anker','gan','usb-c'] },
  // Fashion
  { storeSlug: 'trendy-ug', categorySlug: 'fashion', name: 'Nike Air Max 270 Sneakers', slug: 'nike-air-max-270',
    description: 'Nike Air Max 270 — Max Air heel unit for all-day comfort. Sizes 38–46.',
    basePrice: 320000, comparePrice: 420000, stock: 40, isFeatured: true, rating: 4.8, reviewCount: 305,
    images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80'],
    tags: ['nike','sneakers','shoes'] },
  { storeSlug: 'trendy-ug', categorySlug: 'fashion', name: 'Premium Slim Fit Chinos', slug: 'premium-slim-fit-chinos',
    description: 'Slim fit stretch chinos in 6 colours. Cotton-blend fabric, office & casual.',
    basePrice: 85000, comparePrice: 120000, stock: 80, isFeatured: false, rating: 4.4, reviewCount: 88,
    images: ['https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=400&q=80'],
    tags: ['chinos','trousers','men'] },
  { storeSlug: 'trendy-ug', categorySlug: 'fashion', name: "Women's Floral Summer Dress", slug: 'womens-floral-summer-dress',
    description: 'Lightweight floral wrap dress — midi length, V-neck, adjustable tie waist.',
    basePrice: 95000, comparePrice: 140000, stock: 65, isFeatured: true, rating: 4.6, reviewCount: 134,
    images: ['https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&q=80'],
    tags: ['dress','women','floral'] },
  { storeSlug: 'trendy-ug', categorySlug: 'fashion', name: 'Adidas Classic Backpack', slug: 'adidas-classic-backpack',
    description: 'Adidas Classic 3-Stripes backpack — 20L, padded laptop sleeve, front pocket.',
    basePrice: 145000, comparePrice: 200000, stock: 35, isFeatured: false, rating: 4.5, reviewCount: 67,
    images: ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&q=80'],
    tags: ['adidas','backpack','bag'] },
  { storeSlug: 'trendy-ug', categorySlug: 'fashion', name: 'Leather Crossbody Handbag', slug: 'leather-crossbody-handbag',
    description: 'Genuine leather crossbody bag — detachable strap, multiple compartments.',
    basePrice: 180000, comparePrice: 250000, stock: 28, isFeatured: true, rating: 4.7, reviewCount: 92,
    images: ['https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&q=80'],
    tags: ['handbag','leather','women'] },
  { storeSlug: 'trendy-ug', categorySlug: 'fashion', name: 'Classic Polo Shirt (Men)', slug: 'classic-polo-shirt-men',
    description: 'Premium cotton piqué polo — breathable, 8 colours, sizes S–3XL.',
    basePrice: 65000, comparePrice: 90000, stock: 120, isFeatured: false, rating: 4.3, reviewCount: 215,
    images: ['https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400&q=80'],
    tags: ['polo','shirt','men'] },
  { storeSlug: 'trendy-ug', categorySlug: 'fashion', name: 'Ray-Ban Wayfarer Sunglasses', slug: 'rayban-wayfarer-sunglasses',
    description: 'Ray-Ban Wayfarer Classic — acetate frame, UV400 protection, G-15 lenses.',
    basePrice: 210000, comparePrice: 280000, stock: 22, isFeatured: false, rating: 4.6, reviewCount: 57,
    images: ['https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&q=80'],
    tags: ['sunglasses','rayban','accessories'] },
  // Home & Living
  { storeSlug: 'homestyle-ug', categorySlug: 'home-living', name: '3-Seater L-Shape Sofa', slug: '3-seater-l-shape-sofa',
    description: 'Modern L-shape sofa — plush fabric, solid wood frame. Grey, beige or brown.',
    basePrice: 2800000, comparePrice: 3500000, stock: 10, isFeatured: true, rating: 4.6, reviewCount: 42,
    images: ['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80'],
    tags: ['sofa','furniture','living-room'] },
  { storeSlug: 'homestyle-ug', categorySlug: 'home-living', name: 'Non-Stick Cookware Set (8-piece)', slug: 'non-stick-cookware-set-8pc',
    description: 'PFOA-free non-stick pots and pans — induction compatible, dishwasher safe.',
    basePrice: 380000, comparePrice: 520000, stock: 30, isFeatured: true, rating: 4.7, reviewCount: 118,
    images: ['https://images.unsplash.com/photo-1584990347449-a2d4ef26b930?w=400&q=80'],
    tags: ['cookware','kitchen','pots'] },
  { storeSlug: 'homestyle-ug', categorySlug: 'home-living', name: 'Luxury Memory Foam Pillow Set', slug: 'memory-foam-pillow-set',
    description: 'Set of 2 memory foam pillows — ergonomic support, bamboo cover, hypoallergenic.',
    basePrice: 145000, comparePrice: 200000, stock: 50, isFeatured: false, rating: 4.5, reviewCount: 76,
    images: ['https://images.unsplash.com/photo-1629178438584-8e28c5f73c67?w=400&q=80'],
    tags: ['pillow','bedding','sleep'] },
  { storeSlug: 'homestyle-ug', categorySlug: 'home-living', name: 'Modern Floor Lamp (LED)', slug: 'modern-floor-lamp-led',
    description: 'Contemporary arc floor lamp — dimmable LED, 3 colour temperatures.',
    basePrice: 220000, comparePrice: 300000, stock: 25, isFeatured: false, rating: 4.4, reviewCount: 34,
    images: ['https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&q=80'],
    tags: ['lamp','lighting','decor'] },
  { storeSlug: 'homestyle-ug', categorySlug: 'home-living', name: 'Wall Art Canvas (Set of 3)', slug: 'wall-art-canvas-set-3',
    description: 'Abstract canvas prints set of 3 — ready to hang, solid wood frame. 30×40cm.',
    basePrice: 165000, comparePrice: 230000, stock: 40, isFeatured: false, rating: 4.3, reviewCount: 28,
    images: ['https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=400&q=80'],
    tags: ['wall-art','canvas','decor'] },
  { storeSlug: 'homestyle-ug', categorySlug: 'home-living', name: 'BlendJet 2 Portable Blender', slug: 'blendjet-2-portable-blender',
    description: 'BlendJet 2 rechargeable portable blender — 16oz, USB-C, self-cleaning, BPA-free.',
    basePrice: 185000, comparePrice: 240000, stock: 35, isFeatured: true, rating: 4.6, reviewCount: 89,
    images: ['https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=400&q=80'],
    tags: ['blender','kitchen','smoothie'] },
  // Sports
  { storeSlug: 'active-uganda', categorySlug: 'sports', name: 'Adidas Football Size 5', slug: 'adidas-football-size-5',
    description: 'Official-size Adidas football — FIFA Quality Pro certified, 32-panel design.',
    basePrice: 95000, comparePrice: 130000, stock: 70, isFeatured: true, rating: 4.7, reviewCount: 245,
    images: ['https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=400&q=80'],
    tags: ['football','soccer','adidas'] },
  { storeSlug: 'active-uganda', categorySlug: 'sports', name: 'Yoga Mat with Strap (6mm)', slug: 'yoga-mat-with-strap-6mm',
    description: 'Extra-thick 6mm TPE yoga mat — non-slip, carrying strap. 183×61cm.',
    basePrice: 75000, comparePrice: 110000, stock: 55, isFeatured: false, rating: 4.5, reviewCount: 132,
    images: ['https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&q=80'],
    tags: ['yoga','fitness','mat'] },
  { storeSlug: 'active-uganda', categorySlug: 'sports', name: 'Adjustable Dumbbell Set 20kg', slug: 'adjustable-dumbbell-set-20kg',
    description: 'Adjustable dumbbells 2.5–20kg per hand in 2.5kg increments. Rubber coated.',
    basePrice: 350000, comparePrice: 450000, stock: 20, isFeatured: true, rating: 4.8, reviewCount: 67,
    images: ['https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&q=80'],
    tags: ['dumbbell','weight','gym'] },
  { storeSlug: 'active-uganda', categorySlug: 'sports', name: 'Compression Running Tights', slug: 'compression-running-tights',
    description: 'High-compression running tights — moisture-wicking, flat seams, phone pocket.',
    basePrice: 85000, comparePrice: 120000, stock: 45, isFeatured: false, rating: 4.4, reviewCount: 53,
    images: ['https://images.unsplash.com/photo-1483721310020-03333e577078?w=400&q=80'],
    tags: ['running','tights','compression'] },
  { storeSlug: 'active-uganda', categorySlug: 'sports', name: 'Badminton Racket Set (2pcs)', slug: 'badminton-racket-set-2pcs',
    description: 'Lightweight aluminium badminton set — 2 rackets + 3 shuttlecocks + carry bag.',
    basePrice: 110000, comparePrice: 160000, stock: 30, isFeatured: false, rating: 4.2, reviewCount: 41,
    images: ['https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=400&q=80'],
    tags: ['badminton','racket','sport'] },
  // Health & Beauty
  { storeSlug: 'glow-beauty-ug', categorySlug: 'health-beauty', name: 'CeraVe Moisturising Cream 340g', slug: 'cerave-moisturising-cream-340g',
    description: 'CeraVe Moisturising Cream — 3 ceramides, hyaluronic acid, non-comedogenic. Dermatologist recommended.',
    basePrice: 120000, comparePrice: 160000, stock: 80, isFeatured: true, rating: 4.8, reviewCount: 321,
    images: ['https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=400&q=80'],
    tags: ['skincare','moisturiser','cerave'] },
  { storeSlug: 'glow-beauty-ug', categorySlug: 'health-beauty', name: 'Vitamin C Serum 30ml', slug: 'vitamin-c-serum-30ml',
    description: '20% Vitamin C + Hyaluronic Acid — brightening, anti-ageing, fades dark spots.',
    basePrice: 95000, comparePrice: 135000, stock: 60, isFeatured: true, rating: 4.6, reviewCount: 189,
    images: ['https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&q=80'],
    tags: ['serum','vitamin-c','skincare'] },
  { storeSlug: 'glow-beauty-ug', categorySlug: 'health-beauty', name: 'Chanel Bleu de Chanel EDT 100ml', slug: 'chanel-bleu-de-chanel-100ml',
    description: 'Chanel Bleu de Chanel EDT 100ml — fresh aromatic fragrance, citrus, wood & amber.',
    basePrice: 580000, comparePrice: 720000, stock: 15, isFeatured: false, rating: 4.9, reviewCount: 145,
    images: ['https://images.unsplash.com/photo-1544736779-9bf9f8f2e97e?w=400&q=80'],
    tags: ['perfume','chanel','fragrance'] },
  { storeSlug: 'glow-beauty-ug', categorySlug: 'health-beauty', name: 'Oral-B Electric Toothbrush Pro', slug: 'oralb-electric-toothbrush-pro',
    description: 'Oral-B Pro 3000 — 3 cleaning modes, 2-min timer, pressure sensor.',
    basePrice: 280000, comparePrice: 380000, stock: 25, isFeatured: false, rating: 4.7, reviewCount: 76,
    images: ['https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=400&q=80'],
    tags: ['toothbrush','oral-b','dental'] },
  { storeSlug: 'glow-beauty-ug', categorySlug: 'health-beauty', name: 'Biotin Hair Growth Vitamins', slug: 'biotin-hair-growth-vitamins',
    description: '10000mcg Biotin + Zinc + Vitamin B. Reduces hair loss. 90 capsules / 3 months.',
    basePrice: 85000, comparePrice: 115000, stock: 100, isFeatured: false, rating: 4.4, reviewCount: 223,
    images: ['https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&q=80'],
    tags: ['biotin','hair','vitamins','supplement'] },
];

const FLASH_SALE_SLUGS = [
  { slug: 'samsung-galaxy-a55-5g',          pct: 0.78 },
  { slug: 'hp-laptop-15s-core-i5',          pct: 0.80 },
  { slug: 'sony-wh-1000xm5',                pct: 0.72 },
  { slug: 'nike-air-max-270',                pct: 0.75 },
  { slug: 'cerave-moisturising-cream-340g', pct: 0.82 },
  { slug: 'adidas-football-size-5',          pct: 0.80 },
  { slug: 'vitamin-c-serum-30ml',            pct: 0.75 },
  { slug: 'leather-crossbody-handbag',       pct: 0.78 },
  { slug: 'non-stick-cookware-set-8pc',      pct: 0.76 },
  { slug: 'adjustable-dumbbell-set-20kg',    pct: 0.80 },
];

const BANNERS = [
  { title: 'Mega Tech Sale', subtitle: 'Up to 55% off phones, laptops & accessories',
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=80',
    bgColor: 'bg-sky-700', buttonText: 'Shop Electronics', targetUrl: '/category/electronics',
    placement: 'home_hero', sortOrder: 1, isActive: true },
  { title: 'New Fashion Arrivals', subtitle: 'Fresh styles for men & women — updated weekly',
    image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=80',
    bgColor: 'bg-rose-600', buttonText: 'Shop Fashion', targetUrl: '/category/fashion',
    placement: 'home_hero', sortOrder: 2, isActive: true },
  { title: 'Home Makeover Sale', subtitle: 'Sofas, décor & kitchenware at unbeatable prices',
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1200&q=80',
    bgColor: 'bg-amber-600', buttonText: 'Shop Home', targetUrl: '/category/home-living',
    placement: 'home_hero', sortOrder: 3, isActive: true },
  { title: 'Flash Tech Deals 🔥', subtitle: 'Today only — massive savings on top brands',
    bgColor: 'bg-rose-600', buttonText: 'Shop Now', targetUrl: '/flash-sales', image: '',
    placement: 'home_middle', sortOrder: 1, isActive: true },
  { title: 'New Arrivals', subtitle: 'Fresh products added daily by top sellers',
    bgColor: 'bg-violet-700', buttonText: 'Explore', targetUrl: '/products?sort=newest', image: '',
    placement: 'home_middle', sortOrder: 2, isActive: true },
  { title: 'Free Delivery', subtitle: 'On all orders over UGX 100,000 — nationwide',
    bgColor: 'bg-emerald-600', buttonText: 'Shop Now', targetUrl: '/products', image: '',
    placement: 'home_bottom', sortOrder: 1, isActive: true },
  { title: 'Sell on TotalStore', subtitle: 'Reach millions of buyers — open your store free',
    bgColor: 'bg-sky-700', buttonText: 'Start Selling', targetUrl: '/seller/register', image: '',
    placement: 'home_bottom', sortOrder: 2, isActive: true },
  { title: '20% Off Your First Order',
    subtitle: 'New customers enjoy an exclusive discount. Use code WELCOME20 at checkout.',
    bgColor: 'bg-zinc-900', badgeText: 'Limited Offer', buttonText: 'Register & Save',
    targetUrl: '/auth/register', image: '', placement: 'home_single', sortOrder: 1, isActive: true },
];

const SETTINGS = [
  { key: 'SITE_NAME',               value: 'TotalStore' },
  { key: 'PRIMARY_COLOR',           value: '#0ea5e9' },
  { key: 'ACCENT_COLOR',            value: '#f59e0b' },
  { key: 'HEADER_BG_COLOR',         value: '#0ea5e9' },
  { key: 'FOOTER_BG_COLOR',         value: '#111827' },
  { key: 'FOOTER_COPYRIGHT',        value: '© {year} TotalStore Uganda. All rights reserved.' },
  { key: 'SITE_PHONE',              value: '+256 700 000 000' },
  { key: 'SITE_EMAIL',              value: 'support@totalstore.ug' },
  { key: 'SITE_ADDRESS',            value: 'Kampala, Uganda' },
  { key: 'currency',                value: 'UGX' },
  { key: 'country',                 value: 'UG' },
  { key: 'default_commission',      value: '10' },
  { key: 'delivery_fee',            value: '5000' },
  { key: 'free_delivery_threshold', value: '100000' },
  { key: 'mtn_momo_enabled',        value: 'true' },
  { key: 'airtel_money_enabled',    value: 'true' },
  { key: 'pesapal_enabled',         value: 'true' },
  { key: 'cod_enabled',             value: 'true' },
];

const APP_CONFIG = [
  { key: 'API_BASE_URL', value: 'https://store.saktech.org/api/v1' },
  { key: 'API_BACKUP_URL', value: '' },
  { key: 'APP_VERSION_BUYER', value: '1.0.0' },
  { key: 'APP_VERSION_SELLER', value: '1.0.0' },
  { key: 'APP_VERSION_RIDER', value: '1.0.0' },
];

async function main() {
  console.log('🌱 Seeding database...\n');

  // ── Clean up old generic demo seller (from previous seed runs) ────────────
  const oldSeller = await prisma.user.findUnique({ where: { email: 'seller@demo.com' } });
  if (oldSeller) {
    const oldProfile = await prisma.sellerProfile.findUnique({ where: { userId: oldSeller.id } });
    if (oldProfile) {
      await prisma.product.deleteMany({ where: { sellerId: oldProfile.id } }).catch(() => {});
      await prisma.sellerProfile.delete({ where: { id: oldProfile.id } }).catch(() => {});
    }
    await prisma.user.delete({ where: { id: oldSeller.id } }).catch(() => {});
    console.log('🧹 Removed old demo seller');
  }

  // ── Admin ──────────────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('Admin@2024!', 10);
  await prisma.user.upsert({
    where: { email: 'admin@totalstore.ug' },
    update: { password: adminHash, role: 'ADMIN', status: 'ACTIVE', firstName: 'TotalStore', lastName: 'Admin', isEmailVerified: true, isPhoneVerified: true },
    create: {
      firstName: 'TotalStore', lastName: 'Admin', phone: '+256700000000',
      email: 'admin@totalstore.ug', password: adminHash, role: 'ADMIN', status: 'ACTIVE',
      isPhoneVerified: true, isEmailVerified: true,
    },
  });
  console.log('✅ Admin: admin@totalstore.ug / Admin@2024!');

  // ── Categories ─────────────────────────────────────────────────────────────
  for (const cat of CATEGORIES) {
    await prisma.category.upsert({ where: { slug: cat.slug }, update: {}, create: cat });
  }
  console.log(`✅ ${CATEGORIES.length} categories`);

  // ── Sellers ────────────────────────────────────────────────────────────────
  const sellerPass = await bcrypt.hash('Seller@2024!', 10);
  const sellerMap: Record<string, any> = {};
  for (const s of SELLERS) {
    const u = await prisma.user.upsert({
      where: { email: s.email },
      update: { password: sellerPass, status: 'ACTIVE', isEmailVerified: true },
      create: { firstName: s.firstName, lastName: s.lastName, phone: s.phone, email: s.email,
        password: sellerPass, role: 'SELLER', status: 'ACTIVE', isPhoneVerified: true },
    });
    const sp = await prisma.sellerProfile.upsert({
      where: { userId: u.id },
      update: { storeLogo: s.storeLogo, storeDescription: s.storeDescription },
      create: {
        userId: u.id, storeName: s.storeName, storeSlug: s.storeSlug,
        storeLogo: s.storeLogo, storeDescription: s.storeDescription,
        businessType: 'individual', status: 'APPROVED', commissionRate: 10,
      },
    });
    sellerMap[s.storeSlug] = sp;
  }
  console.log(`✅ ${SELLERS.length} sellers`);

  // ── Products ───────────────────────────────────────────────────────────────
  const productMap: Record<string, any> = {};
  let prodCount = 0;
  for (const p of PRODUCTS) {
    const cat = await prisma.category.findUnique({ where: { slug: p.categorySlug } });
    const seller = sellerMap[p.storeSlug];
    if (!cat || !seller) { console.warn(`⚠️  Skip ${p.slug}`); continue; }
    const prod = await prisma.product.upsert({
      where: { slug: p.slug },
      update: { images: p.images, isFeatured: p.isFeatured ?? false, basePrice: p.basePrice, comparePrice: p.comparePrice, stock: p.stock },
      create: {
        name: p.name, slug: p.slug, description: p.description, basePrice: p.basePrice,
        comparePrice: p.comparePrice, stock: p.stock, images: p.images, categoryId: cat.id,
        sellerId: seller.id, status: 'APPROVED', isFeatured: p.isFeatured ?? false, tags: p.tags ?? [],
      } as any,
    });
    productMap[p.slug] = prod;
    prodCount++;
  }
  console.log(`✅ ${prodCount} products`);

  // ── Flash Sale ─────────────────────────────────────────────────────────────
  const endsAt = new Date();
  endsAt.setDate(endsAt.getDate() + 2);
  endsAt.setHours(12, 0, 0, 0);

  let flashSale = await prisma.flashSale.findFirst({ where: { title: 'Weekend Flash Sale' } });
  if (!flashSale) {
    flashSale = await prisma.flashSale.create({
      data: { title: 'Weekend Flash Sale', startsAt: new Date(), endsAt, isActive: true },
    });
  }

  let flashCount = 0;
  for (const fi of FLASH_SALE_SLUGS) {
    const prod = productMap[fi.slug];
    if (!prod) continue;
    const existing = await (prisma as any).flashSaleItem?.findFirst?.({ where: { flashSaleId: flashSale.id, productId: prod.id } });
    if (!existing) {
      await (prisma as any).flashSaleItem.create({
        data: { flashSaleId: flashSale.id, productId: prod.id,
          salePrice: Math.round(prod.basePrice * fi.pct), stockLimit: 50, stockSold: Math.floor(Math.random() * 30) },
      }).catch(() => {});
    }
    flashCount++;
  }
  console.log(`✅ Flash sale: ${flashCount} items`);

  // ── Banners ────────────────────────────────────────────────────────────────
  await prisma.banner.deleteMany({ where: { placement: { in: ['home_hero','home_middle','home_bottom','home_single'] } } }).catch(() => {});
  for (const b of BANNERS) {
    await prisma.banner.create({ data: b as any }).catch(() => {});
  }
  console.log(`✅ ${BANNERS.length} banners`);

  // ── Settings ───────────────────────────────────────────────────────────────
  for (const s of SETTINGS) {
    await prisma.setting.upsert({ where: { key: s.key }, update: { value: s.value }, create: s });
  }
  console.log(`✅ ${SETTINGS.length} settings`);

  // ── App Config (merged into Settings) ─────────────────────────────────────
  for (const c of APP_CONFIG) {
    await prisma.setting.upsert({
      where: { key: c.key },
      update: { value: c.value },
      create: { key: c.key, value: c.value, group: 'api_config' },
    });
  }
  console.log(`✅ ${APP_CONFIG.length} app config entries`);

  console.log(`
🎉 Seed complete!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔑 Admin:           admin@totalstore.ug  / Admin@2024!
🏪 TechHub:         seller.tech@demo.com / Seller@2024!
👗 Trendy UG:       seller.fashion@demo.com / Seller@2024!
🏠 HomeStyle UG:    seller.home@demo.com / Seller@2024!
⚽ Active Uganda:   seller.sports@demo.com / Seller@2024!
💄 Glow Beauty:     seller.beauty@demo.com / Seller@2024!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
