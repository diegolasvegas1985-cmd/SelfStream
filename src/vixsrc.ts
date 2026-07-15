import { request } from "undici";
import { config } from "./config";
import { makeProxyToken, VIXSRC_HEADERS } from "./proxy";


export async function getVixSrcStreams(
    id: string,
    season?: string,
    episode?: string,
    preferredLang?: string
): Promise<any[]> {

    try {

        const lang = preferredLang || "it";

        let pageUrl = "";

        if (season && episode) {
            pageUrl =
            `https://${config.vixsrcDomain}/tv/${id}/${season}/${episode}?lang=${lang}`;
        } else {
            pageUrl =
            `https://${config.vixsrcDomain}/movie/${id}?lang=${lang}`;
        }


        console.log("[VixSrc PAGE]", pageUrl);


        const { body, statusCode } = await request(pageUrl, {
            headers: {
                ...VIXSRC_HEADERS,
                "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120 Safari/537.36",
                "Accept":
                "text/html,application/xhtml+xml"
            }
        });


        const html = await body.text();


        console.log("[VixSrc STATUS]", statusCode);


        if (statusCode !== 200) {
            console.log(html.substring(0,300));
            return [];
        }


        // Cerca il JSON src dell'embed
        const match = html.match(
            /"src"\s*:\s*"([^"]+)"/
        );


        if (!match) {
            console.log("[VixSrc] src embed non trovato");
            console.log(html.substring(0,500));
            return [];
        }


        let embed = match[1]
            .replace(/\\\//g,"/");


        if (embed.startsWith("/")) {
            embed =
            `https://${config.vixsrcDomain}${embed}`;
        }


        console.log("[VixSrc EMBED]", embed);



        const token = makeProxyToken(
            embed,
            VIXSRC_HEADERS
        );


        return [
            {
                name:"VixSrc 🇮🇹",
                title:"VixSrc Player",
                url:
                `/proxy/hls/manifest.m3u8?token=${token}`
            }
        ];


    } catch(e) {

        console.error(
            "[VixSrc ERROR]",
            e
        );

        return [];
    }
}
