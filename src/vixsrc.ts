import { request } from 'undici';
import { config } from './config';

export async function getVixSrcStreams(
    id: string,
    season?: string,
    episode?: string,
    preferredLang?: string
): Promise<any[]> {

    try {

        const lang = preferredLang || "it";

        let apiUrl = "";

        if (season && episode) {
            apiUrl =
            `https://${config.vixsrcDomain}/api/tv/${id}/${season}/${episode}`;
        } else {
            apiUrl =
            `https://${config.vixsrcDomain}/api/movie/${id}`;
        }


        console.log("[VixSrc API TEST]:", apiUrl);


        const { body, statusCode } = await request(apiUrl, {

            headers: {

                "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",

                "Accept":
                "application/json,text/plain,*/*",

                "Referer":
                "https://vixsrc.to/",

                "Origin":
                "https://vixsrc.to"

            }

        });


        const text = await body.text();


        console.log("[VixSrc STATUS]:", statusCode);

        console.log(
            "[VixSrc RESPONSE]:",
            text.substring(0,500)
        );


        if (statusCode !== 200) {
            return [];
        }


        // per ora restituisce il risultato grezzo di controllo

        return [
            {
                name: "VixSrc API TEST",
                title: "API OK",
                url: `https://${config.vixsrcDomain}/movie/${id}?lang=${lang}`
            }
        ];


    } catch(err) {

        console.error(
            "[VixSrc ERROR]",
            err
        );

        return [];

    }
}
