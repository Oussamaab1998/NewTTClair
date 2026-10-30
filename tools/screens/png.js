/* eslint-env node */
/* eslint-disable no-bitwise */
/**
 * Minimal PNG decoder (8-bit RGB / RGBA, non-interlaced) on Node's zlib: the
 * only thing the screenshot diff needs. No dependency. Untracked on purpose
 * (docs/COMPONENTS_PROBABILITY_V2.md section 8, Q11).
 */
const zlib = require('zlib');

const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function decode(buf) {
  if (!buf.subarray(0, 8).equals(SIGNATURE)) {
    throw new Error('not a PNG');
  }
  let pos = 8;
  let header = null;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('latin1', pos + 4, pos + 8);
    const body = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      header = {
        width: body.readUInt32BE(0),
        height: body.readUInt32BE(4),
        bitDepth: body[8],
        colorType: body[9],
        interlace: body[12],
      };
    } else if (type === 'IDAT') {
      idat.push(body);
    } else if (type === 'IEND') {
      break;
    }
    pos += 12 + len;
  }
  if (!header || header.bitDepth !== 8 || header.interlace !== 0) {
    throw new Error('unsupported PNG (need 8-bit, non-interlaced)');
  }
  const channels = { 2: 3, 6: 4 }[header.colorType];
  if (!channels) {
    throw new Error(`unsupported PNG colour type ${header.colorType}`);
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = header.width * channels;
  const out = Buffer.alloc(stride * header.height);
  for (let y = 0; y < header.height; y++) {
    const filter = raw[y * (stride + 1)];
    const src = y * (stride + 1) + 1;
    const dst = y * stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? out[dst + x - channels] : 0;
      const b = y > 0 ? out[dst - stride + x] : 0;
      const c = y > 0 && x >= channels ? out[dst - stride + x - channels] : 0;
      let v = raw[src + x];
      if (filter === 1) {
        v += a;
      } else if (filter === 2) {
        v += b;
      } else if (filter === 3) {
        v += (a + b) >> 1;
      } else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      } else if (filter !== 0) {
        throw new Error(`bad PNG filter ${filter}`);
      }
      out[dst + x] = v & 255;
    }
  }
  return { width: header.width, height: header.height, channels, data: out };
}

module.exports = { decode };
