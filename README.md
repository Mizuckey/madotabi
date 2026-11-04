# SORAMIRU

日本各地のYouTubeライブカメラを集約し、PCで作業しながら各地の風景を流せるWebアプリです。現在はMVPに向けた開発環境と画面の骨組みを実装しています。

## 使用技術

- Next.js（App Router / srcディレクトリ構成）
- React / TypeScript（strict）
- Tailwind CSS v4（PostCSS経由）
- ESLint（Next.js推奨ルール） / npm

初回構築時にnpmの`latest`から安定版を取得し、バージョンと依存解決結果を`package.json` / `package-lock.json`に固定しています。DB、認証、状態管理ライブラリ、UIライブラリ、テストフレームワーク、外部API SDKは導入していません。

## ローカル起動

Node.js 22.xとnpmが必要です。`.nvmrc`、GitHub Actions、VercelのNode.jsバージョンを22に揃えています。nvmを使用している場合は、先に`nvm install`と`nvm use`を実行してください。

```sh
npm install
npm run dev
```

表示されたURL（通常は http://localhost:3000 ）をブラウザで開きます。終了は`Ctrl+C`です。画面表示だけなら環境変数は不要です。DB接続確認には`.env.example`の変数が必要です（後述）。

ロックファイルどおりに再インストールする場合は`npm ci`を使用できます。

```sh
npm run lint       # ESLint
npm run typecheck  # TypeScript
npm run build      # 本番ビルド
npm start          # 本番ビルド後の起動
```

## ディレクトリ構成

```text
src/
├── app/
│   ├── layout.tsx          # 日本語設定・メタデータ
│   ├── page.tsx            # トップページ
│   └── globals.css         # Tailwind読み込み・テーマ・レスポンシブ配置
├── components/
│   ├── layout/Header.tsx
│   ├── player/CameraPlayer.tsx
│   ├── camera/CameraInfo.tsx
│   ├── weather/WeatherInfo.tsx
│   └── map/CameraMap.tsx
├── data/cameras.ts         # 静的カメラ情報
└── types/camera.ts         # LiveCamera型
```

`hooks/`と`lib/`は必要な処理ができた段階で追加します。

## 現在実装済みの範囲

- ダークテーマのヘッダー、16:9プレーヤー領域、情報パネル、再生操作の配置領域
- PC向けの左右レイアウトと、800px以下での縦並び
- 地点情報、地図、天気のプレースホルダー
- `LiveCamera`型と静的データ
- 未実装ボタンの`disabled`指定と、サンプル・未接続状態の明記

**実際の映像再生や外部サービス接続は行いません。** 横浜市の地点は画面開発用のサンプルで、実在する配信の登録を意味しません。天気の数値も表示していません。

### カメラ情報の管理

`src/data/cameras.ts`を編集します。`prefectureCode`は先頭ゼロを保持する文字列（例: `"01"`）、緯度経度は数値です。`category`は当面文字列とし、必要に応じてカテゴリ一覧を定義します。

`youtubeVideoId`は未登録を表す`null`を許容します。実在する公開ライブ配信の動画IDと埋め込み可否を確認してから、手動で登録してください。架空の動画IDは登録しません。現段階ではIDを登録しても再生されず、次の段階でプレーヤーを実装する必要があります。

## 今後の実装予定

1. 実在するライブ配信を登録し、YouTube IFrame Player APIで再生する（未登録・配信終了・埋め込み不可への対応を含む）
2. React Hooksで一定時間ごとの自動切替、前後移動、一時停止・再開、全国ランダム再生を実装する
3. 再生設定をlocalStorageへ保存する（初期表示時のサーバー描画との差異に注意）
4. Open-Meteoで天気を取得する（ローディング・取得失敗を表示する）
5. GeoJSONまたはMapLibreによるカメラ位置の地図表示
6. radiko・YouTube BGMへの外部リンク
7. 全画面表示と情報パネルの開閉
8. Vercelへのデプロイ

今回はYouTube API、天気API、地図ライブラリの先行導入やデプロイは行っていません。

## 構築時の検証（2026-11-03）

- Next.js 16.4.4を使用。インストール、開発サーバー起動、HTTP 200、ブラウザ表示、本番ビルド、ESLint、TypeScriptを確認。
- ブラウザで1440pxの左右配置、390pxの縦配置と横はみ出しがないこと、プレーヤーの16:9比率、操作ボタンの無効状態を確認。
- 実行環境のサンドボックスではnpmの名前解決とTurbopackの内部ポート通信が制限されたため、インストール・起動・ビルドは必要な権限付きで実行。
- ESLintはNext.js配下の各プラグインのpeer依存と整合する9.39.5を採用。npmからサポート終了警告が出ています。ESLint 10では一部プラグインのpeer依存が不整合となるため、プラグイン対応後にまとめて更新してください。
- `npm audit`で開発ツールのESLint系依存（minimatchのglob処理に由来）に中程度16件の報告があります。破壊的なダウングレードや強制overrideは行っていません。外部由来のglobパターンを開発ツールに渡さず、上流の対応を確認して更新してください。

## 公開・DB基盤（2026-11-04）

GitHub・Vercel・Supabaseへ接続済みです。接続先、設定、検証範囲、今後の運用は[基盤の手順書](docs/infrastructure.md)を参照してください。

- GitHub: https://github.com/Mizuckey/madotabi
- Vercel: https://madotabi.vercel.app （Vercel認証で保護）
- Supabase: madotabi（東京）、カメラテーブルとRLSを適用済み
- CI: mainへのpushとPRでlint・型・ビルドを検証
- サーバー側のDB接続確認: GET /api/health
- 設定: .env.exampleを参照。publishable keyを使用し、追加SDKは不要

カメラ表示は引き続き静的サンプルです。次はDBからのカメラ取得とYouTube再生を実装します。以前の「DB未導入」の記述は初回骨組み作成時点の記録です。
