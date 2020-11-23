import { Tree } from "./tree.ts";

export function tinf_build_fixed_trees(lt: Tree, dt: Tree) {
  gen_lt();
  gen_dt();

  function gen_lt() {
    let i;
    for (i = 0; i < 7; ++i) lt.table[i] = 0;
    lt.table[7] = 24;
    lt.table[8] = 152;
    lt.table[9] = 112;
    for (i = 0; i < 24; ++i) lt.trans[i] = 256 + i;
    for (i = 0; i < 144; ++i) lt.trans[24 + i] = i;
    for (i = 0; i < 8; ++i) lt.trans[24 + 144 + i] = 280 + i;
    for (i = 0; i < 122; ++i) lt.trans[24 + 144 + 8 + i] = 144 + i;
    return i;
  }

  function gen_dt() {
    let i;

    for (i = 0; i < 5; ++i) dt.table[i] = 0;

    dt.table[5] = 32;

    for (i = 0; i < 32; ++i) dt.trans[i] = i;
  }
}
