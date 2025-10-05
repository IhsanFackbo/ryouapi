import { load } from 'cheerio';
import axios from 'axios';
let youtubedl; // Lazy import fallback

// Extract Video ID
function extractVideoId(url) {
    const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube-nocookie\.com\/embed\/)([^&\n?#]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

// YouTube API (Official – No Error)
async function getYouTubeInfo(videoId, apiKey) {
    if (!apiKey) throw new Error('YOUTUBE_API_KEY required. Set in env vars.');

    const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoId}&key=${apiKey}`;
    
    try {
        const response = await axios.get(apiUrl, { 
            timeout: 10000,
            headers: { 'User -Agent': 'Google-HTTP-Java-Client' }
        });
        
        const data = response.data;
        const items = data.items || [];
        
        if (items.length === 0) {
            throw new Error('Video not found, private, or deleted.');
        }
        
        const item = items[0];
        const snippet = item.snippet || {};
        const contentDetails = item.contentDetails || {};
        const statistics = item.statistics || {};
        
        // Parse duration ISO to seconds (robust)
        let durationSeconds = 0;
        const durationMatch = contentDetails.duration ? contentDetails.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/) : null;
        if (durationMatch) {
            durationSeconds = (parseInt(durationMatch[1]) || 0) * 3600 + 
                              (parseInt(durationMatch[2]) || 0) * 60 + 
                              (parseInt(durationMatch[3]) || 0);
        }
        
        return {
            title: snippet.title || 'No title available',
            author: snippet.channelTitle || 'Unknown channel',
            description: snippet.description ? (snippet.description.length > 200 ? snippet.description.substring(0, 200) + '...' : snippet.description) : 'No description',
            thumbnail: snippet.thumbnails?.medium?.url || '',
            duration: contentDetails.duration || 'Unknown',
            durationSeconds,
            publishedAt: snippet.publishedAt || '',
            viewCount: parseInt(statistics.viewCount) || 0,
            likeCount: parseInt(statistics.likeCount) || 0
        };
    } catch (error) {
        console.error('YouTube API Detailed Error:', error.response?.data || error.message);
        
        if (error.response?.status === 403) {
            throw new Error('API forbidden: Invalid key or quota exceeded. Check Google Console.');
        } else if (error.response?.status === 404) {
            throw new Error('Video unavailable or ID invalid.');
        } else if (error.response?.status === 429) {
            throw new Error('API quota exceeded – wait 24h or upgrade.');
        } else if (error.code === 'ECONNABORTED') {
            throw new Error('API timeout – network issue.');
        }
        
        throw new Error(`API error: ${error.response?.data?.error?.message || error.message}`);
    }
}

// Fallback URLs (Optional)
async function getYouTubeUrls(url, useFallback = false) {
    if (!useFallback) {
        return { 
            audioUrl: null, 
            videoUrl: null, 
            note: 'Download URLs disabled (ToS compliance). Use external tools like yt-dlp.' 
        };
    }
    
    try {
        if (!youtubedl) youtubedl = (await import('youtube-dl-exec')).default;
        const info = await youtubedl(url, {
            dumpSingleJson: true,
            noWarnings: true,
            noPlaylists: true,
            timeout: 10000
        });
        
        const audioUrl = info.url || null;
        let videoUrl = audioUrl;
        if (info.formats?.length > 0) {
            const videoFormat = info.formats.find(f => f.vcodec !== 'none' && f.acodec === 'none');
            videoUrl = videoFormat?.url || audioUrl;
        }
        
        return { 
            audioUrl, 
            videoUrl, 
            formatsCount: info.formats?.length || 0 
        };
    } catch (error) {
        console.warn('Fallback URLs Error:', error.message);
        return { 
            audioUrl: null, 
            videoUrl: null, 
            formatsCount: 'Unavailable', 
            note: 'URLs extraction failed – use metadata only.' 
        };
    }
}

export default async function handler(req, res) {
    res.setHeader('Content-Type', 'application/json'); // Force JSON
    
    const apiKey = process.env.YOUTUBE_API_KEY;
    const useFallbackUrls = process.env.USE_YT_URLS === 'true';
    
    try {
        if (req.method !== 'GET') return res.status(405).json({ error: true, message: 'GET only.', code: 405 });
        
        const { url } = req.query;
        if (!url || typeof url !== 'string' || !url.startsWith('http')) {
            return res.status(400).json({ error: true, message: 'Valid HTTP URL required.', code: 400 });
        }

        const requestConfig = {
            timeout: 10000,
            headers: {
                'User -Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,*/*;q=0.8',
                'Referer': 'https://www.google.com/'
            },
            maxRedirects: 5
        };

        const isYouTube = url.includes('youtube.com') || url.includes('youtu.be') || url.includes('youtube-nocookie.com');
        if (isYouTube) {
            const videoId = extractVideoId(url);
            if (!videoId) return res.status(400).json({ error: true, message: 'Invalid YouTube URL.', code: 400 });

            let metadata = null;
            let apiUsed = false;
            try {
                metadata = await getYouTubeInfo(videoId, apiKey);
                apiUsed = true;
            } catch (apiError) {
                console.warn('API Failed – Fallback if enabled:', apiError.message);
                if (useFallbackUrls) {
                    const fallback = await getYouTubeUrls(url, false); // Metadata only
                    metadata = {
                        title: fallback.title || 'Unknown',
                        author: fallback.uploader || 'Unknown',
                        durationSeconds: fallback.duration || 0,
                        description: 'Fallback mode – API unavailable.'
                    };
                } else {
                    return res.status(503).json({
                        error: true,
                        message: `YouTube API unavailable: ${apiError.message}`,
                        code: 503,
                        suggestion: 'Set YOUTUBE_API_KEY in env vars (free from Google Console).'
                    });
                }
            }

            const urls = await getYouTubeUrls(url, useFallbackUrls);

            return res.status(200).json({
                error: false,
                type: apiUsed ? 'youtube-api' : 'youtube-fallback',
                apiUsed,
                ...metadata,
                ...urls,
                note: 'Data from official API. Respect YouTube ToS for downloads.'
            });

        } else {
            // Non-YouTube
            const isConverter = url.includes('ytmp3') || url.includes('y2mate') || url.includes('ytmp4');
            if (isConverter) {
                return res.status(422).json({
                    error: true,
                    message: 'Converter sites blocked – use direct YouTube URL.',
                    code: 422,
                    suggestion: 'API best for YouTube videos.'
                });
            }

            let response;
            let retry = 0;
            const maxRetry = 2;
            while (retry <= maxRetry) {
                try {
                    response = await axios.get(url, requestConfig);
                    break;
                } catch (fetchError) {
                    retry++;
                    if (retry > maxRetry) throw fetchError;
                    await new Promise(r => setTimeout(r, 2000 * retry));
                }
            }

            const { data: html, headers } = response;
            const contentType = headers['content-type'] || '';

            if (contentType.includes('application/json')) {
                let jsonData;
                try {
                    jsonData = typeof html === 'string' ? JSON.parse(html) : html;
                } catch {
                    jsonData = { raw: html.substring(0, 500) };
                }
                return res.status(200).json({ error: false, type: 'json', rawData: jsonData, note: 'Direct JSON.' });
            }

            const $ = load(html);
            const title = $('title').text().trim() || $('h1').first().text().trim() || 'No title';
            const links = [];
            $('a, source').each((i, el) => {
                const href = $(el).attr('href') || $(el).attr('src');
                if (href && (href.match(/\.(mp3|mp4|m4a|ogg)$/i) || $(el).text().toLowerCase().includes('download'))) {
                    const fullHref = href.startsWith('http') ? href : new URL(href, url).href;
                    if (!links.includes(fullHref) && links.length < 10) links.push(fullHref);
                }
            });

            const description = $('meta[name="description"]').attr('content') || '';

            return res.status(200).json({
                error: false,
                type: 'html',
                title,
                description: description.substring(0, 200) + (description.length > 200 ? '...' : ''),
                extractedLinks: links.length ? links : ['No media links'],
                totalLinks: links.length,
                note: 'HTML parsed. Prefer YouTube for API features.'
            });
        }

    } catch (error) {
        console.error('Full Downloader Error:', error);
        
        let status = 500;
        let message = 'Processing error occurred.';
        
        if (error.message.includes('timeout') || error.code === 'ECONNABORTED') {
            status = 408; message = 'Timeout – site/API slow.';
        } else if (error.message.includes('invalid') || error.code === 'ENOTFOUND') {
            status = 400; message = 'Invalid URL.';
        } else if (error.message.includes('403') || error.message.includes('forbidden')) {
            status = 403; message = 'Access blocked.';
        } else if (error.message.includes('quota') || error.message.includes('API key')) {
            status = 403; message = 'YouTube API issue – check key/quota.';
        } else if (error.message.includes('not found') || error.message.includes('private')) {
            status = 404; message = 'Content unavailable.';
        } else if (error.message.includes('fallback') || error.message.includes('yt-dlp')) {
            status = 503; message = 'Tool unavailable.';
        }

        return res.status(status).json({
            error: true,
            message,
            code: status,
            suggestion: 'Try public YouTube URL. Set API key for best results.',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}
