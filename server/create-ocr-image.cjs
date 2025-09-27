const { Jimp } = require('jimp');

async function createImage() {
  const width = 800;
  const height = 400;
  const image = await new Jimp({ width, height, color: 0xffffffff });

  const font = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);

  const lines = [
    'Mind-Mesh OCR Test',
    'This is text inside an image.',
    'OCR should extract this content.',
    'Confidence should be decent (>70%).'
  ];

  let y = 40;
  for (const line of lines) {
    image.print({ font, x: 40, y, text: line });
    y += 60;
  }

  await image.write('ocr-test.png');
  console.log('Created ocr-test.png');
}

createImage().catch(err => {
  console.error('Failed to create image:', err);
  process.exit(1);
});
