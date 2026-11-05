# 窓旅

日本各地のYouTubeライブカメラを、PC作業中のそばに流すWebアプリです。個人用のコレクションに動画URLを保存し、そのまま連続視聴できます。

- 公開サイト: https://madotabi.vercel.app
- URL追加: https://madotabi.vercel.app/?view=add

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

通常は http://localhost:3000 を開きます。環境変数がない場合、接続の準備中と表示します。secret key・service_role・YouTube APIキーは不要です。

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
│   ├── page.tsx                # ログイン・視聴・URL追加の入口
│   ├── admin/                  # 旧URLからトップへのリダイレクト
│   ├── watch/[videoId]/        # 動画単体の視聴
│   ├── api/health/             # DB接続確認
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── admin/                  # 認証・URL保存・個人用コレクション
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
- 景色リストの「上へ・下へ」による並び替えと順序保存、復元可能な削除、タイトル・メモの編集
- 「景色を見る」「景色リスト」の切替。保存成功後は追加した動画から再生
- 登録した動画の選択・前後移動・自動切替・停止/再開
- ミュート開始。通常は操作バーを非表示にし、必要時に表示して音声・画質・全画面を操作
- 埋め込み禁止などのエラー案内、再試行、YouTubeへの外部リンク
- 動画を中心にした、通常のPC・スマートフォン画面でページスクロール不要のダークテーマ
- 動画の下にタイトル・位置未登録・天気未取得を表示する情報帯。流れる表示の固定・再開に対応

保存した動画はログイン後に視聴します。公開操作は画面からなくしました。既存の認証・RLS・DBデータは維持し、匿名利用者に候補一覧やメモを公開しません。配信のライブ状態は自動判定せず、所在地や天気も推測しません。初期サンプルの架空動画IDを配信として登録していません。

## 手順と設計

- [公開・DB基盤](docs/infrastructure.md)
- [初回登録・認証・アクセス制御](docs/admin.md)
- [動画の視聴・検証記録](docs/playback.md)

## 今後の実装予定

全国ランダム、localStorageによる設定保存、所在地の編集、地図、Open-Meteoの天気、radiko/YouTube BGMリンク、情報パネル開閉。

## 検証と注意点

Node.js 22で`npm run check`（32テスト）と`npm run build`が成功しています。実際の登録済み5動画で再生中状態、スマホ幅で横はみ出しがないことを確認しました。配信者の設定変更や終了により、その後再生できなくなる場合があります。

ESLint 9.39.5にはサポート終了警告があります。現時点のNext.js配下のプラグインと整合する版を使用しています。開発用のESLint系依存には既知の中程度の脆弱性報告が残っており、上流の対応を確認して更新する方針です。

## 動画の自動切替

[登録動画の連続視聴](https://madotabi.vercel.app)では、登録した動画を自分だけで順番に視聴できます。初期値は1分、10秒〜60秒の範囲で10秒刻みで間隔を選択できます。自動切替の停止/再開、前後移動、手動選択に対応しています。プレーヤーを再利用し、再生中の時間だけを数えるため、読み込み中や一時停止中に次へ進みません。切替時のタイトル演出は省き、同じiframeで直ちに次の動画を読み込みます。カウントダウンは表示しません。

登録動画が2件以上ある場合に自動切替できます。単体視聴ページは1本のみです。仕様・検証は[自動切替の手順](docs/rotation.md)を参照してください。依存ライブラリやDBスキーマは追加していません。
