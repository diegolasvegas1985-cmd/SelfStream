import * as cheerio from 'cheerio';
import { chromium } from 'playwright';
import { config } from './config';
import { makeProxyToken, VIXSRC_HEADERS } from './proxy';


async function getEmbedPageHtml(
    id: string,
    season?: string,
    episode?: string
): Promise<{url:string, html:string} | null> {

    const siteOrigin = `https://${config.vixsrcDomain}`;

    let embedUrl = '';

    if (season && episode) {
        embedUrl = `${siteOrigin}/tv/${id}/${season}/${episode}`;
    } else {
        embedUrl = `${siteOrigin}/movie/${id}`;
    }

    console.log(`[VixSrc] Browser opening: ${embedUrl}`);


    const browser = await chromium.launch({
        headless: true,
        executablePath: process.env.CHROME_PATH || undefined,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ]
    });


    try {

        const page = await browser.newPage({
            userAgent: VIXSRC_HEADERS['User-Agent']
        });


        await page.goto(embedUrl, {
            waitUntil: 'networkidle',
            timeout: 60000
        });


        await page.waitForTimeout(3000);


        const html = await page.content();


        console.log(
            `[VixSrc] Browser loaded ${html.length} bytes`
        );


        return {
            url: embedUrl,
            html
        };


    } catch(err){

        console.error(
            "[VixSrc] Browser error:",
            err
        );

        return null;

    } finally {

        await browser.close();

    }
}



export async function getVixSrcStreams(
    id:string,
    season?:string,
    episode?:string,
    preferredLang?:string
): Promise<{name:string,title:string,url:string}[]> {


    try {
