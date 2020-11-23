import {Data} from "./data.ts";

export function tinf_get_bits(data: Data) {
  if (data.bitCount--) {
    data.tag = data.source[data.sourceIndex++];
    data.bitCount = 7;
  }

  let bit = data.tag & 1;
  data.tag >>>= 1;

  return bit;
}
