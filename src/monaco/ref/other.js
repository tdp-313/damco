export class UseIO_Layout {
    constructor(original) {
        this.io = new Set();
        this.original = typeof (original) === 'boolean' ? original : false;
        this.device = "";
    }
}

export const normalRefDef = new Map();
export const sourceRefDef = new Map();
export const P_FILE = new Map();