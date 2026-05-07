const axios = require('axios');

async function renderWithCreatomate(apiKey, templateId, modifications) {
    console.log('[CREATOMATE] Starting render with template:', templateId);
    
    try {
        const response = await axios.post('https://api.creatomate.com/v2/renders', {
            template_id: templateId,
            modifications: modifications
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        let render = response.data[0]; // Creatomate returns an array if one render is requested
        console.log('[CREATOMATE] Render initialized:', render.id);

        // Polling for completion
        const pollInterval = 2000;
        while (render.status !== 'completed' && render.status !== 'failed') {
            await new Promise(resolve => setTimeout(resolve, pollInterval));
            const statusRes = await axios.get(`https://api.creatomate.com/v2/renders/${render.id}`, {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });
            render = statusRes.data;
            console.log(`[CREATOMATE] Render ${render.id} status: ${render.status}`);
        }

        if (render.status === 'failed') {
            throw new Error(`Creatomate render failed: ${render.error || 'Unknown error'}`);
        }

        return render.url;
    } catch (error) {
        console.error('[CREATOMATE ERROR]', error.response?.data || error.message);
        throw error;
    }
}

module.exports = { renderWithCreatomate };
