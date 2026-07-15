import * as cheerio from 'cheerio';
import { request } from 'undici';
import { config } from './config';
import { makeProxyToken, VIXSRC_HEADERS } from './proxy';


/**
 * Build VixSrc embed URL.
 * Uses original Stremio ID (IMDb ttxxxx or TMDB id).
 */
async function getEmbedUrlFromApi(
    id: string,
    season?: string,
    episode?: string
): Promise<string | null> {

    const siteOrigin = `https://${config.vixsrcDomain}`;

    let embedUrl = '';

    if (season && episode) {
        embedUrl = `${siteOrigin}/tv/${id}/${season}/${episode}`;
    } else {
        embedUrl = `${siteOrigin}/movie/${id}`;
    }

    console.log(`[VixSrc] Fetching embed page: ${embedUrl}`);

    return embedUrl;
}


export async function getVixSrcStreams(
    id: string,
    season?: string,
    episode?: string,
    preferredLang?: string
): Promise<{name:string, title:string, url:string}[]> {

    try {

        const siteOrigin = `https://${config.vixsrcDomain}`;


        const embedUrl = await getEmbedUrlFromApi(
            id,
            season,
            episode
        );


        if (!embedUrl) {
            console.log("[VixSrc] No embed URL");
            return [];
        }


        console.log(`[VixSrc] Embed URL: ${embedUrl}`);





        const html = await body.text();

        const $ = cheerio.load(html);


        const scriptTag = $("script").filter((_, el)=>{

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



        if(tokenMatch) token = tokenMatch[1];

        if(expiresMatch) expires = expiresMatch[1];

        if(asnMatch) asn = asnMatch[1];

        if(urlMatch) serverUrl = urlMatch[1].replace(/\\/g,'');


        if(!token || !expires || !serverUrl){
            throw new Error(
                "Missing VixSrc parameters"
            );
        }
                const canPlayFHD =
            /window\.canPlayFHD\s*=\s*true/i.test(scriptContent) ||
            /canPlayFHD/.test(scriptContent);



        const urlObj = new URL(serverUrl);


        urlObj.searchParams.set(
            'token',
            token
        );


        urlObj.searchParams.set(
            'expires',
            expires
        );


        urlObj.searchParams.set(
            'lang',
            preferredLang || 'it'
        );


        if(asn){
            urlObj.searchParams.set(
                'asn',
                asn
            );
        }


        if(canPlayFHD){
            urlObj.searchParams.set(
                'h',
                '1'
            );
        }



        let finalStreamUrl = urlObj.toString();



        // Fix playlist.m3u8

        const parts = urlObj.pathname.split('/');

        const pIdx = parts.indexOf('playlist');


        if(
            pIdx !== -1 &&
            pIdx < parts.length - 1
        ){

            const nextPart = parts[pIdx + 1];


            if(
                nextPart &&
                !nextPart.includes('.')
            ){

                parts[pIdx + 1] =
                    nextPart + '.m3u8';


                urlObj.pathname =
                    parts.join('/');


                finalStreamUrl =
                    urlObj.toString();
            }
        }



        console.log(
            `[VixSrc] Final stream URL: ${finalStreamUrl}`
        );



        const proxyToken =
            makeProxyToken(
                finalStreamUrl,
                VIXSRC_HEADERS
            );



        return [
            {
                name: "VIX 🇮🇹",
                title: "VixSrc 1080",
                url:
                `/proxy/hls/manifest.m3u8?token=${proxyToken}`
            }
        ];



    } catch(err){

        console.error(
            "[VixSrc] Stream extraction error",
            err
        );

        return [];
    }
}
