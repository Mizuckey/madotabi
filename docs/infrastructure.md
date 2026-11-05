# GitHub・Vercel・Supabaseの運用基盤

## 接続先

| サービス | 接続先 |
| --- | --- |
| GitHub | https://github.com/Mizuckey/madotabi （ユーザー作成のpublicリポジトリ） |
| Vercel | Mizuki Ouchi's projects / madotabi |
| 本番URL | https://madotabi.vercel.app （本番エイリアスはログイン不要） |
| Supabase | Mizuckey's Org / madotabi / 東京（ap-northeast-1） |
| Supabase project ref | `udyuftpysfagdnkoqxvq` |
| Node.js | 22.x（package.json / .nvmrc / CI / Vercelで統一） |

アプリの表示名は仮称のSORAMIRUのままです。管理画面でURLを登録・プレビューし、明示的に公開した動画をトップページで再生できます。DB接続確認は`/api/health`です。詳しくは[管理画面](admin.md)と[動画の視聴と公開](playback.md)を参照してください。

## 開発の流れ

1. `main`から作業ブランチを作る。
2. 変更し、`npm run check`と`npm run build`を実行。
3. GitHubへpushしてPRを作る。
4. GitHub ActionsとVercelのプレビューを確認。
5. 問題がなければ`main`へマージし、本番デプロイを確認。

VercelのGit連携がデプロイを担当し、GitHub Actionsはチェックを担当します。Vercelのビルドにもlintと型チェックを含めるため、チェック失敗時は新しいデプロイのビルドが失敗します。CI成功をマージ必須条件にするGitHubのルールセットは別途設定が必要です。

## ローカル起動と環境変数

Node.js 22.xを使用してください。nvmがあれば`nvm install`と`nvm use`で切り替えられます。

```sh
npm ci
cp .env.example .env.local # 初回のみ。既存ファイルを上書きしないこと
# .env.local にSupabase URLとpublishable keyを設定
npm run dev
```

必要な変数は`SUPABASE_URL`と`SUPABASE_PUBLISHABLE_KEY`です。この作業環境の`.env.local`とVercelのDevelopment・Preview・Productionに設定済みです。新規チェックアウトではSupabase管理画面から設定してください。

キー、URL、行データ、内部エラーは`/api/health`の応答に含めません。環境変数は`NEXT_PUBLIC_`にせず、サーバーで使用します。secret key・service_role・DBパスワードは今回不要です。

`.env.local`、`.vercel/`、`node_modules/`、`.next/`、`work/`はGitへ追加しません。`.env.example`は空の見本です。Next.jsの生成ファイル`next-env.d.ts`も追跡せず、`npm run typecheck`で`next typegen`を先に実行します。

## 接続確認

```sh
curl -i http://localhost:3000/api/health
```

| HTTP | 応答 | 意味 |
| --- | --- | --- |
| 200 | `{"status":"ok","database":"connected"}` | RLS適用下でカメラテーブルを読み取り可能 |
| 503 | `{"status":"unavailable","database":"not_configured"}` | 環境変数が未設定 |
| 503 | `{"status":"unavailable","database":"unreachable"}` | 接続・権限・応答のエラー |

5秒でタイムアウトし、応答はキャッシュしません。外部API SDKは追加せず、標準fetchでSupabase REST APIへ接続します。

本番は`https://madotabi.vercel.app/api/health`です。Vercel保護がかかる場合は、そのプロジェクトにアクセスできるVercelアカウントでログインしてから確認します。

## Vercel

| 項目 | 設定 |
| --- | --- |
| Framework | Next.js |
| Root Directory | リポジトリルート |
| Node.js | 22.x |
| Install Command | `npm ci` |
| Build Command | `npm run check && npm run build` |
| Output Directory | Next.jsのデフォルト |
| Production Branch | `main` |

初回デプロイ成功と、mainへのpushによる自動デプロイを確認済みです。その他のブランチのプレビューはVercelのGit連携を利用します。PRによるプレビュー確認・マージ必須チェック設定は今後の運用時に確認します。

既定のVercel Deployment Protectionは維持しています。個別のデプロイURLは認証画面になりますが、本番エイリアス madotabi.vercel.app はログイン不要で閲覧できることを確認しました。ログ転送先・外部監視は未導入です。

## Supabase

### 初期スキーマ

`supabase/migrations/20261104094024_create_live_cameras.sql`をSupabaseのマイグレーション機能で適用済みです。ファイルの時刻はリモートの適用履歴と揃えています。既存の別アプリのDBは変更していません。

- `live_cameras`にLiveCamera型に対応する列を用意。
- `is_published`は初期値false。動画IDが未登録の行は公開不可。
- Row Level Security（RLS）を有効化し、公開済み行のみanon/authenticatedがSELECT可能。
- anon/authenticatedにはINSERT・UPDATE・DELETE権限を付与しない。
- 実在配信の登録前なのでデータは空。サンプル・架空の動画IDは投入しない。
- データ登録はまずSupabase管理画面を利用。管理画面とユーザー認証は実装済み。Storage・Realtimeは未導入。

### SQLの変更管理

適用済みファイルは編集せず、後続の変更は新しいマイグレーションにします。新規ファイルはSupabase CLIの`migration new`で作成し、変更内容とアクセス制御を検証してから適用・コミットします。CLIのローカルDB（Docker）は今回導入していません。

SQL Editorから手動実行するだけではマイグレーション履歴が登録されません。CLIの`db push`に移行する場合は、まず`migration list`でローカルとリモートの履歴を確認してください。

### 環境の分離

現段階では本番・プレビューとも同じSupabaseプロジェクトを参照し、アプリからは読み取りのみ行います。本番への書き込み機能を追加する前に、開発用DBを分離してPreview・Developmentの接続先を切り替えます。

## 検証記録

- GitHub Actions: 初回とNode.js 22固定後のlint・型・ビルド成功。
- Vercel: 初回デプロイREADY、自動デプロイの起動とREADYを確認。
- Supabase: 初期マイグレーション適用、セキュリティ検査の指摘0。
- RLS: 一時的な非公開検証行を匿名ロールで読めないことを確認し、ロールバック。
- REST: publishable keyで読み取りHTTP 200、書き込みHTTP 401を確認。
- ローカル本番ビルド: ヘルスチェック正常時200、設定未投入時503、no-storeを確認。
- 本番API: https://madotabi.vercel.app/api/health をブラウザで開き、status: ok / database: connected を確認。個別のデプロイURLはVercelログイン画面まで確認。

## 公式資料

- [Vercel Git連携](https://vercel.com/docs/git)
- [Vercel設定](https://vercel.com/docs/project-configuration)
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase APIキー](https://supabase.com/docs/guides/getting-started/api-keys)
