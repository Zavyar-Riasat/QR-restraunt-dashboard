/**
 * Prepares desktop assets:
 * 1. desktop/assets/icon.png (copied from public/icon-512.png)
 * 2. desktop/assets/tray-icon.png (clean 32x32 PNG)
 * 3. desktop/assets/icon.ico (valid multi-image Windows ICO container)
 * 4. desktop/assets/order-alarm.wav (audible repeating kitchen alarm chime)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DESKTOP_ASSETS = path.join(ROOT, 'desktop', 'assets');

if (!fs.existsSync(DESKTOP_ASSETS)) {
  fs.mkdirSync(DESKTOP_ASSETS, { recursive: true });
}

// 1. Copy icon.png from public/icon-512.png
const srcIcon = path.join(ROOT, 'public', 'icon-512.png');
const destIcon = path.join(DESKTOP_ASSETS, 'icon.png');
if (fs.existsSync(srcIcon)) {
  fs.copyFileSync(srcIcon, destIcon);
  console.log('✓ Copied icon.png');
}

// 2. Copy 192 icon for tray
const src192 = path.join(ROOT, 'public', 'icon-192.png');
const destTray = path.join(DESKTOP_ASSETS, 'tray-icon.png');
if (fs.existsSync(src192)) {
  fs.copyFileSync(src192, destTray);
  console.log('✓ Copied tray-icon.png');
}

// 3. Create Windows .ico file containing PNG frames
function createIcoFromPngs(pngBuffers, sizes) {
  const numImages = pngBuffers.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const totalDirSize = dirEntrySize * numImages;

  let currentOffset = headerSize + totalDirSize;
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 = ICO
  header.writeUInt16LE(numImages, 4);

  const dirEntries = [];
  for (let i = 0; i < numImages; i++) {
    const png = pngBuffers[i];
    const size = sizes[i];
    const entry = Buffer.alloc(dirEntrySize);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // width
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
    entry.writeUInt8(0, 2); // color count
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // planes
    entry.writeUInt16LE(32, 6); // bit count
    entry.writeUInt32LE(png.length, 8); // image size
    entry.writeUInt32LE(currentOffset, 12); // image offset
    dirEntries.push(entry);
    currentOffset += png.length;
  }

  return Buffer.concat([header, ...dirEntries, ...pngBuffers]);
}

const icon192Buf = fs.readFileSync(path.join(ROOT, 'public', 'icon-192.png'));
const icon512Buf = fs.readFileSync(path.join(ROOT, 'public', 'icon-512.png'));
const icoBuf = createIcoFromPngs([icon192Buf, icon512Buf], [192, 256]);
fs.writeFileSync(path.join(DESKTOP_ASSETS, 'icon.ico'), icoBuf);
console.log('✓ Generated desktop/assets/icon.ico (' + icoBuf.length + ' bytes)');

// 4. Generate synthesized loud double-ping kitchen alarm WAV file
function generateAlarmWav() {
  const sampleRate = 44100;
  const durationSec = 1.2;
  const numSamples = Math.floor(sampleRate * durationSec);
  const dataSize = numSamples * 2; // 16-bit mono

  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF identifier
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // 'fmt ' chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // subchunk1 size (16 for PCM)
  buffer.writeUInt16LE(1, 20); // audio format (1 = PCM)
  buffer.writeUInt16LE(1, 22); // num channels (1 = mono)
  buffer.writeUInt32LE(sampleRate, 24); // sample rate
  buffer.writeUInt32LE(sampleRate * 2, 28); // byte rate (sampleRate * numChannels * bitsPerSample/8)
  buffer.writeUInt16LE(2, 32); // block align
  buffer.writeUInt16LE(16, 34); // bits per sample

  // 'data' chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Generate dual-tone energetic chime (784Hz G5 + 1046Hz C6) with repeating double-beep
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;

    // Beep 1: 0.0s to 0.45s
    if (t < 0.45) {
      const decay = Math.exp(-t * 6);
      const tone1 = Math.sin(2 * Math.PI * 880 * t);
      const tone2 = Math.sin(2 * Math.PI * 1320 * t);
      sample = 0.5 * (tone1 + tone2) * decay;
    }
    // Beep 2: 0.5s to 1.1s (higher tone)
    else if (t >= 0.5 && t < 1.1) {
      const t2 = t - 0.5;
      const decay = Math.exp(-t2 * 5);
      const tone1 = Math.sin(2 * Math.PI * 1046.5 * t2);
      const tone2 = Math.sin(2 * Math.PI * 1567.98 * t2);
      sample = 0.55 * (tone1 + tone2) * decay;
    }

    // Clamp to 16-bit range (-32768 to 32767)
    const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32000)));
    buffer.writeInt16LE(intSample, 44 + i * 2);
  }

  return buffer;
}

const wavBuf = generateAlarmWav();
fs.writeFileSync(path.join(DESKTOP_ASSETS, 'order-alarm.wav'), wavBuf);
console.log('✓ Generated desktop/assets/order-alarm.wav (' + wavBuf.length + ' bytes)');
console.log('Desktop assets preparation complete!');
