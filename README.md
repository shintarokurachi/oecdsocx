# OECD社会支出データベース インタラクティブ・エクスプローラ

OECD Social Expenditure Database (SOCX) を日本語で操作できるインタラクティブな可視化ツールです。14カ国の社会支出（対GDP比）を分野別・年次別・給付形態別（現金給付/現物給付）に比較・分析できます。

## 機能

- **📊 国別比較**: 9分野の社会支出を積み上げ棒グラフで国際比較
- **📈 時系列推移**: 2005〜2021年の各国のトレンドを比較
- **🕸️ レーダーチャート**: 各国の福祉供給構造の「形」を可視化
- **💰 現金vs現物**: 現金給付と現物給付の構成比を比較し、福祉レジームの違いを分析
- **📋 データ表 + Excelダウンロード**: 選択した国・年次のデータを3シート構成のxlsxファイルとして出力

## 収録国

日本、デンマーク、スウェーデン、フィンランド、ノルウェー、フランス、ドイツ、イギリス、アメリカ、韓国、イタリア、カナダ、オランダ、OECD平均

## データについて

データは [OECD Data Explorer](https://data-explorer.oecd.org) の Social expenditure aggregates (DSD_SOCX_AGG) データセットから抽出した実数値です。指標は「公的社会支出（Public Social Expenditure）の対GDP比（%）」。

分類はOECD SOCXの9分野区分（高齢、遺族、障害・業務災害・傷病、保健、家族、積極的労働市場政策、失業、住宅、その他）に準拠しています。

現金給付（cash benefits）と現物給付（benefits in kind）の区分はSOCXの spending type 分類に基づく実数値で、分野によっては片方のみが存在します（例: 保健は全額現物、失業はほぼ全額現金、ALMPは内訳区分なし）。

## 使い方

### ブラウザで開く

`index.html` をそのままブラウザで開けば動作します。ビルドやインストールは不要です。

### GitHub Pagesで公開する

1. このリポジトリをフォーク
2. リポジトリの Settings → Pages
3. Source を `main` ブランチの `/ (root)` に設定
4. `https://<username>.github.io/<repo-name>/` でアクセス可能

### ローカルで試す

```bash
# 任意のHTTPサーバで配信（例: Python 3）
python3 -m http.server 8000
# ブラウザで http://localhost:8000 を開く
```

## 技術スタック

- React 18 (CDN経由、ビルド不要)
- Recharts 2.15 (チャート描画)
- SheetJS 0.18 (xlsxエクスポート)
- Babel Standalone (ブラウザ内JSXトランスパイル)

## データ更新

OECD.Statから最新データをダウンロードして差し替える場合、`index.html` 内の `RAW_DATA` 定数を置き換えてください。各国・各年のデータは `{t: [9values], c: [9values], k: [9values]}` の形式で、配列の順序は `CATEGORIES` と一致させる必要があります。

## ライセンス

### コード

MIT License — 自由に利用・改変・再配布できます。

### データ

OECD Terms and Conditions に準拠。OECDデータの再利用には出典の明示が必要です:

> Source: OECD (2024), Social Expenditure Database (SOCX), https://www.oecd.org/social/expenditure.htm

## 作者

倉地真太郎 (Shintaro Kurachi) — 明治大学政治経済学部准教授／Roskilde University Visiting Researcher

Built collaboratively with Claude (Anthropic).
