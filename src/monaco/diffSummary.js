// 差分エディタの左上に、差分の状態(比較中/差分なし/差分あり)と行数を表示する。
// HTML は変えずに、Monaco の OverlayWidget として左側(original)エディタの上に載せる。
//   - 比較中 : setModel 直後で、まだ差分の計算結果がない(getLineChanges() が null)
//   - 差分なし: 計算結果が空
//   - 差分あり: 差分ブロック数と、追加(右側)・削除(左側)の行数を表示し、▲▼ で前後の差分へ移動する
// 検索ボックスと同じように、右クリックメニューかショートカットキーで表示/非表示を切り替える。
// 最初は非表示で、開いたら閉じるまで(ソースを切り替えても)表示したままにする。状態は保存しない

import * as monaco from 'monaco-editor';

// 表示中は、バッジの高さぶんエディタの上に余白を作る(1行目と重ならないように)
const PADDING_TOP = 26;

// getLineChanges() の結果から、差分ブロック数と追加・削除の行数を数える。
// 片側の End が 0 のときは、その側に行がない(純粋な追加/削除)
export const summarizeLineChanges = (changes) => {
    let added = 0;
    let removed = 0;
    for (const c of changes) {
        if (c.modifiedEndLineNumber > 0) {
            added += c.modifiedEndLineNumber - c.modifiedStartLineNumber + 1;
        }
        if (c.originalEndLineNumber > 0) {
            removed += c.originalEndLineNumber - c.originalStartLineNumber + 1;
        }
    }
    return { blocks: changes.length, added, removed };
};

export const initDiffSummary = (diffEditor) => {
    const node = document.createElement('div');
    node.className = 'diff-summary';

    const label = document.createElement('span');
    label.className = 'diff-summary-label';

    const createButton = (text, title, onClick) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'diff-summary-button';
        button.textContent = text;
        button.title = title;
        button.addEventListener('click', onClick);
        return button;
    };
    const createNavButton = (text, title, target) => createButton(text, title, () => {
        diffEditor.goToDiff(target);
        diffEditor.getModifiedEditor().focus();
    });
    const prevButton = createNavButton('▲', '前の差分', 'previous');
    const nextButton = createNavButton('▼', '次の差分', 'next');

    const closeButton = createButton('×', '閉じる (Ctrl+Shift+D)', () => setVisible(false));
    closeButton.classList.add('diff-summary-close');

    node.append(label, prevButton, nextButton, closeButton);

    const widget = {
        getId: () => 'damco.diffSummary',
        getDomNode: () => node,
        getPosition: () => ({ preference: { top: 0, left: 0 } }),
    };

    // 左右に並べているときは左側(original)の左上に出す。
    // インライン表示(設定で切り替え、または幅が狭いと自動で切り替わる)では左側のエディタが行番号の幅しかないので、右側(modified)に移す
    const originalEditor = diffEditor.getOriginalEditor();
    const modifiedEditor = diffEditor.getModifiedEditor();
    let hostEditor = null;
    const updateHostEditor = () => {
        const layout = originalEditor.getLayoutInfo();
        const isInline = layout.contentLeft >= layout.width;
        const nextHost = isInline ? modifiedEditor : originalEditor;
        if (nextHost === hostEditor) {
            return;
        }
        hostEditor?.removeOverlayWidget(widget);
        nextHost.addOverlayWidget(widget);
        hostEditor = nextHost;
    };
    updateHostEditor();
    originalEditor.onDidLayoutChange(updateHostEditor);

    const render = () => {
        // モデルが片側でも未設定のときは、比べるものがないので出さない
        const model = diffEditor.getModel();
        if (model === null || model.original === null || model.modified === null) {
            node.dataset.state = 'empty';
            return;
        }

        const changes = diffEditor.getLineChanges();
        let hasDiff = false;
        if (changes === null) {
            node.dataset.state = 'computing';
            label.textContent = '比較中…';
        } else {
            const { blocks, added, removed } = summarizeLineChanges(changes);
            hasDiff = blocks > 0;
            node.dataset.state = hasDiff ? 'changed' : 'none';
            label.textContent = hasDiff ? `差分 ${blocks}箇所  +${added} / −${removed}` : '差分なし';
        }
        prevButton.disabled = !hasDiff;
        nextButton.disabled = !hasDiff;
    };

    // ソースを切り替えると Monaco は差分の計算をやり直す(途中の計算はキャンセルされる)。
    // 結果が出るまでは getLineChanges() が null なので「比較中…」になる
    diffEditor.onDidChangeModel(render);
    diffEditor.onDidUpdateDiff(render);

    // スクロールして 1 行目より下を見ているときは本文と重なるので、薄くする
    // (左右のスクロールは同期しているので、インライン表示でも使う右側で見る)
    modifiedEditor.onDidScrollChange((e) => {
        node.classList.toggle('diff-summary-scrolled', e.scrollTop > 0);
    });

    let visible = false;
    const setVisible = (value) => {
        visible = value;
        node.classList.toggle('diff-summary-hidden', !visible);
        diffEditor.updateOptions({ padding: { top: visible ? PADDING_TOP : 0 } });
    };

    // 右クリックメニューとショートカットキー(左右どちらのエディタでも使えるようにする)
    for (const editor of [originalEditor, modifiedEditor]) {
        editor.addAction({
            id: 'damco.toggleDiffSummary',
            label: '差分の概要を表示/非表示',
            keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyD],
            contextMenuGroupId: 'navigation',
            contextMenuOrder: 0,
            run: () => setVisible(!visible),
        });
    }

    setVisible(false);
    render();
};
