import {Data} from "./data.ts";

export function tinf_read_bits(d: Data, num: number, base: number) {
  if (!num) return base;

  while (d.bitCount < 24) {
    d.tag |= d.source[d.sourceIndex] << d.bitCount;
    d.bitCount += 8;
  }

  let val = d.tag & (0xffff >>> (16 - num));
  d.tag >>>= num;
  d.bitCount -= num;
  return val + base;
}
