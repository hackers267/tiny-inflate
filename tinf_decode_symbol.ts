import {Data} from "./data.ts";
import {Tree} from "./tree.ts";

export function tinf_decode_symbol(data: Data, tree: Tree) {
  while (data.bitCount < 24) {
    data.tag |= data.source[data.sourceIndex++] << data.bitCount;
    data.bitCount += 8;
  }

  let sum = 0, cur = 0, len = 0;
  let tag = data.tag;

  do {
    cur = 2 * cur + (tag & 1);
    tag >>>= 1;
    ++len;

    sum += tree.table[len];
    cur -= tree.table[len];
  } while (cur >= 0);

  data.tag = tag;
  data.bitCount -= len;

  return tree.trans[sum + cur];
}
