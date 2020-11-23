export class Tree {
  table: Uint16Array;
  trans: Uint16Array;

  constructor() {
    this.table = new Uint16Array(16);
    this.trans = new Uint16Array(288);
  }
}
