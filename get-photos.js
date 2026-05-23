const https = require('https');

exports.handler = async function(event, context) {
  const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
  const API_KEY    = process.env.CLOUDINARY_API_KEY;
  const API_SECRET = process.env.CLOUDINARY_API_SECRET;

  if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing Cloudinary credentials in environment variables' })
    };
  }

  // Cloudinary Search API — finds all images in the travelmode folder
  const searchPayload = JSON.stringify({
    expression: 'folder:travelmode',
    sort_by: [{ created_at: 'desc' }],
    max_results: 100,
    with_field: ['tags', 'context']
  });

  const auth = Buffer.from(`${API_KEY}:${API_SECRET}`).toString('base64');

  const options = {
    hostname: 'api.cloudinary.com',
    path: `/v1_1/${CLOUD_NAME}/resources/search`,
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(searchPayload)
    }
  };

  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const photos = (parsed.resources || []).map(r => ({
            url: r.secure_url,
            publicId: r.public_id,
            filename: r.filename || r.public_id.split('/').pop(),
            width: r.width,
            height: r.height,
            createdAt: r.created_at,
            tags: r.tags || [],
            folder: r.folder || 'travelmode'
          }));
          resolve({
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ photos })
          });
        } catch (e) {
          resolve({
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to parse Cloudinary response', detail: e.message })
          });
        }
      });
    });

    req.on('error', (e) => {
      resolve({
        statusCode: 500,
        body: JSON.stringify({ error: 'Request to Cloudinary failed', detail: e.message })
      });
    });

    req.write(searchPayload);
    req.end();
  });
};
