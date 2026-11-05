# 窓旅

日本各地のYouTubeライブカメラを、PC作業中のそばに流すWebアプリです。管理画面で動画URLを保存・プレビューし、選んで公開した動画をトップページで視聴できます。

- 公開サイト: https://madotabi.vercel.app
- 管理画面: https://madotabi.vercel.app/admin

## 使用技術

Next.js 16.4.4（App Router / src構成）、React 19、TypeScript、Tailwind CSS v4、ESLint、npm、Supabase（Auth・Postgres）、YouTube IFrame Player API。VercelのGit連携でデプロイします。

状態管理・UI・テストフレームワーク、YouTube/Open-Meteo用SDKは導入していません。認証とセッション更新にはSupabase公式SDKを使用します。

## ローカル起動

Node.js 22.xとnpmが必要です。nvmの場合は`nvm install`、`nvm use`で切り替えます。

```sh
npm ci
cp .env.example .env.local # 初回のみ。既存ファイルを上書きしないこと
# .env.local にSupabase URLとpublishable keyを設定
npm run dev
```

通常は http://localhost:3000 を開きます。環境変数がない場合、公開カタログを読み込めない旨を表示します。secret key・service_role・YouTube APIキーは不要です。

```sh
npm run check      # ESLint・型生成/型チェック・Node.js標準テスト
npm run lint
npm run typecheck
npm test
npm run build
npm start          # 本番ビルド後に起動
```

## ディレクトリ構成

```text
src/
├── app/
│   ├── page.tsx                # 公開動画を取得
│   ├── admin/                  # 管理画面
│   ├── watch/[videoId]/        # 動画単体の視聴
│   ├── api/health/             # DB接続確認
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── admin/                  # 認証・URL保存・プレビュー・公開切替
│   ├── player/                 # プレーヤーと動画選択
│   ├── layout/
│   ├── camera/
│   ├── map/
│   └── weather/
├── lib/                        # URL解析・YouTube API・認証クライアント
├── types/                      # LiveCamera・再生用CameraVideo
└── data/cameras.ts             # 初期構築時のサンプル。現在の画面では使用しない
supabase/migrations/            # DB定義とRLS
tests/                        # URL・プレーヤー設定の標準テスト
```

## 現在できること

- メール確認済みの管理者によるログインとYouTube URL保存（タイトル・メモは任意）
- URL形式の確認・正規化・動画IDの重複防止
- 保存した動画の管理画面内プレビューと単体視聴
- 管理者が明示的に公開した動画の、トップページでの選択・前後移動・再生
- ミュート開始、音声・再生・全画面はYouTube標準コントロールを利用
- 埋め込み禁止などのエラー案内、再試行、YouTubeへの外部リンク
- PC横並び・モバイル縦並びのダークテーマ

保存するのは未確認の登録候補です。保存だけでは公開されず、メモと管理者情報は公開カタログに含めません。配信のライブ状態は自動判定せず、所在地や天気も推測しません。初期サンプルの架空動画IDを配信として登録していません。

## 手順と設計

- [公開・DB基盤](docs/infrastructure.md)
- [管理画面の初回登録・認証・アクセス制御](docs/admin.md)
- [動画の視聴・公開・検証記録](docs/playback.md)

## 今後の実装予定

全国ランダム、localStorageによる設定保存、所在地の編集、地図、Open-Meteoの天気、radiko/YouTube BGMリンク、情報パネル開閉。

## 検証と注意点

Node.js 22で`npm run check`（30テスト）と`npm run build`が成功しています。実際の登録済み5動画で再生中状態、スマホ幅で横はみ出しがないことを確認しました。配信者の設定変更や終了により、その後再生できなくなる場合があります。

ESLint 9.39.5にはサポート終了警告があります。現時点のNext.js配下のプラグインと整合する版を使用しています。開発用のESLint系依存には既知の中程度の脆弱性報告が残っており、上流の対応を確認して更新する方針です。

## 動画の自動切替

[登録動画の連続視聴](https://madotabi.vercel.app/admin/watch)では、公開していない動画も管理者だけで順番に視聴できます。初期値は1分、30秒・1分・3分・5分から間隔を選択できます。自動切替の停止/再開、前後移動、手動選択に対応しています。

トップページでも公開動画が2件以上あれば同じ自動切替を利用できます。単体視聴ページは1本のみです。仕様・検証は[自動切替の手順](docs/rotation.md)を参照してください。依存ライブラリやDBスキーマは追加していません。
