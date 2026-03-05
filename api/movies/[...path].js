export default async function handler(req, res) {
    const apiKey = '3fd2be6f0c70a2a598f084ddfb75487c';
    
    // Get the path from query parameters
    const { path = [] } = req.query;
    const endpoint = '/' + (Array.isArray(path) ? path.join('/') : path);
    
    // Build the TMDb URL with all query params
    const params = new URLSearchParams();
    Object.entries(req.query).forEach(([key, value]) => {
        if (key !== 'path') {
            if (Array.isArray(value)) {
                value.forEach(v => params.append(key, v));
            } else {
                params.set(key, value);
            }
        }
    });
    params.set('api_key', apiKey);
    
    const tmdbUrl = `https://api.themoviedb.org/3${endpoint}?${params.toString()}`;
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'max-age=3600');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    try {
        const response = await fetch(tmdbUrl);
        const data = await response.json();
        return res.status(200).json(data);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
