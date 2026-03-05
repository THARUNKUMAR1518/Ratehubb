export default async function handler(req, res) {
    const apiKey = '3fd2be6f0c70a2a598f084ddfb75487c';
    const tmdbBaseUrl = 'https://api.themoviedb.org/3';
    
    // Extract the path segments from the catch-all route
    const pathSegments = req.query.path || [];
    const path = '/' + pathSegments.join('/');
    
    // Add CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    try {
        // Construct the full URL with the API key
        const queryString = new URLSearchParams(req.query);
        // Remove path from query string since it's not a real query param
        queryString.delete('path');
        
        const queryParams = queryString.toString();
        const separator = queryParams ? '&' : '?';
        const url = `${tmdbBaseUrl}${path}?${queryParams}${separator}api_key=${apiKey}`;
        
        console.log('Fetching from TMDB:', url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`API returned ${response.status}`);
        }
        
        const data = await response.json();
        
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.status(200).json(data);
    } catch (error) {
        console.error('TMDB API Error:', error);
        res.status(500).json({ error: 'Failed to fetch from TMDB', details: error.message });
    }
}
