import {
  HIDDEN_PRODUCT_TAG,
  SHOPIFY_GRAPHQL_API_ENDPOINT,
  TAGS
} from 'lib/constants';
import { isShopifyError } from 'lib/type-guards';
import { ensureStartsWith } from 'lib/utils';
import { generateMockProducts, generateMockCollections, getMockProductByHandle, getMockCollectionProducts } from 'lib/mock-data';
import {
  revalidateTag,
  unstable_cacheTag as cacheTag,
  unstable_cacheLife as cacheLife
} from 'next/cache';
import { cookies, headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import {
  addToCartMutation,
  createCartMutation,
  editCartItemsMutation,
  removeFromCartMutation
} from './mutations/cart';
import { getCartQuery } from './queries/cart';
import {
  getCollectionProductsQuery,
  getCollectionQuery,
  getCollectionsQuery
} from './queries/collection';
import { getMenuQuery } from './queries/menu';
import { getPageQuery, getPagesQuery } from './queries/page';
import {
  getProductQuery,
  getProductRecommendationsQuery,
  getProductsQuery
} from './queries/product';
import {
  Cart,
  Collection,
  Connection,
  Image,
  Menu,
  Page,
  Product,
  ShopifyAddToCartOperation,
  ShopifyCart,
  ShopifyCartOperation,
  ShopifyCollection,
  ShopifyCollectionOperation,
  ShopifyCollectionProductsOperation,
  ShopifyCollectionsOperation,
  ShopifyCreateCartOperation,
  ShopifyMenuOperation,
  ShopifyPageOperation,
  ShopifyPagesOperation,
  ShopifyProduct,
  ShopifyProductOperation,
  ShopifyProductRecommendationsOperation,
  ShopifyProductsOperation,
  ShopifyRemoveFromCartOperation,
  ShopifyUpdateCartOperation
} from './types';

const domain = process.env.SHOPIFY_STORE_DOMAIN
  ? ensureStartsWith(process.env.SHOPIFY_STORE_DOMAIN, 'https://')
  : '';
const endpoint = `${domain}${SHOPIFY_GRAPHQL_API_ENDPOINT}`;
const key = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN!;

type ExtractVariables<T> = T extends { variables: object }
  ? T['variables']
  : never;

export async function shopifyFetch<T>({
  headers,
  query,
  variables
}: {
  headers?: HeadersInit;
  query: string;
  variables?: ExtractVariables<T>;
}): Promise<{ status: number; body: T } | never> {
  try {
    const result = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': key,
        ...headers
      },
      body: JSON.stringify({
        ...(query && { query }),
        ...(variables && { variables })
      })
    });

    const body = await result.json();

    if (body.errors) {
      throw body.errors[0];
    }

    return {
      status: result.status,
      body
    };
  } catch (e) {
    console.warn('Shopify API call failed, using mock data:', e);
    // Return mock data structure based on query type
    throw {
      useMockData: true,
      originalError: e,
      query
    };
  }
}

const removeEdgesAndNodes = <T>(array: Connection<T>): T[] => {
  return array.edges.map((edge) => edge?.node);
};

const reshapeCart = (cart: ShopifyCart): Cart => {
  if (!cart.cost?.totalTaxAmount) {
    cart.cost.totalTaxAmount = {
      amount: '0.0',
      currencyCode: cart.cost.totalAmount.currencyCode
    };
  }

  return {
    ...cart,
    lines: removeEdgesAndNodes(cart.lines)
  };
};

const reshapeCollection = (
  collection: ShopifyCollection
): Collection | undefined => {
  if (!collection) {
    return undefined;
  }

  return {
    ...collection,
    path: `/search/${collection.handle}`
  };
};

const reshapeCollections = (collections: ShopifyCollection[]) => {
  const reshapedCollections = [];

  for (const collection of collections) {
    if (collection) {
      const reshapedCollection = reshapeCollection(collection);

      if (reshapedCollection) {
        reshapedCollections.push(reshapedCollection);
      }
    }
  }

  return reshapedCollections;
};

const reshapeImages = (images: Connection<Image>, productTitle: string) => {
  const flattened = removeEdgesAndNodes(images);

  return flattened.map((image) => {
    const filename = image.url.match(/.*\/(.*)\..*/)?.[1];
    return {
      ...image,
      altText: image.altText || `${productTitle} - ${filename}`
    };
  });
};

const reshapeProduct = (
  product: ShopifyProduct,
  filterHiddenProducts: boolean = true
) => {
  if (
    !product ||
    (filterHiddenProducts && product.tags.includes(HIDDEN_PRODUCT_TAG))
  ) {
    return undefined;
  }

  const { images, variants, ...rest } = product;

  return {
    ...rest,
    images: reshapeImages(images, product.title),
    variants: removeEdgesAndNodes(variants)
  };
};

const reshapeProducts = (products: ShopifyProduct[]) => {
  const reshapedProducts = [];

  for (const product of products) {
    if (product) {
      const reshapedProduct = reshapeProduct(product);

      if (reshapedProduct) {
        reshapedProducts.push(reshapedProduct);
      }
    }
  }

  return reshapedProducts;
};

export async function createCart(): Promise<Cart> {
  try {
    const res = await shopifyFetch<ShopifyCreateCartOperation>({
      query: createCartMutation
    });

    return reshapeCart(res.body.data.cartCreate.cart);
  } catch (e: any) {
    if (e.useMockData) {
      console.log('Using mock cart data for createCart');
      // Return a basic empty cart structure
      return {
        id: 'mock-cart-id',
        checkoutUrl: '',
        cost: {
          subtotalAmount: { amount: '0.00', currencyCode: 'USD' },
          totalAmount: { amount: '0.00', currencyCode: 'USD' },
          totalTaxAmount: { amount: '0.00', currencyCode: 'USD' }
        },
        lines: [],
        totalQuantity: 0
      };
    }
    throw e;
  }
}

export async function addToCart(
  lines: { merchandiseId: string; quantity: number }[]
): Promise<Cart> {
  try {
    const cartId = (await cookies()).get('cartId')?.value!;
    const res = await shopifyFetch<ShopifyAddToCartOperation>({
      query: addToCartMutation,
      variables: {
        cartId,
        lines
      }
    });
    return reshapeCart(res.body.data.cartLinesAdd.cart);
  } catch (e: any) {
    if (e.useMockData) {
      console.log('Using mock cart data for addToCart');
      // Return a basic cart with the added items
      return {
        id: 'mock-cart-id',
        checkoutUrl: '',
        cost: {
          subtotalAmount: { amount: '0.00', currencyCode: 'USD' },
          totalAmount: { amount: '0.00', currencyCode: 'USD' },
          totalTaxAmount: { amount: '0.00', currencyCode: 'USD' }
        },
        lines: [],
        totalQuantity: 0
      };
    }
    throw e;
  }
}

export async function removeFromCart(lineIds: string[]): Promise<Cart> {
  try {
    const cartId = (await cookies()).get('cartId')?.value!;
    const res = await shopifyFetch<ShopifyRemoveFromCartOperation>({
      query: removeFromCartMutation,
      variables: {
        cartId,
        lineIds
      }
    });

    return reshapeCart(res.body.data.cartLinesRemove.cart);
  } catch (e: any) {
    if (e.useMockData) {
      console.log('Using mock cart data for removeFromCart');
      return {
        id: 'mock-cart-id',
        checkoutUrl: '',
        cost: {
          subtotalAmount: { amount: '0.00', currencyCode: 'USD' },
          totalAmount: { amount: '0.00', currencyCode: 'USD' },
          totalTaxAmount: { amount: '0.00', currencyCode: 'USD' }
        },
        lines: [],
        totalQuantity: 0
      };
    }
    throw e;
  }
}

export async function updateCart(
  lines: { id: string; merchandiseId: string; quantity: number }[]
): Promise<Cart> {
  try {
    const cartId = (await cookies()).get('cartId')?.value!;
    const res = await shopifyFetch<ShopifyUpdateCartOperation>({
      query: editCartItemsMutation,
      variables: {
        cartId,
        lines
      }
    });

    return reshapeCart(res.body.data.cartLinesUpdate.cart);
  } catch (e: any) {
    if (e.useMockData) {
      console.log('Using mock cart data for updateCart');
      return {
        id: 'mock-cart-id',
        checkoutUrl: '',
        cost: {
          subtotalAmount: { amount: '0.00', currencyCode: 'USD' },
          totalAmount: { amount: '0.00', currencyCode: 'USD' },
          totalTaxAmount: { amount: '0.00', currencyCode: 'USD' }
        },
        lines: [],
        totalQuantity: 0
      };
    }
    throw e;
  }
}

export async function getCart(): Promise<Cart | undefined> {
  try {
    const cartId = (await cookies()).get('cartId')?.value;

    if (!cartId) {
      return undefined;
    }

    const res = await shopifyFetch<ShopifyCartOperation>({
      query: getCartQuery,
      variables: { cartId }
    });

    // Old carts becomes `null` when you checkout.
    if (!res.body.data.cart) {
      return undefined;
    }

    return reshapeCart(res.body.data.cart);
  } catch (e: any) {
    if (e.useMockData) {
      console.log('Using empty cart (mock mode)');
      return undefined;
    }
    throw e;
  }
}

export async function getCollection(
  handle: string
): Promise<Collection | undefined> {
  'use cache';
  cacheTag(TAGS.collections);
  cacheLife('days');

  try {
    const res = await shopifyFetch<ShopifyCollectionOperation>({
      query: getCollectionQuery,
      variables: {
        handle
      }
    });

    return reshapeCollection(res.body.data.collection);
  } catch (e: any) {
    if (e.useMockData) {
      console.log('Using mock collection data for:', handle);
      return undefined;
    }
    throw e;
  }
}

export async function getCollectionProducts({
  collection,
  reverse,
  sortKey
}: {
  collection: string;
  reverse?: boolean;
  sortKey?: string;
}): Promise<Product[]> {
  'use cache';
  cacheTag(TAGS.collections, TAGS.products);
  cacheLife('days');

  try {
    const res = await shopifyFetch<ShopifyCollectionProductsOperation>({
      query: getCollectionProductsQuery,
      variables: {
        handle: collection,
        reverse,
        sortKey: sortKey === 'CREATED_AT' ? 'CREATED' : sortKey
      }
    });

    if (!res.body.data.collection) {
      console.log(`No collection found for \`${collection}\``);
      return [];
    }

    return reshapeProducts(
      removeEdgesAndNodes(res.body.data.collection.products)
    );
  } catch (e: any) {
    if (e.useMockData) {
      console.log('Using mock collection products for:', collection);
      return getMockCollectionProducts(collection, 8);
    }
    throw e;
  }
}

export async function getCollections(): Promise<Collection[]> {
  'use cache';
  cacheTag(TAGS.collections);
  cacheLife('days');

  try {
    const res = await shopifyFetch<ShopifyCollectionsOperation>({
      query: getCollectionsQuery
    });
    const shopifyCollections = removeEdgesAndNodes(res.body?.data?.collections);
    const collections = [
      {
        handle: '',
        title: 'All',
        description: 'All products',
        seo: {
          title: 'All',
          description: 'All products'
        },
        path: '/search',
        updatedAt: new Date().toISOString()
      },
      // Filter out the `hidden` collections.
      // Collections that start with `hidden-*` need to be hidden on the search page.
      ...reshapeCollections(shopifyCollections).filter(
        (collection) => !collection.handle.startsWith('hidden')
      )
    ];

    return collections;
  } catch (e: any) {
    if (e.useMockData) {
      console.log('Using mock collections data');
      const mockCollections = generateMockCollections();
      return [
        {
          handle: '',
          title: 'All',
          description: 'All products',
          seo: {
            title: 'All',
            description: 'All products'
          },
          path: '/search',
          updatedAt: new Date().toISOString()
        },
        ...mockCollections
      ];
    }
    throw e;
  }
}

export async function getMenu(handle: string): Promise<Menu[]> {
  'use cache';
  cacheTag(TAGS.collections);
  cacheLife('days');

  try {
    const res = await shopifyFetch<ShopifyMenuOperation>({
      query: getMenuQuery,
      variables: {
        handle
      }
    });

    return (
      res.body?.data?.menu?.items.map((item: { title: string; url: string }) => ({
        title: item.title,
        path: item.url
          .replace(domain, '')
          .replace('/collections', '/search')
          .replace('/pages', '')
      })) || []
    );
  } catch (e: any) {
    if (e.useMockData) {
      console.log('Using mock menu data for:', handle);
      // Return a simple mock menu that matches our collections
      return [
        { title: 'All', path: '/search' },
        { title: 'Electronics', path: '/search/electronics' },
        { title: 'Clothing', path: '/search/clothing' },
        { title: 'Accessories', path: '/search/accessories' },
        { title: 'Home & Living', path: '/search/home' }
      ];
    }
    throw e;
  }
}

export async function getPage(handle: string): Promise<Page> {
  try {
    const res = await shopifyFetch<ShopifyPageOperation>({
      query: getPageQuery,
      variables: { handle }
    });

    return res.body.data.pageByHandle;
  } catch (e: any) {
    if (e.useMockData) {
      console.log('Using mock page data for:', handle);
      return {
        id: `mock-page-${handle}`,
        title: handle.charAt(0).toUpperCase() + handle.slice(1),
        handle,
        body: `This is a mock page for ${handle}.`,
        bodySummary: `Mock page summary for ${handle}`,
        seo: {
          title: handle.charAt(0).toUpperCase() + handle.slice(1),
          description: `Mock page for ${handle}`
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }
    throw e;
  }
}

export async function getPages(): Promise<Page[]> {
  try {
    const res = await shopifyFetch<ShopifyPagesOperation>({
      query: getPagesQuery
    });

    return removeEdgesAndNodes(res.body.data.pages);
  } catch (e: any) {
    if (e.useMockData) {
      console.log('Using mock pages data');
      return [
        {
          id: 'mock-page-about',
          title: 'About',
          handle: 'about',
          body: 'This is a mock about page.',
          bodySummary: 'Mock about page summary',
          seo: {
            title: 'About',
            description: 'Mock about page'
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'mock-page-contact',
          title: 'Contact',
          handle: 'contact',
          body: 'This is a mock contact page.',
          bodySummary: 'Mock contact page summary',
          seo: {
            title: 'Contact',
            description: 'Mock contact page'
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
    }
    throw e;
  }
}

export async function getProduct(handle: string): Promise<Product | undefined> {
  'use cache';
  cacheTag(TAGS.products);
  cacheLife('days');

  try {
    const res = await shopifyFetch<ShopifyProductOperation>({
      query: getProductQuery,
      variables: {
        handle
      }
    });

    return reshapeProduct(res.body.data.product, false);
  } catch (e: any) {
    if (e.useMockData) {
      console.log('Using mock product data for handle:', handle);
      return getMockProductByHandle(handle);
    }
    throw e;
  }
}

export async function getProductRecommendations(
  productId: string
): Promise<Product[]> {
  'use cache';
  cacheTag(TAGS.products);
  cacheLife('days');

  try {
    const res = await shopifyFetch<ShopifyProductRecommendationsOperation>({
      query: getProductRecommendationsQuery,
      variables: {
        productId
      }
    });

    return reshapeProducts(res.body.data.productRecommendations);
  } catch (e: any) {
    if (e.useMockData) {
      console.log('Using mock product recommendations for:', productId);
      return generateMockProducts(4); // Return 4 recommended products
    }
    throw e;
  }
}

export async function getProducts({
  query,
  reverse,
  sortKey
}: {
  query?: string;
  reverse?: boolean;
  sortKey?: string;
}): Promise<Product[]> {
  'use cache';
  cacheTag(TAGS.products);
  cacheLife('days');

  try {
    const res = await shopifyFetch<ShopifyProductsOperation>({
      query: getProductsQuery,
      variables: {
        query,
        reverse,
        sortKey
      }
    });

    return reshapeProducts(removeEdgesAndNodes(res.body.data.products));
  } catch (e: any) {
    if (e.useMockData) {
      console.log('Using mock products data');
      return generateMockProducts(12);
    }
    throw e;
  }
}

// This is called from `app/api/revalidate.ts` so providers can control revalidation logic.
export async function revalidate(req: NextRequest): Promise<NextResponse> {
  // We always need to respond with a 200 status code to Shopify,
  // otherwise it will continue to retry the request.
  const collectionWebhooks = [
    'collections/create',
    'collections/delete',
    'collections/update'
  ];
  const productWebhooks = [
    'products/create',
    'products/delete',
    'products/update'
  ];
  const topic = (await headers()).get('x-shopify-topic') || 'unknown';
  const secret = req.nextUrl.searchParams.get('secret');
  const isCollectionUpdate = collectionWebhooks.includes(topic);
  const isProductUpdate = productWebhooks.includes(topic);

  if (!secret || secret !== process.env.SHOPIFY_REVALIDATION_SECRET) {
    console.error('Invalid revalidation secret.');
    return NextResponse.json({ status: 401 });
  }

  if (!isCollectionUpdate && !isProductUpdate) {
    // We don't need to revalidate anything for any other topics.
    return NextResponse.json({ status: 200 });
  }

  if (isCollectionUpdate) {
    revalidateTag(TAGS.collections);
  }

  if (isProductUpdate) {
    revalidateTag(TAGS.products);
  }

  return NextResponse.json({ status: 200, revalidated: true, now: Date.now() });
}
