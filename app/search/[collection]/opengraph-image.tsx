import OpengraphImage from 'components/opengraph-image';
import { getCollection } from 'lib/shopify';

export default async function Image({
  params
}: {
  params: { collection: string };
}) {
  let collection;
  
  try {
    collection = await getCollection(params.collection);
  } catch (e: any) {
    if (e.useMockData) {
      console.log('Using mock data for collection opengraph:', params.collection);
      collection = { seo: null, title: 'Collection' };
    } else {
      throw e;
    }
  }
  
  const title = collection?.seo?.title || collection?.title;

  return await OpengraphImage({ title });
}
