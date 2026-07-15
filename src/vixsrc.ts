import * as cheerio from 'cheerio';
import { request } from 'undici';
import { config } from './config';
import { makeProxyToken, VIXSRC_HEADERS } from './proxy';


export async function getVixSrcStreams(
    id: string,
    season?: string,
    episode?: string,
    preferredLang?: string
): Promise<any[]> {

    const lang = preferredLang || "it";

    let url = "";

    if (season && episode) {
        url = `https://${config.vixsrcDomain}/tv/${id}/${season}/${episode}?lang=${lang}`;
    } else {
        url = `https://${config.vixsrcDomain}/movie/${id}?lang=${lang}`;
    }

    console.log("[VixSrc] Fetch:", url);


    try {

        const response = await request(url, {
            headers: {
                ...VIXSRC_HEADERS,

                "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",

                "Accept":
                "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",

                "Accept-Language":
                "it-IT,it;q=0.9,en;q=0.8",

                "Referer":
                "https://vixsrc.to/",

                "Origin":
                "https://vixsrc.to"
            }
        });


        console.log("[VixSrc] Status:", response.statusCode);


        const html = await response.body.text();


        if (response.statusCode !== 200) {

            console.log(
                "[VixSrc] Block response:",
                html.substring(0,500)
            );

            return [];
        }



        const $ = cheerio.load(html);


        let scriptContent = "";


        $("script").each((_, el)=>{

            const text = $(el).html() || "";

            if (
                text.includes("masterPlaylist") ||
                text.includes(".m3u8") ||
                (
                    text.includes("token") &&
                    text.includes("expires")
                )
            ) {
                scriptContent = text;
            }

        });



        if (!scriptContent) {

            console.log(
                "[VixSrc] Player script not found"
            );

            return [];
        }



        const match =
        scriptContent.match(
            /https?:\/\/[^"'\\]+\.m3u8[^"'\\]*/
        );


        if (!match) {

            console.log(
                "[VixSrc] m3u8 not found"
            );

            return [];
        }



        const streamUrl =
        match[0].replace(/\\/g,"");



        console.log(
            "[VixSrc] Stream URL:",
            streamUrl
        );



        const token =
        makeProxyToken(
            streamUrl,
            VIXSRC_HEADERS
        );



        return [
            {
                name: "VixSrc 🇮🇹",
                title: "VixSrc Stream",
                url:
                `/proxy/hls/manifest.m3u8?token=${token}`
            }
        ];



    } catch(error) {

        console.error(
            "[VixSrc] Error:",
            error
        );

        return [];
    }
}
