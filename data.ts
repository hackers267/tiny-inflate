import { Tree } from "./tree.ts";

export class Data {
  source: any;
  sourceIndex = 0;
  tag = 0;
  bitCount = 0;
  dest: any;
  destLen = 0;
  lTree: Tree;
  dTree: Tree;

  constructor(source: any, dest: any) {
    this.source = source;
    this.dest = dest;
    this.lTree = new Tree();
    this.dTree = new Tree();
  }
}
