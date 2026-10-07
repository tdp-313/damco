// Monaco の Monarch(色分けの定義)を Monaco なしで動かす小さな実行系。
// src/monaco/lang/syntax/*.js の定義をそのまま使い、VS Code 拡張機能の色分け(Semantic Tokens)に使う。
//
// 対応している書き方(damco の定義で使っているもの)
//   - [regex, action] / [regex, action, next] / { include: '@state' }
//   - action: 文字列 / グループごとの配列 / { token, next, cases, bracket }
//   - cases: '@配列名'(含まれるか)、'@default'、それ以外は正規表現(全体一致)
//   - next: '@pop' / '@push' / '@popall' / '@状態名'
//   - ignoreCase、defaultToken、正規表現の中の @属性名
//   - '^' で始まる規則は行頭でだけ使う

const escapeRegExpSource = (value) => (value instanceof RegExp ? value.source : String(value));

const compileRegExp = (lexer, source) => {
    // 正規表現の中の @属性名 を属性の中身に置き換える
    return source.replace(/@(\w+)/g, (all, name) => {
        const attr = lexer.attributes[name];
        if (typeof attr === 'string' || attr instanceof RegExp) {
            return escapeRegExpSource(attr);
        }
        return all;
    });
};

const createGuard = (lexer, key) => {
    if (key === '@default' || key === '@') {
        return () => true;
    }
    if (key.startsWith('@')) {
        const words = lexer.attributes[key.substring(1)];
        if (Array.isArray(words)) {
            const set = new Set(lexer.ignoreCase ? words.map((w) => String(w).toLowerCase()) : words.map(String));
            return (text) => set.has(lexer.ignoreCase ? text.toLowerCase() : text);
        }
        return () => false;
    }
    const regex = new RegExp('^(?:' + compileRegExp(lexer, key) + ')$', lexer.ignoreCase ? 'i' : '');
    return (text) => regex.test(text);
};

const compileAction = (lexer, action) => {
    if (action === undefined || action === null) {
        return { token: '' };
    }
    if (typeof action === 'string') {
        return { token: action === '@brackets' ? 'delimiter' : action };
    }
    if (Array.isArray(action)) {
        return { group: action.map((a) => compileAction(lexer, a)) };
    }
    const compiled = {};
    if (action.token !== undefined) {
        compiled.token = action.token === '@brackets' ? 'delimiter' : action.token;
    }
    if (action.next !== undefined) {
        compiled.next = action.next;
    }
    if (action.cases) {
        compiled.cases = Object.entries(action.cases).map(([key, value]) => ({ guard: createGuard(lexer, key), action: compileAction(lexer, value) }));
    }
    return compiled;
};

export const compileMonarch = (definition) => {
    const lexer = {
        ignoreCase: !!definition.ignoreCase,
        defaultToken: definition.defaultToken === undefined ? 'source' : definition.defaultToken,
        attributes: definition,
        states: {},
    };
    const tokenizer = definition.tokenizer;
    const compileState = (name, visiting) => {
        if (lexer.states[name]) {
            return lexer.states[name];
        }
        if (visiting.has(name)) {
            return [];
        }
        visiting.add(name);
        const rules = [];
        for (const rule of tokenizer[name] || []) {
            if (rule && !Array.isArray(rule) && rule.include) {
                const target = rule.include.replace(/^@/, '');
                rules.push(...compileState(target, visiting));
                continue;
            }
            const [regex, action, next] = Array.isArray(rule) ? rule : [rule.regex, rule.action];
            const source = compileRegExp(lexer, escapeRegExpSource(regex));
            const compiled = compileAction(lexer, action);
            if (next !== undefined) {
                compiled.next = next;
            }
            rules.push({
                regex: new RegExp('^(?:' + source + ')', lexer.ignoreCase ? 'i' : ''),
                lineStartOnly: source.startsWith('^'),
                action: compiled,
            });
        }
        visiting.delete(name);
        lexer.states[name] = rules;
        return rules;
    };
    for (const name of Object.keys(tokenizer)) {
        compileState(name, new Set());
    }
    lexer.start = Object.keys(tokenizer)[0];
    return lexer;
};

// cases を評価して、実際に使う action を決める
const resolveAction = (action, text) => {
    let current = action;
    while (current && current.cases) {
        const hit = current.cases.find((c) => c.guard(text));
        if (!hit) {
            return { token: current.token === undefined ? '' : current.token, next: current.next };
        }
        const next = current.next;
        current = hit.action;
        if (next !== undefined && current.next === undefined) {
            current = Object.assign({}, current, { next });
        }
    }
    return current || { token: '' };
};

const applyNext = (stack, next) => {
    if (next === undefined) {
        return stack;
    }
    if (next === '@pop') {
        return stack.length > 1 ? stack.slice(0, -1) : stack;
    }
    if (next === '@popall') {
        return stack.slice(0, 1);
    }
    if (next === '@push') {
        return [...stack, stack[stack.length - 1]];
    }
    return [...stack, next.replace(/^@/, '')];
};

// 1 行を色分けする。state は前の行の終わりの状態(最初の行は null)
// 戻り値: { tokens: [{ start, length, token }], state }
export const tokenizeLine = (lexer, line, state) => {
    let stack = state || [lexer.start];
    const tokens = [];
    const push = (start, length, token) => {
        if (length <= 0) {
            return;
        }
        const last = tokens[tokens.length - 1];
        if (last && last.token === token && last.start + last.length === start) {
            last.length += length;
        } else {
            tokens.push({ start, length, token });
        }
    };
    let pos = 0;
    let guard = 0;
    while (pos < line.length && guard++ < 100000) {
        const rules = lexer.states[stack[stack.length - 1]] || [];
        const rest = line.substring(pos);
        let matched = false;
        for (const rule of rules) {
            if (rule.lineStartOnly && pos !== 0) {
                continue;
            }
            const m = rule.regex.exec(rest);
            if (!m) {
                continue;
            }
            const text = m[0];
            if (rule.action.group) {
                let offset = pos;
                let next;
                for (let g = 0; g < rule.action.group.length; g++) {
                    const groupText = m[g + 1] === undefined ? '' : m[g + 1];
                    const action = resolveAction(rule.action.group[g], groupText);
                    push(offset, groupText.length, action.token);
                    offset += groupText.length;
                    if (action.next !== undefined) {
                        next = action.next;
                    }
                }
                const newStack = applyNext(stack, next !== undefined ? next : rule.action.next);
                if (text.length === 0 && newStack === stack) {
                    continue;
                }
                stack = newStack;
            } else {
                const action = resolveAction(rule.action, text);
                const newStack = applyNext(stack, action.next);
                if (text.length === 0 && newStack === stack) {
                    continue;
                }
                push(pos, text.length, action.token);
                stack = newStack;
            }
            pos += text.length;
            matched = true;
            break;
        }
        if (!matched) {
            push(pos, 1, lexer.defaultToken);
            pos++;
        }
    }
    return { tokens, state: stack };
};

// 複数行をまとめて色分けする。戻り値は行ごとのトークンの配列
export const tokenizeLines = (lexer, lines) => {
    let state = null;
    return lines.map((line) => {
        const result = tokenizeLine(lexer, line, state);
        state = result.state;
        return result.tokens;
    });
};

// 固定形式のソース用。Web 版は表示の前に各行を 80 桁まで空白で埋める(text_extend.js の addSpaces)ので、
// 色分けの定義(.{1,10} などの欄)もそれを前提にしている。同じように埋めてから色分けし、元の行の長さで切る
export const tokenizeFixedLines = (lexer, lines, width = 80) => {
    const padded = lines.map((line) => (line.length < width ? line + ' '.repeat(width - line.length) : line));
    return tokenizeLines(lexer, padded).map((tokens, i) => {
        const length = lines[i].length;
        return tokens
            .filter((t) => t.start < length)
            .map((t) => (t.start + t.length > length ? Object.assign({}, t, { length: length - t.start }) : t));
    });
};
