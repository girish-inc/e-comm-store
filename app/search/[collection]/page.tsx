import { getCollection, getCollectionProducts } from 'lib/shopify';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

import Grid from 'components/grid';
import ProductGridItems from 'components/layout/product-grid-items';
import { defaultSort, sorting } from 'lib/constants';

export async function generateMetadata(props: {
  params: Promise<{ collection: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  let collection;
  
  try {
    collection = await getCollection(params.collection);
  } catch (e: any) {
    if (e.useMockData) {
      console.log('Using mock data for collection metadata:', params.collection);
      collection = null;
    } else {
      throw e;
    }
  }

  if (!collection) {
    // Return default metadata for mock data scenarios
    return {
      title: `${params.collection} Collection`,
      description: `Browse ${params.collection} products`
    };
  }

  return {
    title: collection.seo?.title || collection.title,
    description:
      collection.seo?.description || collection.description || `${collection.title} products`
  };
}

export default async function CategoryPage(props: {
  params: Promise<{ collection: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const { sort } = searchParams as { [key: string]: string };
  const { sortKey, reverse } = sorting.find((item) => item.slug === sort) || defaultSort;
  let products;
  
  try {
    products = await getCollectionProducts({ collection: params.collection, sortKey, reverse });
  } catch (e: any) {
    if (e.useMockData) {
      console.log('Using mock data for collection products:', params.collection);
      products = [];
    } else {
      throw e;
    }
  }

  return (
    <section>
      {products.length === 0 ? (
        <p className="py-3 text-lg">{`No products found in this collection`}</p>
      ) : (
        <Grid className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <ProductGridItems products={products} />
        </Grid>
      )}
    </section>
  );
}
