import { config } from './config';

export async function getVixSrcStreams(
    id: string,
    season?: string,
    episode?: string,
    preferredLang?: string
): Promise<{name:string,title:string,url:string}[]> {

    const lang = preferredLang || "it";

    let url = "";

    if (season && episode) {
        url = `https://${config.vixsrcDomain}/tv/${id}/${season}/${episode}?lang=${lang}`;
    } else {
        url = `https://${config.vixsrcDomain}/movie/${id}?lang=${lang}`;
    }

    console.log("[VixSrc] Direct player:", url);

    return [
        {
            name: "VixSrc 🇮🇹",
            title: "VixSrc Player",
            url
        }
    ];
}
