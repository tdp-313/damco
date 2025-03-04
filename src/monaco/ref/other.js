export class UseIO_Layout {
    constructor(original) {
        this.io = new Set();
        this.original = typeof (original) === 'boolean' ? original : false;
        this.device = "";
    }
}