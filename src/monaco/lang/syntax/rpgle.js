// RPGLE(ILE RPG)用の Monarch トークナイザ。
// 固定形式は 6桁目の仕様書タイプで欄を色分けし、残りと /FREE・**FREE は共通の規則で色分けする。
// 解析(定義・参照)は rpgle/rpgleParse.js で行うので、ここは表示用のみ。

const declarations = [
    'CTL-OPT', 'DCL-F', 'DCL-S', 'DCL-C', 'DCL-DS', 'DCL-PR', 'DCL-PI', 'DCL-PROC', 'DCL-SUBF', 'DCL-PARM', 'DCL-ENUM',
    'END-DS', 'END-PR', 'END-PI', 'END-PROC', 'END-ENUM',
];

const controls = [
    'IF', 'ELSE', 'ELSEIF', 'ENDIF', 'DOW', 'DOU', 'DO', 'ENDDO', 'FOR', 'FOR-EACH', 'ENDFOR', 'SELECT', 'WHEN', 'WHEN-IS', 'WHEN-IN',
    'OTHER', 'ENDSL', 'MONITOR', 'ON-ERROR', 'ON-EXCP', 'ON-EXIT', 'ENDMON', 'ITER', 'LEAVE', 'LEAVESR', 'RETURN',
    'BEGSR', 'ENDSR', 'EXSR', 'GOTO', 'TAG', 'END', 'ENDCS',
    'IFEQ', 'IFNE', 'IFLT', 'IFGT', 'IFLE', 'IFGE', 'DOWEQ', 'DOWNE', 'DOWLT', 'DOWGT', 'DOWLE', 'DOWGE',
    'DOUEQ', 'DOUNE', 'DOULT', 'DOUGT', 'DOULE', 'DOUGE', 'WHENEQ', 'WHENNE', 'WHENLT', 'WHENGT', 'WHENLE', 'WHENGE',
    'ANDEQ', 'ANDNE', 'ANDLT', 'ANDGT', 'ANDLE', 'ANDGE', 'OREQ', 'ORNE', 'ORLT', 'ORGT', 'ORLE', 'ORGE',
    'CABEQ', 'CABNE', 'CABLT', 'CABGT', 'CABLE', 'CABGE', 'CASEQ', 'CASNE', 'CASLT', 'CASGT', 'CASLE', 'CASGE', 'CAS',
];

const fileops = [
    'ACQ', 'CHAIN', 'CLOSE', 'COMMIT', 'DELETE', 'EXCEPT', 'EXFMT', 'FEOD', 'FORCE', 'NEXT', 'OPEN', 'POST',
    'READ', 'READC', 'READE', 'READP', 'READPE', 'REL', 'ROLBK', 'SETGT', 'SETLL', 'UNLOCK', 'UPDATE', 'WRITE',
];

const calls = ['CALL', 'CALLB', 'CALLP', 'PARM', 'PLIST', 'KLIST', 'KFLD'];

const opcodes = [
    'EVAL', 'EVALR', 'EVAL-CORR', 'CLEAR', 'RESET', 'DSPLY', 'SORTA', 'DEALLOC', 'ALLOC', 'REALLOC', 'DUMP',
    'MOVE', 'MOVEL', 'MOVEA', 'Z-ADD', 'Z-SUB', 'ADD', 'SUB', 'MULT', 'DIV', 'MVR', 'SQRT', 'XFOOT',
    'SETON', 'SETOFF', 'CAT', 'CHECK', 'CHECKR', 'SCAN', 'SUBST', 'XLATE', 'LOOKUP', 'TIME', 'TEST', 'DEFINE',
    'IN', 'OUT', 'UNLOCK', 'SND-MSG', 'DATA-INTO', 'DATA-GEN', 'XML-INTO', 'XML-SAX', 'EXEC',
];

const types = [
    'CHAR', 'VARCHAR', 'GRAPH', 'VARGRAPH', 'UCS2', 'VARUCS2', 'IND', 'PACKED', 'ZONED', 'BINDEC', 'INT', 'UNS',
    'FLOAT', 'DATE', 'TIME', 'TIMESTAMP', 'POINTER', 'OBJECT', 'LIKE', 'LIKEDS', 'LIKEREC', 'LIKEFILE',
    'DISK', 'WORKSTN', 'PRINTER', 'SEQ', 'SPECIAL',
];

export const rpgle_token = () => {
    return {
        ignoreCase: true,
        defaultToken: '',
        declarations,
        controls,
        fileops,
        calls,
        opcodes,
        types,
        tokenizer: {
            root: [
                [/^\*\*free\s*$/, { token: 'keyword', next: '@fullfree' }],
                [/^\*\*(?!\*).*$/, { token: 'string', next: '@ctdata' }],
                [/^.{5}\*.*$/, 'comment'],
                [/^.{6}\*.*$/, 'comment'],
                [/^.{6}\/\/.*$/, 'comment'],
                [/^.{6}\/[a-z][\w-]*.*$/, 'keyword'],
                // 仕様書ごとの固定欄(1-5 桁は順序番号)
                [/^(.{5})([f])(.{10})(.{19})(.{7})/, ['comment', 'tag', 'type', 'constant', 'keyword']],
                [/^(.{5})([d])(.{15})(.{2})(.{2})(.{7})(.{7})(.)(.{2})/, ['comment', 'tag', 'type', 'constant', 'keyword', 'number', 'number', 'constant', 'number']],
                [/^(.{5})([p])(.{15})(.{2})(.)/, ['comment', 'tag', 'entity', '', 'keyword']],
                [/^(.{5})([c])(.{2})(.{3})/, ['comment', 'tag', 'constructor', 'type']],
                [/^(.{5})([hio])/, ['comment', 'tag']],
                [/^.{5}(?= )/, 'comment'],
                { include: '@code' },
            ],
            fullfree: [
                [/^\*\*(?!\*).*$/, { token: 'string', next: '@ctdata' }],
                [/^\s*\/[a-z][\w-]*.*$/, 'keyword'],
                { include: '@code' },
            ],
            ctdata: [
                [/.*$/, 'string'],
            ],
            code: [
                [/\/\/.*$/, 'comment'],
                [/'/, { token: 'string', next: '@string' }],
                [/%[a-z][\w]*/, 'predefined'],
                [/\*in\(?\d\d\)?/, 'type'],
                [/\*[a-z][\w#@$]*/, 'predefined'],
                [/(dcl|end)-(s|c|f|ds|pr|pi|proc|subf|parm|enum)\b/, 'keyword'],
                [/(ctl-opt|eval-corr|for-each|on-error|on-excp|on-exit|when-is|when-in|snd-msg|data-into|data-gen|xml-into|xml-sax|z-add|z-sub)\b/, {
                    cases: {
                        '@controls': 'constant',
                        '@declarations': 'keyword',
                        '@default': 'keyword',
                    },
                }],
                [/[a-z_#@$][\w#@$]*/, {
                    cases: {
                        '@controls': 'constant',
                        '@fileops': 'PreIOs',
                        '@calls': 'entity',
                        '@opcodes': 'keyword',
                        '@types': 'type',
                        '@default': 'identifier',
                    },
                }],
                [/\d+(\.\d+)?/, 'number'],
            ],
            string: [
                [/[^']+/, 'string'],
                [/''/, 'string'],
                [/'/, { token: 'string', next: '@pop' }],
            ],
        },
    };
};
