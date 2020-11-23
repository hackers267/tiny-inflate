import {Tree} from "./tree.ts";
import {get_uint_16_array_30, get_uint_8_array_30} from "./utils.ts";
import {Data} from "./data.ts";
import {tinf_read_bits} from "./tinf_read_bits.ts";
import {tinf_build_fixed_trees} from "./tinf_build_fixed_trees.ts";
import {tinf_build_bits_base} from "./tinf_build_bits_base.ts";
import {tinf_get_bits} from "./tinf_get_bits.ts";
import {tinf_decode_symbol} from "./tinf_decode_symbol.ts";

const TINF_OK = 0;
const TINF_DATA_ERROR = -3;

let sl_tree = new Tree();
let sd_tree = new Tree();

let length_bits = get_uint_8_array_30();
let length_base = get_uint_16_array_30();
let dist_bits = get_uint_8_array_30();
let dist_base = get_uint_16_array_30();

let clcidx = new Uint8Array(
  [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15],
);

let offs = new Uint16Array(16);

function tinf_build_tree(tree:Tree,lengths:Uint8Array,off:number,num:number){
  let i,sum;
  for(i=0;i<16;++i) tree.table[i]=0;
  for(i=0;i<num;++i) tree.table[lengths[off+i]]++;

  tree.table[0] = 0;

  for (sum = 0,i=0;i<16;++i){
    offs[i] = sum;
    sum+=tree.table[i];
  }

  for(i=0;i<num;++i){
    if(lengths[off+i]) tree.trans[offs[lengths[off+i]]++] = i;
  }
}

const code_tree = new Tree();
const lengths = new Uint8Array(288 + 32);

function tinf_decode_trees(data:Data,lt:Tree,dt:Tree){
  let hlit, hdist, hclen;
  let i, num,length;
  hlit = tinf_read_bits(data,5,257);
  hdist = tinf_read_bits(data,5,1);

  hclen = tinf_read_bits(data,4,4);
  for (i =0;i<19;++i) lengths[i] = 0;

  for (i=0;i<hclen;++i){
    lengths[clcidx[i]] = tinf_read_bits(data, 3, 0);
  }

  tinf_build_tree(code_tree,lengths,0,19);

  for (num = 0; num < hlit + hdist;) {
    const sym = tinf_decode_symbol(data, code_tree);

    switch (sym) {
      case 16:
        /* copy previous code length 3-6 times (read 2 bits) */
        const prev = lengths[num - 1];
        for (length = tinf_read_bits(data, 2, 3); length; --length) {
          lengths[num++] = prev;
        }
        break;
      case 17:
        /* repeat code length 0 for 3-10 times (read 3 bits) */
        for (length = tinf_read_bits(data, 3, 3); length; --length) {
          lengths[num++] = 0;
        }
        break;
      case 18:
        /* repeat code length 0 for 11-138 times (read 7 bits) */
        for (length = tinf_read_bits(data, 7, 11); length; --length) {
          lengths[num++] = 0;
        }
        break;
      default:
        /* values 0-15 represent the actual code lengths */
        lengths[num++] = sym;
        break;
    }
  }

  tinf_build_tree(lt, lengths, 0, hlit);
  tinf_build_tree(dt, lengths, hlit, hdist);

}

function tinf_inflate_block_data(data:Data, lt:Tree, dt:Tree) {
  while (1) {
    let sym = tinf_decode_symbol(data, lt);

    /* check for end of block */
    if (sym === 256) {
      return TINF_OK;
    }

    if (sym < 256) {
      data.dest[data.destLen++] = sym;
    } else {
      let length, dist, offs;
      let i;

      sym -= 257;

      /* possibly get more bits from length code */
      length = tinf_read_bits(data, length_bits[sym], length_base[sym]);

      dist = tinf_decode_symbol(data, dt);

      /* possibly get more bits from distance code */
      offs = data.destLen - tinf_read_bits(data, dist_bits[dist], dist_base[dist]);

      /* copy match */
      for (i = offs; i < offs + length; ++i) {
        data.dest[data.destLen++] = data.dest[i];
      }
    }
  }
}

function tinf_inflate_uncompressed_block(d:Data) {
  let length, inv_length;
  let i;

  /* unread from bitbuffer */
  while (d.bitCount > 8) {
    d.sourceIndex--;
    d.bitCount -= 8;
  }

  /* get length */
  length = d.source[d.sourceIndex + 1];
  length = 256 * length + d.source[d.sourceIndex];

  /* get one's complement of length */
  inv_length = d.source[d.sourceIndex + 3];
  inv_length = 256 * inv_length + d.source[d.sourceIndex + 2];

  /* check length */
  if (length !== (~inv_length & 0x0000ffff))
    return TINF_DATA_ERROR;

  d.sourceIndex += 4;

  /* copy block */
  for (i = length; i; --i)
    d.dest[d.destLen++] = d.source[d.sourceIndex++];

  /* make sure we start next block on a byte boundary */
  d.bitCount = 0;

  return TINF_OK;
}

export function tinf_un_compress(source:any, dest:any) {
  const data = new Data(source, dest);
  let b_final, b_type, res;

  do {
    /* read final block flag */
    b_final = tinf_get_bits(data);

    /* read block type (2 bits) */
    b_type = tinf_read_bits(data, 2, 0);

    /* decompress block */
    switch (b_type) {
      case 0:
        /* decompress uncompressed block */
        res = tinf_inflate_uncompressed_block(data);
        break;
      case 1:
        /* decompress block with fixed huffman trees */
        res = tinf_inflate_block_data(data, sl_tree, sd_tree);
        break;
      case 2:
        /* decompress block with dynamic huffman trees */
        tinf_decode_trees(data, data.lTree, data.dTree);
        res = tinf_inflate_block_data(data, data.lTree, data.dTree);
        break;
      default:
        res = TINF_DATA_ERROR;
    }

    if (res !== TINF_OK)
      throw new Error('Data error');

  } while (!b_final);

  if (data.destLen < data.dest.length) {
    if (typeof data.dest.slice === 'function')
      return data.dest.slice(0, data.destLen);
    else
      return data.dest.subarray(0, data.destLen);
  }

  return data.dest;
}

tinf_build_fixed_trees(sl_tree, sd_tree);

/* build extra bits and base tables */
tinf_build_bits_base(length_bits, length_base, 4, 3);
tinf_build_bits_base(dist_bits, dist_base, 2, 1);

/* fix a special case */
length_bits[28] = 0;
length_base[28] = 258;
