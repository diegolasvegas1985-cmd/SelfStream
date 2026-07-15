import * as cheerio from 'cheerio';
import { request } from 'undici';
import { config } from './config';
import { makeProxyToken, VIXSRC_HEADERS } from './proxy';

/**
 * Resolve the current embed URL through VixSrc page.
 */
async function getEmbedUrlFromApi(
    tmdbId: string,
    season?: string,
    episode?: string
): Promise<string | null> {

    const siteOrigin = `https://${config.vixsrcDomain}`;
    let embedPath = "";

    if (season && episode) {
        embedPath = `/tv/${tmdbId}/${season}/${episode}`;
    } else {
        embedPath = `/movie/${tmdbId}`;
    }

    const embedUrl = `${siteOrigin}${embedPath}`;

    console.log(`[VixSrc] Fetching embed page: ${embedUrl}`);

    return embedUrl;
}


export async function getVixSrcStreams(
    tmdbId: string,
    season?: string,
    episode?: string,
    preferredLang?: string
): Promise<{name: string, title: string, url: string}[]> {

    try {

        const siteOrigin = `https://${config.vixsrcDomain}`;

        // 1. Resolve embed URL
        const embedUrl = await getEmbedUrlFromApi(
            tmdbId,
            season,
            episode
        );

        if (!embedUrl) {
            console.log("[VixSrc] Failed to resolve embed URL");
            return [];
        }

        console.log("[VixSrc] Embed URL:", embedUrl);


        // 2. Fetch embed page
        const { body, statusCode } = await request(embedUrl, {
            headers: {
                ...VIXSRC_HEADERS,
                'Referer': `${siteOrigin}/`,
                'Accept': 'text/html,application/xhtml+xml'
            }
        });


        if (statusCode !== 200) {
            console.log(`[VixSrc] Embed page failed: ${statusCode}`);
            return [];
        }


        const html = await body.text();
        const $ = cheerio.load(html);


        // Find player script
        const scriptTag = $("script").filter((_, el) => {

            const content = $(el).html() || '';

            return (
                content.includes('window.masterPlaylist') ||
                (
                    content.includes('token') &&
                    content.includes('expires')
                )
            );

        }).first();


        const scriptContent = scriptTag.html() || "";


        if (!scriptContent) {
            throw new Error("VixSrc player script not found");
        }


        let token = "";
        let expires = "";
        let asn = "";
        let serverUrl = "";


        const tokenMatch =
            scriptContent.match(/['"]token['"]\s*:\s*['"]([^'"]+)['"]/);

        const expiresMatch =
            scriptContent.match(/['"]expires['"]\s*:\s*['"](\d+)['"]/);

        const asnMatch =
            scriptContent.match(/['"]asn['"]\s*:\s*['"]([^'"]*)['"]/);

        const urlMatch =
            scriptContent.match(/url\s*:\s*['"]([^'"]+)['"]/);


        if (tokenMatch)
            token = tokenMatch[1];

        if (expiresMatch)
            expires = expiresMatch[1];

        if (asnMatch)
            asn = asnMatch[1];

        if (urlMatch)
            serverUrl = urlMatch[1].replace(/\\/g, '');
                if (!token || !expires || !serverUrl) {
            throw new Error(
                "Failed to extract mandatory parameters from VixSrc script."
            );
        }


        // 3. Build final stream URL

        const canPlayFHD =
            /window\.canPlayFHD\s*=\s*true/i.test(scriptContent) ||
            /canPlayFHD/.test(scriptContent);


        const urlObj = new URL(serverUrl);

        const lang = preferredLang || 'en';

        urlObj.searchParams.set('token', token);
        urlObj.searchParams.set('expires', expires);
        urlObj.searchParams.set('lang', lang);


        if (asn) {
            urlObj.searchParams.set('asn', asn);
        }


        if (canPlayFHD) {
            urlObj.searchParams.set('h', '1');
        }


        let finalStreamUrl = urlObj.toString();



        // 4. Fix playlist extension if needed

        const parts = urlObj.pathname.split('/');

        const pIdx = parts.indexOf('playlist');


        if (pIdx !== -1 && pIdx < parts.length - 1) {

            const nextPart = parts[pIdx + 1];

            if (nextPart && !nextPart.includes('.')) {

                parts[pIdx + 1] = nextPart + '.m3u8';

                urlObj.pathname = parts.join('/');

                finalStreamUrl = urlObj.toString();
            }
        }



        console.log(
            `[VixSrc] Final stream URL: ${finalStreamUrl}`
        );



        // 5. HLS proxy

        const proxyToken = makeProxyToken(
            finalStreamUrl,
            VIXSRC_HEADERS
        );



        return [
            {
                name: "SC 🤌",
                title: "VIX 1080 🤌",
                url:
                    `/proxy/hls/manifest.m3u8?token=${proxyToken}`
            }
        ];



    } catch (err) {

        console.error(
            "VixSrc Stream extraction error",
            err
        );

        return [];
    }
}
