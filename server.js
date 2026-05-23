import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import { v2 as cloudinary } from 'cloudinary';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json());

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

const uploadFields = upload.fields([
  { name: 'human', maxCount: 1 },
  { name: 'garment', maxCount: 1 }
]);

async function uploadToCloudinary(buffer, mimetype) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'tryon', resource_type: 'image' },
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

app.post('/api/virtual-tryon', uploadFields, async (req, res) => {
  console.log('=== TRY-ON REQUEST ===');
  try {
    const humanFile = req.files?.['human']?.[0];
    const garmentFile = req.files?.['garment']?.[0];

    if (!humanFile || !garmentFile) {
      return res.status(400).json({ success: false, error: 'Both images required' });
    }

    console.log('Uploading to Cloudinary...');
    const [humanUrl, garmentUrl] = await Promise.all([
      uploadToCloudinary(humanFile.buffer, humanFile.mimetype),
      uploadToCloudinary(garmentFile.buffer, garmentFile.mimetype),
    ]);
    console.log('Uploaded:', humanUrl, garmentUrl);

    console.log('Calling LightX API...');
    const lightxRes = await fetch('https://api.lightxeditor.com/external/api/v2/aivirtualtryon', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.LIGHTX_API_KEY,
      },
      body: JSON.stringify({
        imageUrl: humanUrl,
        styleImageUrl: garmentUrl,
      }),
    });

    const lightxData = await lightxRes.json();
    console.log('LightX response:', JSON.stringify(lightxData));

    if (!lightxRes.ok) {
      throw new Error(lightxData.message || 'LightX API failed');
    }

    const outputImage = lightxData?.body?.imageUrl 
      || lightxData?.imageUrl 
      || lightxData?.output 
      || lightxData?.data?.imageUrl;

    if (!outputImage) {
      throw new Error('No output image in response: ' + JSON.stringify(lightxData));
    }

    return res.json({ success: true, outputImage });

  } catch (error) {
    console.error('=== ERROR ===', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.use(express.static(path.join(__dirname, 'dist')));
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(3001, () => console.log('Server running on port 3001'));