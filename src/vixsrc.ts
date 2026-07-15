import * as cheerio from 'cheerio';
import { request } from 'undici';
import { config } from './config';
import { makeProxyToken, VIXSRC_HEADERS } from './proxy';


async function getEmbedUrl(
    id: string,
    season?: string,
    episode?: string
): Promise<string> {

    const base = `https://${config.vixsrcDomain}`;

    if (season && episode) {
        return `${base}/tv/${id}/${season}/${episode}`;
    }

    return `${base}/movie/${id}`;
}


export async function getVixSrcStreams(
    id: string,
    season?: string,
    episode?: string,
    preferredLang?: string
): Promise<{name:string,title:string,url:string}[]> {

    try {

        const embedUrl = await getEmbedUrl(
            id,
            season,
            episode
        );

        console.log("[VixSrc] Embed:", embedUrl);


        const { body, statusCode } = await request(
            embedUrl,
            {
                headers:{
                    ...VIXSRC_HEADERS,
                    "Accept":"text/html"
                }
            }
        );


        if(statusCode !== 200){
            console.log(
                `[VixSrc] HTTP ${statusCode}`
            );
            return [];
        }


        const html = await body.text();

        const $ = cheerio.load(html);


        const script = $("script")
            .map((_,el)=>$(el).html())
            .get()
            .find(x =>
                x.includes("masterPlaylist")
            );


        if(!script){
            console.log(
                "[VixSrc] player script not found"
            );
            return [];
        }


        const urlMatch =
            script.match(/url\s*:\s*['"]([^'"]+)/);

        const tokenMatch =
            script.match(/token['"]?\s*:\s*['"]([^'"]+)/);

        const expMatch =
            script.match(/expires['"]?\s*:\s*['"](\d+)/);


        if(!urlMatch || !tokenMatch || !expMatch){
            console.log(
                "[VixSrc] Missing stream data"
            );
            return [];
        }


        const stream = new URL(
            urlMatch[1]
        );


        stream.searchParams.set(
            "token",
            tokenMatch[1]
        );

        stream.searchParams.set(
            "expires",
            expMatch[1]
        );

        stream.searchParams.set(
            "lang",
            preferredLang || "it"
        );


        const finalUrl = stream.toString();


        console.log(
            "[VixSrc] Stream:",
            finalUrl
        );


        const token =
            makeProxyToken(
                finalUrl,
                VIXSRC_HEADERS
            );


        return [{
            name:"VixSrc 🇮🇹",
            title:"VixSrc 1080",
            url:`/proxy/hls/manifest.m3u8?token=${token}`
        }];


    } catch(e){

        console.error(
            "[VixSrc] Error",
            e
        );

        return [];
    }
}
