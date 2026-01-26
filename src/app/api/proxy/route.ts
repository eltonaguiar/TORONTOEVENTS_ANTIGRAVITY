
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import UserAgent from 'fake-useragent';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get('url');

    if (!url) {
        return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    try {
        const userAgent = new (UserAgent as any)();
        const response = await axios.get(url, {
            headers: {
                'User-Agent': userAgent.random,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
            }
        });

        let html = response.data;

        // Inject base tag to handle relative paths
        const baseUrl = new URL(url).origin;
        // Check if there is a head tag
        if (html.includes('<head>')) {
            html = html.replace('<head>', `<head><base href="${url}" />`);
        } else {
            // If no head, just prepend it? Or wrap. 
            // Most pages have head. If not, relative links are already doomed or it's a snippet.
            html = `<base href="${url}" />` + html;
        }

        // Return the HTML
        return new NextResponse(html, {
            headers: {
                'Content-Type': 'text/html',
            }
        });

    } catch (error) {
        console.error('Proxy error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch content', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
