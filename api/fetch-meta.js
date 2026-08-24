export const config = { runtime: 'edge' };

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  let url = searchParams.get('url');

  if (!url) {
    return new Response(JSON.stringify({ error: 'No URL provided' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

  const apiKey = process.env.SCRAPER_API_KEY;

  try {
    const scraperUrl = 'http://api.scraperapi.com?api_key=' + apiKey + '&url=' + encodeURIComponent(url) + '&render=false';

    const res = await fetch(scraperUrl, {
      headers: { 'Accept': 'text/html' },
      signal: AbortSignal.timeout(15000)
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ error: 'Failed to fetch: ' + res.status }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const html = await res.text();

    const get = (pattern) => {
      const m = html.match(pattern);
      return m ? m[1].replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#039;/g,"'").trim() : '';
    };

    const title   = get(/<title[^>]*>([^<]*)<\/title>/i);
    const desc    = get(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)
                 || get(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i);
    const ogTitle = get(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i)
                 || get(/<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:title["']/i);
    const ogDesc  = get(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i)
                 || get(/<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:description["']/i);
    const ogUrl   = get(/<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']*)["']/i)
                 || get(/<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:url["']/i);
    const ogImage = get(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']*)["']/i)
                 || get(/<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:image["']/i);
    const twTitle = get(/<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']*)["']/i)
                 || get(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']twitter:title["']/i);
    const twDesc  = get(/<meta[^>]+name=["']twitter:description["'][^>]+content=["']([^"']*)["']/i)
                 || get(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']twitter:description["']/i);
    const twImage = get(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']*)["']/i)
                 || get(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']twitter:image["']/i)
                 || get(/<meta[^>]+name=["']twitter:image:src["'][^>]+content=["']([^"']*)["']/i);

    return new Response(JSON.stringify({
      title, desc, ogTitle, ogDesc, ogUrl, ogImage,
      twTitle, twDesc, twImage, fetchedUrl: url
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Fetch failed' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
