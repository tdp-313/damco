import { rpg_token } from "./syntax/rpg.js";
import { rpg_token2 } from "./syntax/rpg_indent.js";
import { dds_token } from "./syntax/dds.js";
import { cl_token } from "./syntax/cl.js";

import { regDefinition } from "./Provider/definition.js";
import { regReference } from "./Provider/reference.js";
import { regCodeLens } from "./Provider/codeLens.js";
import { regFolding } from "./Provider/folding.js";
import { regHover } from "./Provider/hover.js";
import * as monaco from 'monaco-editor';

export const monacoLang = async () => {
    monaco.languages.register({ id: 'rpg' });
    monaco.languages.register({ id: 'rpg-indent' });
    monaco.languages.register({ id: 'dds' });
    monaco.languages.register({ id: 'dsp' });
    monaco.languages.register({ id: 'cl' });

    monaco.languages.setLanguageConfiguration('dds', {
        // symbols used as brackets
        "brackets": [
            ["{", "}"],
            ["[", "]"],
            ["(", ")"]
        ],
        // symbols that that can be used to surround a selection
        "surroundingPairs": [
            ["{", "}"],
            ["[", "]"],
            ["(", ")"],
            ["\"", "\""],
            ["'", "'"]
        ]
    });

    monaco.languages.setLanguageConfiguration('cl', {
        // symbols used as brackets
        "brackets": [
            ["{", "}"],
            ["[", "]"],
            ["(", ")"]
        ],
        // symbols that that can be used to surround a selection
        "surroundingPairs": [
            ["{", "}"],
            ["[", "]"],
            ["(", ")"],
            ["\"", "\""],
            ["'", "'"]
        ],
        "comments": {
            "blockComment": ["/*", "*/"]
        }
    });
    monaco.languages.setLanguageConfiguration('rpg-indent', {
        indentSize: 2,
        useTabStops: false,
        brackets: [
            ['{', '}'],
        ],
    });

    monaco.languages.setMonarchTokensProvider('rpg', rpg_token());
    monaco.languages.setMonarchTokensProvider('rpg-indent', rpg_token2());
    monaco.languages.setMonarchTokensProvider('dds', dds_token());
    monaco.languages.setMonarchTokensProvider('cl', cl_token());

    const flag_regex = /\*IN[0-9][0-9]/;
    
    regDefinition();
    regReference();
    regFolding();
    regHover();
    regCodeLens();
}