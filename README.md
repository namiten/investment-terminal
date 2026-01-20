# 投資情報端末

日本株式市場における企業情報を検索・閲覧できるWebアプリケーションです。

## アクセス方法

GitHub Pagesでホスティングされています。以下のURLからアクセスできます：

https://[YOUR-USERNAME].github.io/investment-terminal/

## データについて

- 対象企業数: 3,788社（東証プライム・スタンダード・グロース）
- データ項目: 証券コード、企業名、業種分類、市場情報、決算情報など
- データソース: QUICK Qr1金融情報端末（2025年1月時点）

## 主な機能

- 企業検索（証券コード、企業名、略称、カナ）
- 企業詳細表示
- 業種別一覧
  - 東証33業種
  - 日経業種中分類
  - 日経業種小分類
  - FACTSET業種
- TOPIX構成銘柄のスクリーニング
- 決算発表カレンダー

## データ更新方法

企業データを更新する場合：

1. `../02_investment_tool/data/companies.csv`を最新データに更新
2. `create_public_csv_v2.py`を実行して公開版CSVを生成
3. 生成された`data/companies.csv`をコミット・プッシュ

```bash
python create_public_csv_v2.py
git add data/companies.csv
git commit -m "Update company data"
git push
```

## 技術スタック

- HTML5 / CSS3 / Vanilla JavaScript
- フレームワーク不使用
- クライアントサイドのみで完結

## 著作権について

株主情報、収益構成、為替感応度分析、四半期業績パターン分析、親子上場関係などの一部データは、著作権の関係から公開版では表示されません。
