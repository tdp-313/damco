export const dds_token = () => {
    return ({
        keywords: [
            'PFILE'
        ],
        tokenizer: {
            root: [
                [/^.{6}\*.*/, { token: 'comment' }],
                //     |       |       |  |   |         
                          //6  7  8    9-10  11 12-13  14 15-16    17-18   19-28   29  30-34
                [/^(.{1,5})(A)(.)(.)(.{1,2})(.)(.{1,2})(.)(.{1,2})(.{1,2})(.{1,9})(.)(.{1,4})(.{1,2})(.)(.)(.)(.)(.{1,3})(.{1,3})/, [
                    '', 'tag', {
                        cases: {
                            '(A|O)': 'entity',
                            ' ': 'overwhite',
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
                    }, 'keyword', 'identifier', 'overwhite','' ,'constant.numeric', 'type', '', 'constant', '', 'number', 'number',
                ]],
                [/[A-Z_$][\w$]*/, {
                    cases: {
                        '@keywords': 'storage',
                        '@default': 'identifier'
                    }
                }],
                // strings
                [/'([^'\\]|\\.)*$/, 'string.invalid'],  // non-teminated string
                [/'/, { token: 'string.quote', bracket: '@open', next: '@string' }],
                [/[{}()\[\]]/, '@brackets'],

            ],
            string: [
                [/[^\\']+/, 'string'],
                //[/@escapes/, 'string.escape'],
                [/\\./, 'string.escape.invalid'],
                [/'/, { token: 'string.quote', bracket: '@close', next: '@pop' }]
            ],
        },
    });
}
