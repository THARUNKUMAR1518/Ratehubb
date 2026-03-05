export default async function handler(req, res) {
    const apiKey = '3fd2be6f0c70a2a598f084ddfb75487c';
    
    // Extract path and query from request
    const url = new URL(req.url, 'http://example.com');
    let path = url.pathname.replace('/api/proxy', '');
    
    // Get query parameters
    const params = new URLSearchParams(url.search);
    params.delete('api_key'); // Remove client's api_key
    params.set('api_key', apiKey); // Add server's api_key
    
    // Build final TMDb URL
    const finalUrl = `https://api.themoviedb.org/3${path}?${params.toString()}`;
    
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    try {
        console.log('Proxying request to:', finalUrl);
        const response = await fetch(finalUrl);
        const data = await response.json();
        
        if (!response.ok) {
            return res.status(response.status).json({ error: data });
        }
        
        res.setHeader('Cache-Control', 'max-age=3600');
        return res.status(200).json(data);
    } catch (err) {
        console.error('Proxy error:', err);
        return res.status(500).json({ error: 'Failed to fetch from TMDb', message: err.message });
    }
}
