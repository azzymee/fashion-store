import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

const uploadFields = upload.fields([
  { name: 'human', maxCount: 1 },
  { name: 'garment', maxCount: 1 }
]);

function bufferToBase64(buffer, mimetype) {
  return `data:${mimetype};base64,${buffer.toString('base64')}`;
}

async function pollReplicate(predictionId) {
  const token = process.env.REPLICATE_API_TOKEN;
  console.log('Polling prediction:', predictionId);

  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 4000));

    const res = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: {
        Authorization: `Token ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await res.json();
    console.log(`Poll ${i + 1}: status = ${data.status}`);

    if (data.status === 'succeeded') return data.output;
    if (data.status === 'failed') throw new Error(data.error || 'Prediction failed on Replicate');
  }

  throw new Error('Timed out waiting for try-on result');
}

app.post('/api/virtual-tryon', uploadFields, async (req, res) => {
  console.log('=== TRY-ON REQUEST RECEIVED ===');
  console.log('Token exists:', !!process.env.REPLICATE_API_TOKEN);

  try {
    const humanFile = req.files?.['human']?.[0];
    const garmentFile = req.files?.['garment']?.[0];

    if (!humanFile || !garmentFile) {
      console.log('Missing files - human:', !!humanFile, 'garment:', !!garmentFile);
      return res.status(400).json({ success: false, error: 'Both human and garment images are required' });
    }

    console.log('Files received, converting to base64...');
    const humanBase64 = bufferToBase64(humanFile.buffer, humanFile.mimetype);
    const garmentBase64 = bufferToBase64(garmentFile.buffer, garmentFile.mimetype);

    console.log('Calling Replicate API...');
    const startRes = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        version: 'c871bb9b046607b680449ecbae55fd8c6d945e0a1948644bf2361b3d021d3ff4',
        input: {
          human_img: humanBase64,
          garm_img: garmentBase64,
          garment_des: 'clothing item',
          is_checked: true,
          is_checked_crop: false,
          denoise_steps: 30,
          seed: 42
        }
      })
    });

    const startData = await startRes.json();
    console.log('Replicate response:', JSON.stringify(startData));

    if (!startData.id) {
      throw new Error(startData.detail || JSON.stringify(startData));
    }

    const output = await pollReplicate(startData.id);
    console.log('Output:', output);

    return res.json({
      success: true,
      outputImage: Array.isArray(output) ? output[0] : output
    });

  } catch (error) {
    console.error('=== TRY-ON ERROR ===');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.use(express.static(path.join(__dirname, 'dist')));
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(3001, () => console.log('Server running on port 3001'));