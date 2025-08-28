import { Product, Collection, Image } from './shopify/types';

// Placeholder images from Unsplash for different product categories
const PLACEHOLDER_IMAGES = {
  electronics: [
    'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=800&h=800&fit=crop',
    'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800&h=800&fit=crop',
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&h=800&fit=crop'
  ],
  clothing: [
    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=800&fit=crop',
    'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=800&h=800&fit=crop',
    'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&h=800&fit=crop'
  ],
  accessories: [
    'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&h=800&fit=crop',
    'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&h=800&fit=crop',
    'https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?w=800&h=800&fit=crop'
  ],
  home: [
    'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&h=800&fit=crop',
    'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&h=800&fit=crop',
    'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=800&h=800&fit=crop'
  ]
};

const PRODUCT_CATEGORIES = Object.keys(PLACEHOLDER_IMAGES) as Array<keyof typeof PLACEHOLDER_IMAGES>;

function getRandomImage(category?: keyof typeof PLACEHOLDER_IMAGES): Image {
  const selectedCategory = category || PRODUCT_CATEGORIES[Math.floor(Math.random() * PRODUCT_CATEGORIES.length)] as keyof typeof PLACEHOLDER_IMAGES;
  const images = PLACEHOLDER_IMAGES[selectedCategory];
  const imageUrl = images[Math.floor(Math.random() * images.length)] || images[0];
  
  return {
    url: imageUrl || '',
    altText: `${selectedCategory} product image`,
    width: 800,
    height: 800
  };
}

function generateMockProduct(index: number, category?: keyof typeof PLACEHOLDER_IMAGES): Product {
  const productNames = {
    electronics: ['Wireless Headphones', 'Smart Watch', 'Bluetooth Speaker', 'Laptop Stand', 'Phone Case'],
    clothing: ['Cotton T-Shirt', 'Denim Jacket', 'Casual Sneakers', 'Summer Dress', 'Wool Sweater'],
    accessories: ['Leather Wallet', 'Sunglasses', 'Watch', 'Backpack', 'Belt'],
    home: ['Coffee Mug', 'Throw Pillow', 'Table Lamp', 'Plant Pot', 'Wall Art']
  };
  
  const selectedCategory = category || PRODUCT_CATEGORIES[index % PRODUCT_CATEGORIES.length] as keyof typeof PLACEHOLDER_IMAGES;
  const names = productNames[selectedCategory];
  const productName = names[index % names.length] || 'Product';
  
  const featuredImage = getRandomImage(selectedCategory);
  const additionalImages = Array.from({ length: 2 }, () => getRandomImage(selectedCategory));
  
  return {
    id: `mock-product-${index}`,
    handle: `${productName.toLowerCase().replace(/\s+/g, '-')}-${index}`,
    availableForSale: true,
    title: productName,
    description: `High-quality ${productName.toLowerCase()} perfect for everyday use. Made with premium materials and designed for comfort and durability.`,
    descriptionHtml: `<p>High-quality <strong>${productName.toLowerCase()}</strong> perfect for everyday use.</p><p>Made with premium materials and designed for comfort and durability.</p>`,
    options: [
      {
        id: `option-${index}-1`,
        name: 'Size',
        values: ['Small', 'Medium', 'Large']
      },
      {
        id: `option-${index}-2`,
        name: 'Color',
        values: ['Black', 'White', 'Gray']
      }
    ],
    priceRange: {
      maxVariantPrice: {
        amount: (Math.random() * 200 + 20).toFixed(2),
        currencyCode: 'USD'
      },
      minVariantPrice: {
        amount: (Math.random() * 100 + 10).toFixed(2),
        currencyCode: 'USD'
      }
    },
    variants: [
      {
        id: `variant-${index}-1`,
        title: 'Default',
        availableForSale: true,
        selectedOptions: [
          { name: 'Size', value: 'Medium' },
          { name: 'Color', value: 'Black' }
        ],
        price: {
          amount: (Math.random() * 150 + 15).toFixed(2),
          currencyCode: 'USD'
        }
      }
    ],
    featuredImage,
    images: [featuredImage, ...additionalImages],
    seo: {
      title: `${productName} - Premium Quality`,
      description: `Shop our ${productName.toLowerCase()} for the best quality and value. Free shipping available.`
    },
    tags: [selectedCategory, 'featured', 'bestseller'],
    updatedAt: new Date().toISOString()
  };
}

export function generateMockProducts(count: number = 12): Product[] {
  return Array.from({ length: count }, (_, index) => generateMockProduct(index));
}

export function generateMockCollections(): Collection[] {
  return [
    {
      handle: 'electronics',
      title: 'Electronics',
      description: 'Latest electronic gadgets and accessories',
      seo: {
        title: 'Electronics Collection',
        description: 'Discover our latest electronic gadgets and accessories'
      },
      updatedAt: new Date().toISOString(),
      path: '/collections/electronics'
    },
    {
      handle: 'clothing',
      title: 'Clothing',
      description: 'Trendy and comfortable clothing for all occasions',
      seo: {
        title: 'Clothing Collection',
        description: 'Shop trendy and comfortable clothing for all occasions'
      },
      updatedAt: new Date().toISOString(),
      path: '/collections/clothing'
    },
    {
      handle: 'accessories',
      title: 'Accessories',
      description: 'Complete your look with our stylish accessories',
      seo: {
        title: 'Accessories Collection',
        description: 'Complete your look with our stylish accessories'
      },
      updatedAt: new Date().toISOString(),
      path: '/collections/accessories'
    },
    {
      handle: 'home',
      title: 'Home & Living',
      description: 'Beautiful items to make your house a home',
      seo: {
        title: 'Home & Living Collection',
        description: 'Beautiful items to make your house a home'
      },
      updatedAt: new Date().toISOString(),
      path: '/collections/home'
    }
  ];
}

export function getMockProductByHandle(handle: string): Product | undefined {
  // Extract index from handle if it follows our pattern
  const match = handle.match(/-([0-9]+)$/);
  const index = match && match[1] ? parseInt(match[1], 10) : 0;
  return generateMockProduct(index);
}

export function getMockCollectionProducts(collection: string, count: number = 8): Product[] {
  const category = collection as keyof typeof PLACEHOLDER_IMAGES;
  if (PLACEHOLDER_IMAGES[category]) {
    return Array.from({ length: count }, (_, index) => generateMockProduct(index, category));
  }
  return generateMockProducts(count);
}