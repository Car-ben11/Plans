// =========================================================================
// VERCEL BACKEND ARCHITECTURE: SECURE API ROUTER (api/takeoff.js)
// =========================================================================
import formidable from 'formidable';
import fs from 'fs';
import fetch from 'node-fetch';

export const config = {
    api: { bodyParser: false } // Disable standard parsing to allow binary stream pass-through
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const CLOUDMERSIVE_KEY = "cb91109c-6d45-4ea3-bc76-e47f613c313d";
    const form = formidable();

    form.parse(req, async (err, fields, files) => {
        if (err) {
            return res.status(500).json({ error: 'Form parsing breakdown' });
        }

        const uploadedFile = files.imageFile;
        if (!uploadedFile) {
            return res.status(400).json({ error: 'No blueprint file payload received' });
        }

        try {
            // Read local temporary file stream into a secure binary buffer
            const fileBuffer = fs.readFileSync(uploadedFile.filepath);
            
            // Dispatch authenticated server-to-server packet directly to Cloudmersive
            const cloudmersiveResponse = await fetch("https://api.cloudmersive.com/ocr/image/image-to-text/words-with-localization", {
                method: "POST",
                headers: {
                    "Apikey": CLOUDMERSIVE_KEY,
                    "Content-Type": "application/octet-stream"
                },
                body: fileBuffer
            });

            if (!cloudmersiveResponse.ok) {
                return res.status(cloudmersiveResponse.status).json({ error: 'Cloudmersive gateway rejected packet' });
            }

            const layoutData = await cloudmersiveResponse.json();
            
            // Pass the clean, verified layout data structure back to the user screen safely
            return res.status(200).json(layoutData);

        } catch (error) {
            return res.status(500).json({ error: 'Internal pipeline fault: ' + error.message });
        }
    });
}
