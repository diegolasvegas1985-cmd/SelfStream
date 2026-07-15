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

        const { body, statusCode } = await request(url, {
            headers: {
                ...VIXSRC_HEADERS,
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
                "Referer": "https://vixsrc.to/",
                "Accept":
                    "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
            }
        });


        console.log("[VixSrc] Status:", statusCode);


        if (statusCode !== 200) {
            return [];
        }


        const html = await body.text();

        const $ = cheerio.load(html);


        let found = "";


        $("script").each((_, el) => {

            const text = $(el).html() || "";

            if (
                text.includes(".m3u8") ||
                text.includes("masterPlaylist")
            ) {
                found = text;
            }

        });


        if (!found) {
            console.log("[VixSrc] No stream found");
            return [];
        }


        const m3u8 =
            found.match(/https?:\/\/[^"' ]+\.m3u8[^"' ]*/);


        if (!m3u8) {
            console.log("[VixSrc] No m3u8");
            return [];
        }


        const streamUrl = m3u8[0].replace(/\\/g, "");

        console.log("[VixSrc] Stream:", streamUrl);


        const token = makeProxyToken(
            streamUrl,
            VIXSRC_HEADERS
        );


        return [
            {
                name: "VixSrc 🇮🇹",
                title: "VixSrc 1080",
                url:
                `/proxy/hls/manifest.m3u8?token=${token}`
            }
        ];


    } catch(e) {

        console.error("[VixSrc] Error:", e);
        return [];
    }
}
