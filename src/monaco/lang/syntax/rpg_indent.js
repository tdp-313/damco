import { Operetor_OpenArray, Operetor_CloseArray, Operetor_ElseArray, Subroutine_OpenArray, Subroutine_CloseArray, RPG400_ConstantsArray, RPG400_Constants_NUMArray } from "./syntax_grobal.js";

export const rpg_token2 = () => {
    return (
        {
            OperatorOpen: Operetor_OpenArray,
            OperatorClose: Operetor_CloseArray,
            OperatorOther: [
                'CABEQ', 'CABNE', 'CABLT', 'CABGT', 'CABLE', 'CABGE', 'CAB  ', 'ITER ', 'LEAVE',
                'ANDEQ', 'ANDNE', 'ANDLT', 'ANDGT', 'ANDLE', 'ANDGE',
                'OREQ ', 'ORNE ', 'ORLT ', 'ORGT ', 'ORLE ', 'ORGE ', 'GOTO ',
            ].concat(Operetor_ElseArray),
            SubroutineOpen: Subroutine_OpenArray,
            SubroutineClose: Subroutine_CloseArray,
            RPG400_Constants: RPG400_ConstantsArray,
            RPG400_Constants_NUM: RPG400_Constants_NUMArray,
            SubroutineOther: [
                'EXSR ', 'CASGT', 'CASLT', 'CASEQ', 'CASNE', 'CASGE', 'CASLE', 'CAS  ', 'ENDCS', 'COMP '
            ],
            Arrays: [
                'LOKUP', 'MOVEA', 'SORTA', 'XPOOT'
            ],
            BitOrders: [
                'BITOF', 'BITON', 'TESTB'
            ],
            CallOrder: [
                'CALL ', 'FREE ', 'PARM ', 'PLIST', 'RETRN'
            ],
            DataFields: [
                'IN   ', 'OUT  ', 'UNKCK'
            ],
            Declarations: [
                'DEFN ', 'KFLD ', 'KLIST', 'PARM ', 'PLIST', 'TAG  '
            ],
            FileIOs: [
                'COMIT', 'DELET', 'DELET', 'EXCPT', 'EXFMT', 'FORCE', 'POST ', 'ROLBK', 'UPDAT', 'WRITE'
            ],
            FilePreIOs: [
                'ACQ  ', 'CHAIN', 'CLOSE', 'EXCPT', 'FEOD ', 'NEXT ', 'OPEN ', 'READ ', 'READC', 'READE', 'READP',
                'REDPE', 'REL  ', 'SETGT', 'SETLL', 'UNLCK'
            ],
            FlagOrders: [
                'SETON', 'SETOF'
            ],
            Information: [
                'DEBUG', 'DUMP ', 'SHTDN', 'TIME ', 'DSPLY', 'TESTB', 'TESTN', 'TESTZ'
            ],
            Arithmetics: [
                'ADD  ', 'DIV  ', 'MULT ', 'MVR  ', 'SQRT ', 'SUB  ', 'XFOOT', 'Z-ADD', 'Z-SUB'
            ],
            StringOrders: [
                'CAT  ', 'CHECK', 'CHEKR', 'SCAN ', 'SUBST', 'XLATE', 'MOVE ', 'MOVEL'
            ],
            ZoneTransfers: [
                'MHHZO', 'MHLZO', 'MLHZO', 'MLLZO'
            ],
            Initializes: [
                'CLEAR', 'RESET'
            ],
            file_R: [
                'COMIT ', 'ID    ', 'IGNORE', 'IND   ', 'INFDS ', 'INFSR ', 'NUM   ', 'PASS  ', 'PLIST ', 'PRTCTL', 'RECNO ', 'RENAME', 'SAVDS ', 'SFILE ', 'SLN   '
            ],
            tokenizer: {
                root: [
                    [/.{6}\*.*/, { token: 'comment' }],
                    [/^(.{1,5})(F)(.{1,12})(.{1,10})(.{1,18})(.{1,5})( )(K)(.{1,6})(.{1,8})(.*)$/,
                        ['', 'tag', '', 'constant', '', 'constant', 'constant', 'type', {
                            cases: {
                                '@file_R': 'keyword',
                                '@default': 'invalid'
                            },
                        }, 'identifier', '']
                    ],
                    [/^(.{1,5})(F)(.{1,8}.)(.)(.{1,23})(.{1,8})(.*)$/,
                        ['', 'tag', {
                            cases: {
                                '.{1,8}.{0,8}I': 'type',
                                '.{1,8}.{0,8}U': 'keyword',
                                '.{1,8}.{0,8}O': 'string',
                                '@default': 'invalid'
                            },
                        }, {
                                cases: {
                                    ' ': 'overwhite',
                                    '(F|R)': 'constant',
                                    'P': 'entity',
                                    'S': 'regexp',
                                    '@default': 'invalid'
                                }
                            }, '', 'constant', '']
                    ],
                    [/^(.{1,5})(I)(.{1,37})(.{1,4})(.{1,4})(.)(.{1,6})(.*)$/,
                        ['', 'tag', '', 'number', 'number', 'constant', 'identifier', '']
                    ],
                    //     |       |       |  |   |            
                    [/^(.{1,2})(.{1,3})(C)(..)(.)(.{1,2})(.)(.{1,2})(.)(.{1,2})(.{1,10})(.{1,18})(.{1,5})(.{1,10})(.{1,6})(.{1,3})(.)(.)(.{1,2})(.{1,2})(.{1,2})(.{1,15})(.*)$/,
                        ['comment', '', 'tag',
                            {
                                cases: {//7-8
                                    ' {2}': 'overwhite',
                                    '(L0|L1|L2|L3|L4|L5|L6|L7|L8|L9|LR|SR)': 'constructor',
                                    '(AN|OR)': 'type',
                                    '@default': 'invalid'
                                }
                            }, {
                                cases: {//9
                                    ' ': 'overwhite',
                                    'N': 'keyword',
                                    '@default': 'invalid'
                                }
                            }, {
                                cases: {//10-11
                                    ' {2}': 'overwhite',
                                    '[0-9][0-9]': 'type',
                                    'K[A-N]': 'type',
                                    'K[P-Y]': 'type',
                                    'L[0-9]': 'type',
                                    '(LR|MR|RT)': 'type',
                                    'H[1-9]': 'type',
                                    'U[1-8]': 'type',
                                    '(O[A-G]|OV)': 'type',
                                    '@default': 'invalid'
                                }
                            }, {
                                cases: {//12
                                    ' ': 'overwhite',
                                    'N': 'keyword',
                                    '@default': 'invalid'
                                }
                            }, {
                                cases: {//13-14
                                    ' {2}': 'overwhite',
                                    '[0-9][0-9]': 'type',
                                    'K[A-N]': 'type',
                                    'K[P-Y]': 'type',
                                    'L[0-9]': 'type',
                                    '(LR|MR|RT)': 'type',
                                    'H[1-9]': 'type',
                                    'U[1-8]': 'type',
                                    '(O[A-G]|OV)': 'type',
                                    '@default': 'invalid'
                                }
                            }, {
                                cases: {//15
                                    ' ': 'overwhite',
                                    'N': 'keyword',
                                    '@default': 'invalid'
                                }
                            }, {
                                cases: {//16-17
                                    ' {2}': 'overwhite',
                                    '[0-9][0-9]': 'type',
                                    'K[A-N]': 'type',
                                    'K[P-Y]': 'type',
                                    'L[0-9]': 'type',
                                    '(LR|MR|RT)': 'type',
                                    'H[1-9]': 'type',
                                    'U[1-8]': 'type',
                                    '(O[A-G]|OV)': 'type',
                                    '@default': 'invalid'
                                }
                            }, {//18-27
                                cases: {
                                    '[0-9].*.*': 'number',
                                    '@RPG400_Constants': 'predefined',
                                    '@RPG400_Constants_NUM': 'number',
                                    '[\*](OFF|ON).*': 'type',
                                    '[\*]IN[0-9][0-9].*': 'type',
                                    '[\*].*': 'predefined',
                                    "'.*'.*": 'string',
                                    '.*[,].*': 'variable',
                                    '@default': 'identifier'
                                }
                            }, 'support', {//28-32
                                cases: {//control
                                    '@OperatorOpen': { token: 'constant', bracket: '@open' },
                                    '@OperatorClose': { token: 'constant', bracket: '@close' },
                                    '@OperatorOther': 'constant',
                                    '@SubroutineOpen': { token: 'constant', bracket: '@open' },
                                    '@SubroutineClose': { token: 'constant', bracket: '@close' },
                                    '@SubroutineOther': 'constant',
                                    '@Arrays': 'keyword',
                                    '@BitOrders': 'keyword',
                                    '@CallOrder': 'keyword',
                                    '@DataFields': 'keyword',
                                    '@Declarations': 'keyword',
                                    '@FlagOrders': 'keyword',
                                    '@Information': 'keyword',
                                    '@Initializes': 'keyword',
                                    '@Arithmetics': 'regexp',
                                    '@StringOrders': 'regexp',
                                    '@ZoneTransfers': 'regexp',
                                    '@FileIOs': 'entity',
                                    '@FilePreIOs': 'storage',

                                    '@default': 'invalid'
                                },
                            }, {// 33-42
                                cases: {
                                    '[0-9].*.*': 'number',
                                    '@RPG400_Constants': 'predefined',
                                    '@RPG400_Constants_NUM': 'number',
                                    '[\*](OFF|ON).*': 'type',
                                    '[\*].*': 'string',
                                    "'.*'.*": 'string',
                                    '.*[,].*': 'variable',
                                    '@default': 'identifier'
                                }
                            }, {//43-48
                                cases: {
                                    '[\*].*': 'string',
                                    '.*[,].*': 'variable',
                                    '@default': 'identifier'
                                }
                            }, {//49-51
                                cases: {
                                    ' {3}': 'overwhite',
                                    '[1-2][0-9][0-9]': 'constant.numeric',
                                    ' [0-9][0-9]': 'constant.numeric',
                                    '  [0-9]': 'constant.numeric',
                                    '@default': 'invalid'
                                }
                            }, {//52
                                cases: {
                                    ' ': 'overwhite',
                                    '[0-9]': 'constant',
                                    '@default': 'invalid'
                                }
                            }, {//53
                                cases: {
                                    ' ': 'overwhite',
                                    '(H|N|P)': 'type',
                                    '@default': 'invalid'
                                }
                            }, {//54-55
                                cases: {
                                    ' {2}': 'overwhite',
                                    '[0-9][0-9]': 'type',
                                    'K[A-N]': 'type',
                                    'K[P-Y]': 'type',
                                    'L[0-9]': 'type',
                                    '(LR|MR|RT)': 'type',
                                    'H[1-9]': 'type',
                                    'U[1-8]': 'type',
                                    '(O[A-G]|OV)': 'type',
                                    '@default': 'invalid'
                                }
                            }, {//56-57
                                cases: {
                                    ' {2}': 'overwhite',
                                    '[0-9][0-9]': 'type',
                                    'K[A-N]': 'type',
                                    'K[P-Y]': 'type',
                                    'L[0-9]': 'type',
                                    '(LR|MR|RT)': 'type',
                                    'H[1-9]': 'type',
                                    'U[1-8]': 'type',
                                    '(O[A-G]|OV)': 'type',
                                    '@default': 'invalid'
                                }
                            }, {//58-59
                                cases: {
                                    ' {2}': 'overwhite',
                                    '[0-9][0-9]': 'type',
                                    'K[A-N]': 'type',
                                    'K[P-Y]': 'type',
                                    'L[0-9]': 'type',
                                    '(LR|MR|RT)': 'type',
                                    'H[1-9]': 'type',
                                    'U[1-8]': 'type',
                                    '(O[A-G]|OV)': 'type',
                                    '@default': 'invalid'
                                }
                            }, 'comment', ''
                        ]
                    ],
                    [/^(.{1,5})(O)(.{1,7})(.)(.)(.)(.)(.)(.{1,2})(.{1,2})(.{1,9})(.{1,6})( {37,37})(.*)$/,
                        ['', 'tag', 'constant',
                            {
                                cases: {
                                    '(A|O)': 'type',
                                    '@default': 'invalid'
                                }
                            }, {
                                cases: {
                                    '(H|D|T|E)': 'keyword',
                                    '(N|R)': 'type',
                                    '@default': 'invalid'
                                }
                            }, {
                                cases: {
                                    '( |F|R)': 'type',
                                    '(A|D)': 'type',
                                    '@default': 'invalid'
                                }
                            }, {
                                cases: {
                                    '[0-3]': 'number',
                                    '(D|E)': 'type',
                                    '@default': 'invalid'
                                }
                            }, {
                                cases: {
                                    '[0-3]': 'number',
                                    '(D|L)': 'type',
                                    '@default': 'invalid'
                                },
                            }, {
                                cases: {
                                    '[0-9][0-9]': 'number',
                                    'A[0-9]': 'number',
                                    'B[0-2]': 'number',
                                    '@default': 'invalid'
                                },
                            }, {
                                cases: {
                                    '[0-9][0-9]': 'number',
                                    'A[0-9]': 'number',
                                    'B[0-2]': 'number',
                                    '@default': 'invalid'
                                },
                            }, 'type', 'identifier', 'overwhite', 'comment'
                        ]
                    ],
                    [/^(.{1,5})(O)( {16,16})(.{1,9})(.{1,6})(.)(.)(.{1,4})(.)(.{1,26})(.{1,4})(.{1,5})(.*)$/,
                        ['', 'tag', 'overwhite', 'type',
                            {
                                cases: {
                                    '(UDATE |[\*]DATE |UDAY  |[\*]DAY  |UMONTH|[\*]MONTH|UYEAR |[\*]YEAR )': 'predefined',
                                    '(PAGE  |PAGE[1-7] )': 'number',
                                    '.*[,].*': 'variable',
                                    '@default': 'identifier'
                                }
                            }, {
                                cases: {
                                    ' ': 'overwhite',
                                    '[1-9]': 'keyword',
                                    '([A-D]|[J-Q]|[X-Z])': 'keyword',
                                    '@default': 'invalid'
                                }
                            }, {
                                cases: {
                                    ' ': 'overwhite',
                                    'B': 'constant',
                                    '@default': 'invalid'
                                }
                            }, {
                                cases: {
                                    ' {1,4}[0-9]{1,4}': 'number',
                                    '  K[1-8]': 'number',
                                    '@default': 'invalid'
                                },
                            }, {
                                cases: {
                                    '(P|B|L|R)': 'type',
                                    ' ': 'overwhite',
                                    '@default': 'invalid'
                                },
                            }, {
                                cases: {
                                    "'.*'.*": 'string',
                                    '.*[,].*': 'variable',
                                    '@default': 'identifier'
                                },
                            }, 'invalid', 'comment', 'invalid'
                        ]
                    ],
                ],
            },

        }
    );
}