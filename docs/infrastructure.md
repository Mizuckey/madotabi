# GitHub・Vercel・Supabaseの運用基盤

## 現在の状態

GitHubリポジトリは https://github.com/Mizuckey/madotabi です。初回コミット 1cb820c をpushし、GitHub ActionsのCI成功を確認しました。Vercelは Mizuki Ouchi’s projects / madotabi に作成し、Node.js 22.xを設定しています。Supabaseは作成先組織の確認待ちで、プロジェクト作成・SQL適用・アプリ接続は未完了です。

現在の画面は引き続き静的なサンプルを使用します。環境変数を設定するだけではDBへ接続しません。DB適用・アクセス制御の検証後に、サーバー側のカメラ取得処理を追加します。

## 構成

- GitHub: コードとSQL変更履歴、プルリクエスト、自動チェック
- Vercel: Next.jsのプレビューと本番デプロイ
- Supabase: カメラ情報の保存。認証・Storage・Realtimeは現時点では使用しない
- ローカル・CI・Vercelの推奨Node.js: 22.x（`.nvmrc`）

### 開発の流れ

1. `main`から作業ブランチを作る。
2. 変更し、`npm run check`と`npm run build`を実行。
3. GitHubへpushしてPRを作る。
4. GitHub ActionsとVercelのプレビューを確認。
5. 問題がなければ`main`へマージし、本番デプロイを確認。

VercelのGit連携でデプロイし、Actionsはチェックだけを担当します。Vercelのビルドコマンドにもlintと型チェックを含めるため、チェック失敗時の新しいデプロイはビルド失敗となります。GitHubでCI成功をマージの必須条件にする場合は、リポジトリのルールセットで別途設定します（このファイルの追加だけでは有効になりません）。

## GitHub

ユーザーが作成した Mizuckey/madotabi に、このプロジェクトのルートを登録済みです。作成時点のリポジトリはpublicです。アプリの表示名は現段階ではSORAMIRUのままです。

`.env.local`、`.vercel/`、`node_modules/`、`.next/`、`work/`はGitへ追加しません。`.env.example`は空の設定見本として追跡します。`next-env.d.ts`はNext.jsが生成し、型チェックは`next typegen`で必要な型を先に生成するため、クリーンチェックアウトでも実行できます。

## Vercel

GitHub連携から対象リポジトリをImportします。

| 項目 | 設定 |
| --- | --- |
| Framework | Next.js |
| Root Directory | リポジトリルート |
| Node.js | 22.x |
| Install Command | `npm ci`（vercel.jsonで指定） |
| Build Command | `npm run check && npm run build`（vercel.jsonで指定） |
| Output Directory | Next.jsのデフォルト |
| Production Branch | `main` |

初回は環境変数がなくても画面のデプロイを確認できます。本番ブランチ以外の変更でプレビューを作り、mainへの変更で本番を更新します。公開するアカウントとプロジェクトを確認してから実行してください。

## Supabase

### プロジェクトと適用

接続後に既存プロジェクトの有無を確認します。新規作成の場合は、所有する組織と利用可能な日本に近いリージョンを選びます。有料プランや有料機能が必要な場合は作成前に判断します。

初期定義は`supabase/migrations/20261104000000_create_live_cameras.sql`です。接続先を確認し、同名テーブルがないことを確かめて、マイグレーション適用機能で一度だけ適用します。すでに適用したSQLを編集せず、以後の変更は新しい時刻付きファイルを追加します。

CLIによるローカルDB（Docker）は今回導入していません。CLIでの`db push`運用へ移行する場合は、既存マイグレーション履歴を揃えてから実行してください。SQL Editorから手動実行するだけではCLIの履歴は登録されません。

### データと権限

- `live_cameras`に既存のLiveCamera型に対応する列を用意。
- `is_published`は初期値false。動画ID未登録の行は公開できません。
- Row Level Security（RLS）を有効化。公開済み行のみanon/authenticatedがSELECT可能。
- anon/authenticatedにはINSERT・UPDATE・DELETE権限やポリシーを与えません。
- データ登録はまずSupabase管理画面で行います。アプリ側管理画面・ユーザー認証は後続要件です。
- サンプル地点や架空の動画IDを本番DBへ投入しません。

適用後は、管理者権限でテーブルが見えることだけでは不十分です。publishable keyを使い、未公開行が返らず、書き込みが拒否されることを検証します。実在配信を登録した段階で公開行の読み取りも確認します。

### 環境変数

`.env.example`を`.env.local`へコピーし、接続するプロジェクトのURLとpublishable keyを設定します。Vercelにも対応する値を登録し、再デプロイします。秘密キー・service_role・DBパスワードはブラウザへ渡しません。

最初は開発・プレビュー用のSupabaseプロジェクトで接続確認します。本番へのDB書き込みを伴う機能を追加する前に、本番用と開発用を分け、VercelのPreviewとProductionにそれぞれ対応する値を設定してください。

## 完了チェック

- [x] GitHubへの初回pushとCI成功
- [ ] Vercelの初回デプロイ成功・URL確認
- [ ] PRでプレビュー作成、本番ブランチの設定を確認
- [ ] Supabaseの適用先を確定し、初期マイグレーション適用
- [ ] publishable keyで非公開行の非表示と書き込み拒否を確認
- [ ] カメラ取得処理を追加し、Vercel上でDB接続確認

## 公式資料

- Vercel Git連携: https://vercel.com/docs/git
- Vercel設定: https://vercel.com/docs/project-configuration
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase APIキー: https://supabase.com/docs/guides/getting-started/api-keys
