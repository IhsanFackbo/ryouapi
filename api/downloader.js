import youtubedl from 'youtube-dl-exec';
import { load } from 'cheerio';
import axios from 'axios';

export default async function handler(req, res) {
    // Validasi method
    if (req.method !== 'GET') {
        return res.status(405).json({ 
            error: true, 
            message: 'Method not allowed. Use GET only.', 
            code: 405 
        });
    }

    // Validasi params
    const { url } = req.query;
    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
        return res.status(400).json({ 
            error: true, 
            message: 'Valid URL parameter required (must start with http).', 
            code: 400 
        });
    }

    // Config axios dengan headers anti-block (lebih advanced)
    const requestConfig = {
        timeout: 8000, // Naikkan ke 8s untuk situs lambat seperti ytmp3
        headers: {
            'User -Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'Referer': url.includes('youtube') ? 'https://www.youtube.com/' : 'https://www.google.com/', // Referer untuk bypass
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Cache-Control': 'max-age=0'
        },
        maxRedirects: 5 // Handle redirects
    };

    try {
        // Cek jika URL adalah YouTube
        const isYouTube = url.includes('youtube.com') || url.includes('youtu.be') || url.includes('youtube-nocookie.com');
        if (isYouTube) {
            // ... (kode youtube-dl-exec sama seperti sebelumnya – tidak berubah)
            let info;
            try {
                info = await youtubedl(url, {
                    dumpSingleJson: true,
                    noWarnings: true,
                    extractFlat: false,
                    noPlaylists: true,
                    timeout: 8000
                });
            } catch (ytError) {
                console.warn('yt-dlp failed:', ytError.message);
                return res.status(422).json({
                    error: true,
                    message: `YouTube extraction failed: ${ytError.message}. Video mungkin private atau URL invalid.`,
                    code: 422,
                    suggestion: 'Coba URL YouTube public lain.'
                });
            }

            const title = info.title || 'No title';
            const author = info.uploader || 'Unknown';
            const duration = info.duration || 0;
            const audioUrl = info.url || null;
            let videoUrl = null;
            if (info.formats && info.formats.length > 0) {
                const videoFormat = info.formats.find(f => f.vcodec !== 'none' && f.acodec === 'none');
                videoUrl = videoFormat ? videoFormat.url : info.url;
            } else {
                videoUrl = audioUrl;
            }

            return res.status(200).json({
                error: false,
                type: 'youtube',
                title,
                author,
                duration,
                audioUrl,
                videoUrl,
                formatsCount: info.formats ? info.formats.length : 'Basic info only',
                note: 'URLs expire in ~6-24 hours. Download responsibly.'
            });

        } else {
            // Non-YouTube: Cek spesifik ytmp3 atau similar
            const isYtmp3 = url.includes('ytmp3') || url.includes('ytmp4') || url.includes('y2mate');
            if (isYtmp3) {
                return res.status(422).json({
                    error: true,
                    message: 'ytmp3/y2mate sites blocked by anti-bot protection. Cannot scrape directly.',
                    code: 422,
                    suggestion: 'Gunakan URL YouTube asli untuk extract info. ytmp3 untuk download manual saja.',
                    disclaimer: 'Use official tools; third-party converters may violate ToS.'
                });
            }

            // Fetch dengan retry (1x untuk timeout)
            let response;
            let retryCount = 0;
            const maxRetries = 1;
            while (retryCount <= maxRetries) {
                try {
                    response = await axios.get(url, requestConfig);
                    break; // Sukses, keluar loop
                } catch (fetchError) {
                    retryCount++;
                    if (retryCount > maxRetries || fetchError.code !== 'ECONNABORTED') {
                        throw fetchError; // Gagal final
                    }
                    console.warn(`Retry ${retryCount} for ${url}`);
                    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s
                }
            }

            const { data: html, headers } = response;
            const contentType = headers['content-type'] || '';

            if (contentType.includes('application/json')) {
                let jsonData;
                try {
                    jsonData = typeof html === 'string' ? JSON.parse(html) : html;
                } catch {
                    jsonData = { raw: html };
                }
                return res.status(200).json({
                    error: false,
                    type: 'json',
                    rawData: jsonData,
                    note: 'Direct JSON response from URL.'
                });
            }

            // Parse HTML dengan Cheerio
            const $ = load(html);
            const title = $('title').text().trim() || $('h1').first().text().trim() || 'No title found';
            const links = [];
            
            $('a, source, link').each((i, el) => {
                const href = $(el).attr('href') || $(el).attr('src');
                const text = $(el).text().trim().toLowerCase();
                if (href && (href.includes('.mp3') || href.includes('.mp4') || href.includes('.m4a') || href.includes('audio') || href.includes('video') || text.includes('download'))) {
                    const fullHref = href.startsWith('http') ? href : new URL(href, url).href;
                    if (!links.includes(fullHref)) {
                        links.push(fullHref);
                    }
                }
                if (links.length >= 10) return false;
            });

            const description = $('meta[name="description"]').attr('content') || '';

            return res.status(200).json({
                error: false,
                type: 'html',
                title,
                description: description.substring(0, 200) + (description.length > 200 ? '...' : ''),
                extractedLinks: links.length > 0 ? links : ['No audio/video links found'],
                totalLinks: links.length,
                note: 'HTML parsed. For direct downloads, check links manually.'
            });
        }

    } catch (error) {
        console.error('Downloader error:', error);

        let status = 500;
        let message = error.message || 'Failed to process URL';

        // Error spesifik (enhanced)
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
            status = 408;
            message = 'Request timeout – site slow or unresponsive (common for protected sites like ytmp3).';
        } else if (error.code === 'ENOTFOUND' || error.message.includes('invalid url')) {
            status = 400;
            message = 'Invalid or unreachable URL.';
        } else if (error.response?.status === 403 || error.message.includes('403') || error.message.includes('forbidden')) {
            status = 403;
            message = 'Access forbidden – site blocks automated requests (e.g., Cloudflare protection on ytmp3).';
        } else if (error.response?.status === 429 || error.message.includes('429')) {
            status = 429;
            message = 'Rate limited – too many requests. Wait and retry.';
        } else if (error.message.includes('private') || error.message.includes('unavailable') || error.message.includes('deleted')) {
            status = 404;
            message = 'Content not available (private/deleted).';
        } else if (error.message.includes('extraction failed') || error.message.includes('yt-dlp')) {
            status = 422;
            message = 'Extraction failed – content not supported or blocked.';
        } else if (error.response?.status >= 500) {
            status = 502;
            message = 'Site server error – try again later.';
        }

        return res.status(status).json({
            error: true,
            message,
            code: status,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            suggestion: 'Gunakan URL YouTube public untuk hasil terbaik. Hindari converter sites seperti ytmp3 untuk scraping.'
        });
    }
}
