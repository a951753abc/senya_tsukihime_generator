# 資料格式

## 角色卡 schema（v2.0）

完整 JSON Schema：[`data/schema/character.json`](../data/schema/character.json)

### 區塊概覽

| 區塊 | 對應 v3 設計 |
|---|---|
| `meta` | 姓名 / 讀み / 玩家 / campaign / 朱印 / 時戳 |
| `personal` | 種族 / 地域社會 / 年齡 / 性別 / 外貌 |
| `progression` | 角色等級 / 剩餘經驗 / 初始級別 |
| `classes[]` | 多重級別槽（最多 4，第一個 = 主） |
| `styles[]` | 風格清單（連動分類／背反律／代償／獲得感情） |
| `stats.abilities` | 4 屬性 × 5 欄分解（基礎/級1/級2/級3/特殊） |
| `stats.elements` | 五大屬性（地水火風空） |
| `stats.elementsExtra[]` | 例外屬性（劇本／流派專用） |
| `skills` | equipped / common / infiniteDestruction 三組 |
| `items` | tier1to3 / tier4to6 / tier7to9 三階 |
| `relationships[]` | 角色關係（28 感情 + tone：pure/crazy + bond） |
| `setting` | 4 區塊自由文字（背景／性格／來歷／自由筆記） |
| `session` | sessionNum / loopCurrent / loopTotal / 時戳 |

### 派生欄位（不入庫，由 `js/derive.js` 即時算）

- `stats.abilities.<x>.sum` = `base + mod1 + mod2 + mod3 + special`
- `derived.hp`、`derived.tp`、`derived.combat.{melee,ranged,psychic,action}`、`derived.defense`
- `relationships` 合計：`bondTotal`、`pureSum`、`crazySum`

### 欄位設計規則

1. **空值 vs null**：字串欄位用 `""`、數字 `0`、陣列 `[]`，`null` 僅用於 `level.id`、時戳未設。
2. **`schemaVersion`**：寫死 `"2.0"`，未來破壞性變更才 bump 並寫 migration。
3. **`additionalProperties: false`**：所有 object 鎖定欄位，避免汙染 schema。
4. **派生欄位不入 JSON**：避免一致性問題；序列化時也不寫進匯出 JSON。

## 級別 metadata

[`data/meta.json`](../data/meta.json) — 14 級別（基本 7 + 進階 7）+ 5 元素 + 4 屬性 + 4 風格大類

級別 id 對應 [`a951753abc/senya_tsukihime`](https://github.com/a951753abc/senya_tsukihime) repo 的 PHP 檔名（如 `kenshi.php` ↔ `id: kenshi`）。

## 級別資料（per-level）

每個級別獨立 JSON：`data/levels/<id>.json`（Phase 1 後續產出）

每份含：基礎能力值、初期特技、升級規則、級別修正表（10 級）、一般／額外特技清單。

由 `tools/parse_php.py` 從 senya_tsukihime PHP 抽出草稿，人工校對後落入 `data/levels/`。

## LocalStorage

| Key | 內容 |
|---|---|
| `senya-generator-state-v2` | `{ schemaVersion: "2.0", cards: [...], activeCardId: string\|null }` |

schemaVersion 不符時 store 會 fallback 到空狀態（不嘗試 migrate）。需要保留舊版資料時，使用者手動匯出 JSON 即可。
