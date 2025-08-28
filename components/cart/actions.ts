'use server';

import { TAGS } from 'lib/constants';
import {
  addToCart,
  createCart,
  getCart,
  removeFromCart,
  updateCart
} from 'lib/shopify';
import { revalidateTag } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function addItem(
  prevState: any,
  selectedVariantId: string | undefined
) {
  if (!selectedVariantId) {
    return 'Error adding item to cart';
  }

  try {
    let cart = await getCart();
    
    // Create cart if it doesn't exist
    if (!cart) {
      cart = await createCart();
    }
    
    await addToCart([{ merchandiseId: selectedVariantId, quantity: 1 }]);
    revalidateTag(TAGS.cart);
    return 'Item added to cart successfully';
  } catch (e: any) {
    if (e.useMockData) {
      console.log('Using mock cart data for addToCart');
      revalidateTag(TAGS.cart);
      return 'Item added to cart successfully (mock mode)';
    } else {
      console.error('Add to cart error:', e);
      return 'Error adding item to cart';
    }
  }
}

export async function removeItem(prevState: any, merchandiseId: string) {
  try {
    const cart = await getCart();

    if (!cart) {
      return 'Error fetching cart';
    }

    const lineItem = cart.lines.find(
      (line) => line.merchandise.id === merchandiseId
    );

    if (lineItem && lineItem.id) {
      await removeFromCart([lineItem.id]);
      revalidateTag(TAGS.cart);
    } else {
      return 'Item not found in cart';
    }
  } catch (e: any) {
    if (e.useMockData) {
      console.log('Using mock data for removing item from cart');
      revalidateTag(TAGS.cart);
    } else {
      console.error('Remove from cart error:', e);
    }
    return 'Error removing item from cart';
  }
}

export async function updateItemQuantity(
  prevState: any,
  payload: {
    merchandiseId: string;
    quantity: number;
  }
) {
  const { merchandiseId, quantity } = payload;

  try {
    const cart = await getCart();

    if (!cart) {
      return 'Error fetching cart';
    }

    const lineItem = cart.lines.find(
      (line) => line.merchandise.id === merchandiseId
    );

    if (lineItem && lineItem.id) {
      if (quantity === 0) {
        await removeFromCart([lineItem.id]);
      } else {
        await updateCart([
          {
            id: lineItem.id,
            merchandiseId,
            quantity
          }
        ]);
      }
    } else if (quantity > 0) {
      // If the item doesn't exist in the cart and quantity > 0, add it
      await addToCart([{ merchandiseId, quantity }]);
    }

    revalidateTag(TAGS.cart);
  } catch (e: any) {
    if (e.useMockData) {
      console.log('Using mock data for cart update');
    } else {
      console.error('Cart update error:', e);
    }
    return 'Error updating item quantity';
  }
}

export async function redirectToCheckout() {
  try {
    let cart = await getCart();
    if (cart?.checkoutUrl) {
      redirect(cart.checkoutUrl);
    } else {
      throw new Error('No checkout URL available');
    }
  } catch (e: any) {
    if (e.useMockData) {
      console.log('Using mock data for checkout redirect');
      // Redirect to a mock checkout page or handle gracefully
      redirect('/cart');
    } else {
      console.error('Checkout redirect error:', e);
      throw e;
    }
  }
}

export async function createCartAndSetCookie() {
  try {
    let cart = await createCart();
    (await cookies()).set('cartId', cart.id!);
  } catch (e: any) {
    if (e.useMockData) {
      console.log('Using mock data for cart creation');
      // Set a mock cart ID
      (await cookies()).set('cartId', 'mock-cart-id');
    } else {
      console.error('Cart creation error:', e);
      throw e;
    }
  }
}
