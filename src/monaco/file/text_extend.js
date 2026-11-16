import { Operetor_OpenArray, Operetor_CloseArray, Operetor_ElseArray } from "../lang/syntax/syntax_grobal.js";
import { Subroutine_OpenArray, Subroutine_CloseArray } from "../lang/syntax/syntax_grobal.js";
import { detectDbcsMode, toColumnLine, stripFill } from "../lang/column.js";


const detectNewline = (str) => {
    let regex = /(\r\n|\n|\r)/;
    // 文字列に正規表現にマッチする部分があるかどうか調べる
    let match = str.match(regex);
    // マッチする部分があれば、その部分が改行文字である
    if (match) {
        // 改行文字を返す
        return match[0];
    } else {
        // 改行文字が見つからなければ、空文字を返す
        return "";
    }
}

export const addSpaces = (str, limit = 80) => {
    // 改行コードを検出する
    let newline = detectNewline(str);

    // 改行のない 1 行だけのテキスト(空文字で分割すると 1 文字ずつになってしまう)
    if (newline === "") {
        return str === "" ? "" : str.padEnd(limit);
    }
    // 各行を limit 桁まで空白で埋める。最後の改行の後ろ(空の行)は埋めない。
    // 埋めると、開くたびに元のソースにない行が末尾に増える
    const lines = str.split(newline);
    const last = lines.length - 1;
    return lines.map((line, i) => (i === last && line === "" ? line : line.padEnd(limit))).join(newline);
}

export const revIndent = (textArray) => {
    // 全角を含む行も桁位置で切り貼りできるよう、桁どおりの行に変換してから処理する
    const mode = detectDbcsMode(textArray);
    let rtn = "";
    for (let i = 0; i < textArray.length; i++) {
        const line = toColumnLine(textArray[i], mode);
        if (line.substring(6, 7) !== "*" && line.substring(5, 6) === "C") {
            rtn = rtn + stripFill(line.substring(0, 27) + line.substring(45, line.length)) + "\n";
        } else {
            rtn = rtn + textArray[i] + "\n";
        }
    }
    return (rtn);
}


export const addIndent = (text) => {
    // 全角を含む行も桁位置で切り貼りできるよう、桁どおりの行に変換してから処理し、最後に戻す
    const rawLines = text.split("\n");
    const dbcsMode = detectDbcsMode(rawLines);
    const lines = rawLines.map((line) => toColumnLine(line, dbcsMode));
    const maxLength = 80;
    const regPattern_Open = new RegExp(`(${Operetor_OpenArray.concat(Subroutine_OpenArray).join("|")})`);
    const regPattern_Close = new RegExp(`(${Operetor_CloseArray.concat(Subroutine_CloseArray).join("|")})`);
    const regPattern_Else = new RegExp(`(${Operetor_ElseArray.join("|")})`);
    let counter_open = 0;
    let lastFormatType = "";
    let maxIndent = 0;
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        let leadingSpaces = line.match(/^\s*/)[0];
        line = line.trim();
        let length = line.length;
        let numSpaces = maxLength - length;
        if (numSpaces > 0) {
            let spaces = "";
            for (let j = 0; j < numSpaces; j++) {
                spaces += " ";
            }
            lines[i] = leadingSpaces + line + spaces;
        }
        if (lines[i].substring(6, 7) !== "*" && lines[i].substring(5, 6) === "C") {
            let insertText = '';
            insertText = " ".repeat(14);
            if (regPattern_Open.test(lines[i].substring(27, 32))) {
                counter_open++;
                if (counter_open > 9) {
                    console.warn('Error Inline over 9');
                    counter_open = 9;
                }
                insertText += 'O' + counter_open;

            }
            else if (regPattern_Close.test(lines[i].substring(27, 32))) {
                insertText += 'C' + counter_open;


                counter_open--;
                if (counter_open < 0) {
                    console.warn('Error Inline under 0');
                    counter_open = 0;
                }
            }
            else if (regPattern_Else.test(lines[i].substring(27, 32))) {
                insertText += 'L' + counter_open;
            }
            else {
                insertText += 'S' + counter_open;
            }
            if (Math.max(counter_open, maxIndent) !== maxIndent) {
                maxIndent = counter_open;
            }
            insertText += '-' + maxIndent;
            lines[i] = lines[i].substring(0, 27) + insertText + lines[i].substring(27, lines[i].length);
            if (counter_open === 0) {
                maxIndent = 0;
            }
        }
    }
    //indent line Create
    const indentMaxLength = 9;
    let lastIndent = 0;
    for (let i = lines.length - 1; i > 0; i--) {
        let line = lines[i];
        if (line.substr(5, 1) === "C" && line.substr(6, 1) !== "*") {
            let indent = Number(line.substr(27 + 14 + 3, 1)) + 1;
            let indentLevel = Number(line.substr(27 + 14 + 1, 1));
            let indentLine = line.substr(27 + 14, 1);
            //console.debug(indentLine, indentLevel, indent);
            maxIndent = Math.max(maxIndent, indent);
            let replaceIndentText = "  ".repeat(indentMaxLength);
            if (Math.abs(indent - lastIndent) > 1) {
                maxIndent = indent;
            }
            if (indentLevel === 0) {
                maxIndent = 0;
            } else {
                //create
                if (indentLine === "O") {
                    replaceIndentText = "  ".repeat(indentMaxLength - (maxIndent - indentLevel));
                    replaceIndentText += "{"
                    replaceIndentText += "-".repeat((maxIndent - indentLevel) * 2 - 1);
                }

                else if (indentLine === "C") {
                    replaceIndentText = "  ".repeat(indentMaxLength - (maxIndent - indentLevel));
                    replaceIndentText += "}";
                    replaceIndentText += "-".repeat((maxIndent - indentLevel) * 2 - 1);
                }
                else if (indentLine === "L") {
                    replaceIndentText = "  ".repeat(indentMaxLength - (maxIndent - indentLevel));
                    replaceIndentText += "*"
                    replaceIndentText += "-".repeat((maxIndent - indentLevel) * 2 - 1);
                }
            }
            lastIndent = indent;
            lines[i] = lines[i].substring(0, 27) + replaceIndentText + lines[i].substring(45, lines[i].length);
        }
    }
    let nowRow = (" ".repeat(indentMaxLength * 2)).split("");

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        if (line.substr(5, 1) === "C" && line.substr(6, 1) !== "*") {
            let readRow = line.substring(27, 45).split("");;

            let isPlus = false;
            for (let i = 0; i < nowRow.length; i++) {
                if (readRow[i] === "{" || readRow[i] === "}") {
                    isPlus = true;
                    if (nowRow[i] === "|") {
                        nowRow[i] = " ";
                    } else {
                        nowRow[i] = "|";
                    }
                    break;
                } else if (readRow[i] === "*") {
                    readRow[i] = "+";
                    isPlus = true;
                    break;
                } else {
                    readRow[i] = nowRow[i];
                }
            }

            let insertText = readRow.join('');
            lines[i] = lines[i].substring(0, 27) + insertText + lines[i].substring(45, lines[i].length);

        }
    }
    return lines.map(stripFill).join("\n");
}