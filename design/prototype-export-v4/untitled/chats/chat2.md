# 技能詳情展示

_Started 2026-05-08 05:37 UTC_

---

## User

GitHub connected

## Assistant

Hi! GitHub is connected — feel free to paste a github.com repository URL and I can explore the structure or import specific files (components, themes, assets) to use as reference for design work.

## User

https://github.com/a951753abc/senya_tsukihime_generator
這個專案的UIUX問題，左邊特技列表只看得到名稱跟分類，看不到詳細效果，必須點選後在中間慢慢找

## Assistant

_[tool: github_get_tree]_

_[tool: github_get_tree]_

_[tool: github_get_tree]_

_[tool: github_get_tree]_

_[tool: github_get_tree]_

_[tool: github_read_file]_

_[tool: github_read_file]_

_[tool: list_files]_

_[tool: read_file]_

_[tool: github_get_tree]_

_[tool: github_read_file]_

_[tool: github_read_file]_

_[tool: read_file]_

_[tool: snip]_

_[tool: show_html]_

_[tool: show_html]_

_[tool: save_screenshot]_

_[tool: view_image]_

_[tool: snip]_

_[tool: grep]_

_[tool: copy_files]_

_[tool: read_file]_

_[tool: snip]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

Now I'll redesign the left skill picker. Plan:

**The problem:** Each row shows only `name + category + cost`. To see what a skill actually does, you have to click it and read the centre column.

**The fix:** Make the left list self-contained.
1. **Always show a 2-line effect preview** under each row (the most important data, never hidden).
2. **Click row body → expands inline** with full effect, prereq, advanced/二段/追加 blocks — so you can read details without leaving the list.
3. **Equip ✓ split off to the right** as a separate target — viewing ≠ equipping.
4. **Hover preview side-card** for ultra-quick scan without committing to expand.
5. Tighter info hierarchy: cost as a badge, category as a coloured pill, prereq inline with mono accent.

Let me edit v4 to apply this.

_[tool: snip]_

Now replace the HTML body for the picker with new structure (effect previews + expanded states demo):

_[tool: str_replace_edit]_

_[tool: snip]_

Now add a small interactive script so the user can click to expand/collapse rows and click the ✓ to equip/un-equip. Also add a design-rationale annotation that floats over the left column so the user understands what changed.

_[tool: grep]_

_[tool: str_replace_edit]_

_[tool: snip]_

_[tool: done]_

_[tool: fork_verifier_agent]_

已完成 v4 主介面 — 左欄特技列表的 UX 重構：

**核心改動**
1. **每列固定顯示 2 行效果預覽**（`-webkit-line-clamp:2`）— 不點擊就能看出技能在做什麼
2. **點擊列展開** → 完整效果文字 + 二段條件 / 追加效果 / 情緒獎勵（在左欄就讀完，不必跳到中欄）
3. **「✓ 習得」與「展開查看」分為兩個動作** — 看不等於選
4. **分類顏色標記**：主動（朱）／反應（藍）／常時（金）一眼可分
5. **前提條件達成／未達成用顏色區分**（金色 = 已滿足，朱紅 = 尚未達成）
6. **Sticky 級別群組標題** + 主／副／共通角色徽章
7. **顯示密度切換器**（級別 / 分類 / 代價）+ 篩選 chip 含「未達條件」過濾
8. **底部圖例**標注三種類別色，避免顏色語意需要記憶

頁面右上有金色 callout 框列出 UX 改動點，可關閉。原 v3 檔案保留。

