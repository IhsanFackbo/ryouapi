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

    // Config umum untuk requests (untuk non-YouTube)
    const requestConfig = {
        timeout: 5000, // 5s timeout
        headers: {
            'User -Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    };

    try {
        // Cek jika URL adalah YouTube (atau YouTube-like: youtube.com, youtu.be, m.youtube.com)
        const isYouTube = url.includes('youtube.com') || url.includes('youtu.be') || url.includes('youtube-nocookie.com');
        if (isYouTube) {
            // Gunakan youtube-dl-exec untuk extract info (cepat dan stabil)
            let info;
            try {
                info = await youtubedl(url, {
                    dumpSingleJson: true, // Output JSON saja, no download
                    noWarnings: true,    // Hilangkan warnings
                    extractFlat: false,  // Full extract untuk URLs
                    noPlaylists: true,   // Hindari playlist jika single video
                    timeout: 5000        // 5s timeout
                });
            } catch (ytError) {
                // Fallback jika yt-dlp gagal (misal cold start atau network)
                console.warn('yt-dlp failed, falling back to basic fetch:', ytError.message);
                throw new Error(`YouTube extraction failed: ${ytError.message}. Try again.`);
            }

            const title = info.title || 'No title';
            const author = info.uploader || 'Unknown';
            const duration = info.duration || 0;

            // Extract audio/video URLs (yt-dlp kasih direct URLs)
            const audioUrl = info.url || null; // Biasanya audio/video combined, atau filter jika ada formats
            let videoUrl = null;
            if (info.formats && info.formats.length > 0) {
                // Cari format video-only jika ada
                const videoFormat = info.formats.find(f => f.vcodec !== 'none' && f.acodec === 'none');
                videoUrl = videoFormat ? videoFormat.url : info.url;
            } else {
                videoUrl = audioUrl; // Fallback ke main URL
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
                note: 'URLs expire in ~6-24 hours. Download responsibly. Use tools like yt-dlp for full download.'
            });

        } else {
            // Fallback: Non-YouTube – Fetch HTML dan convert ke JSON
            let response;
            try {
                response = await axios.get(url, requestConfig);
            } catch (fetchError) {
                if (fetchError.code === 'ECONNABORTED' || fetchError.code === 'ETIMEDOUT') {
                    throw new Error('Request timeout – site slow or blocked.');
                }
                if (fetchError.response?.status >= 400) {
                    throw new Error(`HTTP ${fetchError.response.status}: ${fetchError.response.statusText}`);
                }
                throw fetchError;
            }

            const { data: html, headers } = response;
            const contentType = headers['content-type'] || '';

            if (contentType.includes('application/json')) {
                // Jika response sudah JSON, return langsung (parse jika string)
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
            
            // Extract links yang relevan (audio/video/download)
            $('a, source, link').each((i, el) => {
                const href = $(el).attr('href') || $(el).attr('src');
                const text = $(el).text().trim().toLowerCase();
                if (href && (href.includes('.mp3') || href.includes('.mp4') || href.includes('.m4a') || href.includes('audio') || href.includes('video') || text.includes('download'))) {
                    // Resolve relative URLs
                    const fullHref = href.startsWith('http') ? href : new URL(href, url).href;
                    if (!links.includes(fullHref)) {
                        links.push(fullHref);
                    }
                }
                if (links.length >= 10) return false; // Limit untuk performa
            });

            // Extract meta description jika ada
            const description = $('meta[name="description"]').attr('content') || '';

            return res.status(200).json({
                error: false,
                type: 'html',
                title,
                description: description.substring(0, 200) + (description.length > 200 ? '...' : ''),
                extractedLinks: links.length > 0 ? links : ['No audio/video links found'],
                totalLinks: links.length,
                note: 'HTML parsed. For direct downloads, check links manually. Use specialized tools for protected content.'
            });
        }

    } catch (error) {
        console.error('Downloader error:', error);

        // Error spesifik
        let status = 500;
        let message = error.message || 'Failed to process URL';

        if (error.message.includes('timeout') || error.message.includes('ECONNABORTED')) {
            status = 408;
            message = 'Request timeout – URL processing too slow or site unresponsive.';
        } else if (error.message.includes('ENOTFOUND') || error.message.includes('invalid url')) {
            status = 400;
            message = 'Invalid or unreachable URL.';
        } else if (error.message.includes('403') || error.message.includes('forbidden')) {
            status = 403;
            message = 'Access forbidden – video/post private or region-blocked.';
        } else if (error.message.includes('429')) {
            status = 429;
            message = 'Rate limited – too many requests. Try again later.';
        } else if (error.message.includes('private') || error.message.includes('unavailable') || error.message.includes('deleted')) {
            status = 404;
            message = 'Content not available (private/deleted).';
        } else if (error.message.includes('extraction failed') || error.message.includes('yt-dlp')) {
            status = 422;
            message = 'Extraction failed – try a different URL or check if content is supported.';
        }

        return res.status(status).json({
            error: true,
            message,
            code: status,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            suggestion: 'Check URL validity, ensure public access, or try a different one.'
        });
    }
}
