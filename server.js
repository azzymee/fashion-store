import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { Client } from '@gradio/client';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

const uploadFields = upload.fields([
  { name: 'human', maxCount: 1 },
  { name: 'garment', maxCount: 1 }
]);

app.post('/api/virtual-tryon', uploadFields, async (req, res) => {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const gradioClient = await Client.connect("Kwai-Kolors/Kolors-Virtual-Try-On", {
        hf_token: process.env.HF_TOKEN
      });

      const humanImage = new Blob([req.files['human'][0].buffer], {
        type: req.files['human'][0].mimetype
      });
      const garmentImage = new Blob([req.files['garment'][0].buffer], {
        type: req.files['garment'][0].mimetype
      });

      const result = await gradioClient.predict("/tryon", [
        humanImage,
        garmentImage,
        "Keep the original background",
        42
      ]);

      return res.json({
        success: true,
        outputImage: result.data[0],
        maskedImage: result.data[1]
      });

    } catch (error) {
      lastError = error;
      console.log(`Attempt ${attempt} failed, retrying in 5s...`);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
  res.status(500).json({ success: false, error: lastError?.message || 'All retries failed' });
});

app.use(express.static(path.join(__dirname, 'dist')));
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(3001, () => console.log('Try-on server running on port 3001'));