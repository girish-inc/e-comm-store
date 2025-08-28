import OpengraphImage from 'components/opengraph-image';
import { getPage } from 'lib/shopify';

export default async function Image({ params }: { params: { page: string } }) {
  let page;
  
  try {
    page = await getPage(params.page);
  } catch (e: any) {
    if (e.useMockData) {
      console.log('Using mock data for page opengraph:', params.page);
      page = { seo: null, title: 'Page' };
    } else {
      throw e;
    }
  }
  
  const title = page.seo?.title || page.title;

  return await OpengraphImage({ title });
}
