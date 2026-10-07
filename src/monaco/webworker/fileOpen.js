const hasHighBitBytes = (bytes) => {
    for (const byte of bytes) {
        if (byte >= 0x80) {
            return true;
        }
    }
    return false;
};

const isLikelyShiftJisBytes = (arrayBuffer) => {
    const bytes = new Uint8Array(arrayBuffer);
    if (bytes.length < 4 || !hasHighBitBytes(bytes)) {
        return false;
    }

    let sjisPairCount = 0;
    let checkedPairCount = 0;

    for (let i = 0; i < bytes.length - 1; i += 2) {
        const firstByte = bytes[i];
        const secondByte = bytes[i + 1];

        const isLeadByte =
            (firstByte >= 0x81 && firstByte <= 0x9f) ||
            (firstByte >= 0xe0 && firstByte <= 0xfc);

        const isTrailByte =
            (secondByte >= 0x40 && secondByte <= 0x7e) ||
            (secondByte >= 0x80 && secondByte <= 0xfc);

        if (isLeadByte && isTrailByte) {
            sjisPairCount += 1;
        }
        checkedPairCount += 1;
    }

    return sjisPairCount >= 3 && (sjisPairCount / checkedPairCount) >= 0.15;
};

const getJapaneseTextScore = (text) => {
    if (!text) {
        return 0;
    }

    const japaneseChars = (text.match(/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
    let score = japaneseChars * 2;

    if (text.includes('�')) {
        score -= 4;
    }

    return score;
};

export const fileOpen = async (fileHandle, isForceSJIS = false) => {
    let file_obj = fileHandle;

    let file = await file_obj.getFile();
    let ext = '★';
    if (file.name.length > 3) {

        let nu_ext = file.name.substring(file.name.indexOf(".") + 1, file.name.length);
        if (!isNaN(Number(nu_ext))) {
            ext = Number(nu_ext);
            if (ext < 10) {
                ext = ext;
            }
        }
    }
    let lastModifiedTime = await file.lastModifiedDate.toLocaleString();

    let rtn = { timestamp: lastModifiedTime, text: "", textArray: [], encode: isForceSJIS ? 'Shift-JIS' : 'utf-8', ext: ext, handle: fileHandle };

    const response = await fetch(URL.createObjectURL(file));
    const arrayBuffer = await response.arrayBuffer();

    const { text, encode } = decodeText(arrayBuffer, isForceSJIS);
    rtn.encode = encode;
    if (text === '') {
        return rtn;
    }
    rtn.text = text;
    let textArray = text.split(/\r\n|\r|\n/);
    rtn.textArray = textArray;
    return (rtn);
}

// UTF-8 と Shift_JIS を判定してデコードする(VS Code 拡張機能からも使う)
export const decodeText = (arrayBuffer, isForceSJIS = false) => {
    let encodeStyle = 'utf-8';
    if (isForceSJIS) {
        encodeStyle = 'Shift-JIS';
    }

    const decoderUTF = new TextDecoder(encodeStyle);
    const textUTF = decoderUTF.decode(arrayBuffer);
    let text = textUTF;
    let selectedEncode = encodeStyle;

    if (!isForceSJIS) {
        const hasReplacementChar = textUTF.includes('�');
        const seemsLikeShiftJis = hasReplacementChar || isLikelyShiftJisBytes(arrayBuffer);

        if (seemsLikeShiftJis) {
            const decoderJIS = new TextDecoder('Shift-JIS');
            const textJIS = decoderJIS.decode(arrayBuffer);
            const utf8Score = getJapaneseTextScore(textUTF);
            const shiftJisScore = getJapaneseTextScore(textJIS);

            const shouldUseShiftJis =
                !textJIS.includes('�') &&
                (shiftJisScore > utf8Score || (shiftJisScore > 0 && utf8Score === 0));

            if (shouldUseShiftJis) {
                text = textJIS;
                selectedEncode = 'Shift-JIS';
            }
        }
    }
    return { text, encode: selectedEncode };
}