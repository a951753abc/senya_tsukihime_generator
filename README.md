# 千夜月姬 TRPG 角色產生器

純前端線上角色產生器。資料來自 [a951753abc/senya_tsukihime](https://github.com/a951753abc/senya_tsukihime) 規則 repo。

## 開發
- 直接開 `index.html` 即可（無 build step）
- 跑前端測試：`npm test`（vitest）
- 跑 parser：`cd tools && python parse_php.py ../../senya_tsukihime ../data/levels-raw`

## 部署
GitHub Actions auto-deploy 到 GitHub Pages。每次 push 到 master 觸發。
