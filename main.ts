import {mkdirSync as mkdir, readdirSync as list, readFileSync as read, writeFileSync as write} from 'node:fs';

// ASCII 48 plus (width << 4) + (pops << 2) + pushes.
const shapes = ['0Aq46:;?', '999999959995999', '999', 'PTTP0', '58', '4414'];

function execute(p: Buffer, input: Buffer, output: Buffer) {
  const s = new Int32Array(256), m = new Int32Array(256), r: number[] = [];
  let pc = 0, sp = 0, pos = 0, n = 0;
  function run() {
    for (let step = 0; step < 1000000; step++) {
      const op = p[pc++];
      if (op === undefined) return 9;
      const shape = shapes[op >> 4]?.charCodeAt(op & 15);
      if (!shape) return 5;
      const arg = pc;
      pc += (shape >> 4) - 3;
      if (pc > p.length) return 9;
      const i = sp - (shape >> 2 & 3);
      if (i < 0) return 2;
      sp = i + (shape & 3);
      if (sp > 256) return 3;

      let a = s[i], b = s[i + 1];
      if (!b && op >= 19 && op <= 22) return 4;
      switch (op) {
        case 0: return 0;
        case 1: a = p.readInt8(arg); break;
        case 2: a = p.readInt32LE(arg); break;
        case 3: continue;
        case 4: s[i + 1] = a; break;
        case 5: s[i + 1] = a; a = b; break;
        case 6: s[i + 2] = a; break;
        case 7: s[i + 1] = s[i + 2]; s[i + 2] = a; a = b; break;
        case 16: a += b; break;
        case 17: a -= b; break;
        case 18: a = Math.imul(a, b); break;
        case 19: a /= b; break;
        case 20: a %= b; break;
        case 21: a = (a >>> 0) / (b >>> 0); break;
        case 22: a = (a >>> 0) % (b >>> 0); break;
        case 23: a = -a; break;
        case 24: a &= b; break;
        case 25: a |= b; break;
        case 26: a ^= b; break;
        case 27: a = ~a; break;
        case 28: a <<= b; break;
        case 29: a >>= b; break;
        case 30: a >>>= b; break;
        case 32: a = +(a === b); break;
        case 33: a = +(a < b); break;
        case 34: a = +((a >>> 0) < (b >>> 0)); break;
        case 48:
        case 49:
        case 50:
          if (op === 48 || !!a === (op === 50)) pc += p.readInt16LE(arg);
          continue;
        case 51:
          if (r.length === 64) return 7;
          r.push(pc);
          pc = p.readUInt16LE(arg);
          continue;
        case 52:
          if (!r.length) return 8;
          pc = r.pop()!;
          continue;
        case 64:
        case 65: {
          const addr = op === 64 ? a : b;
          if (addr >>> 0 > 255) return 6;
          if (op === 64) a = m[addr];
          else m[addr] = a;
          break;
        }
        case 80: {
          const digits = String(a);
          if (n + digits.length > output.length) return 11;
          n += output.write(digits, n);
          continue;
        }
        case 81:
          if (n === output.length) return 11;
          output[n++] = a;
          continue;
        case 82: a = input[pos++] ?? -1; break;
        case 83: return a & 255;
      }
      s[i] = a;
    }
    return 10;
  }
  return [run(), n] as const;
}

const env = process.env;
const src = env.MAKEFUN_INPUT_DIR ?? '/input';
const dst = env.MAKEFUN_OUTPUT_DIR ?? '/output';
const output = Buffer.alloc(65536);
for (const id of list(src)) {
  const dir = src + '/' + id + '/', dest = dst + '/' + id + '/';
  const [exit, size] = execute(read(dir + 'program.bin'), read(dir + 'input.bin'), output);
  mkdir(dest, {recursive: true});
  write(dest + 'stdout.bin', output.subarray(0, size));
  write(dest + 'exit.txt', String(exit));
}
