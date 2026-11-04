# カメラURL管理

管理画面: https://madotabi.vercel.app/admin

## 最初の利用

1. 「はじめての方：アカウントを登録」を開く。
2. 管理者として指定したメールアドレスと、新しいパスワード（12文字以上）を入力する。
3. 「登録して確認メールを送る」を押し、受信したメールの確認リンクを開く。
4. 管理画面に戻ってログインする。

管理者のメールアドレスはDBの非公開スキーマで設定します。ソースコードやマイグレーションに個人のメールアドレスを含めません。アカウント登録だけでは管理権限は付与されず、指定したメールアドレスの確認が完了している必要があります。

### メール設定

Supabase Dashboard → Authentication → URL Configuration で次を設定してください。認証URL設定の変更機能は今回の接続ツールになく、CLIも未認証のため、この設定は管理画面からの確認が必要です。

- Site URL: `https://madotabi.vercel.app`
- Redirect URLs: `https://madotabi.vercel.app/admin`
- ローカルでもメール確認する場合だけ追加: `http://localhost:3000/admin`

未設定だと、メール確認の後にlocalhostへ戻ることがあります。メール確認が済んでいれば、公開管理画面を開き直してログインできます。

Supabase標準のメール送信には送信先制限とレート制限があります。メールが届かない場合はAuthログとSMTP設定を確認してください。パスワードの設定・メール確認は利用者が行い、開発者がパスワードを受け取る必要はありません。

## URLの保存

- YouTube URLは必須。タイトルとメモは任意です。
- `youtube.com/watch?v=...`、`youtu.be/...`、`youtube.com/live/...`、`shorts`、`embed`に対応。
- 共有用パラメーターなどを除いたURLに正規化して保存します。
- 同じ動画IDは、異なるURL形式で追加しても重複として拒否します。
- 一覧は新しい順に20件ずつ取得し、「さらに読み込む」で続きを表示します。
- 一覧取得失敗時には空一覧と区別してエラーを表示します。
- 一度ログインしたブラウザでは、Supabase SDKがセッションを保存・更新します。共用端末ではログアウトしてください。

今回は追加・一覧表示が対象です。編集・削除・検索は未実装です。保存するのは未確認の登録候補で、配信の実在やライブ状態、埋め込み可否は確認しません。`live_cameras`へ自動登録したり公開画面へ反映したりもしません。

## アクセス制御

- `camera_submissions`: RLS有効。確認済みの管理者だけがSELECT・INSERT可能。
- `created_by`はログイン中の利用者IDに限定。UPDATE・DELETE権限は付与しません。
- `app_private.camera_admins`: メールアドレスの許可一覧。Data APIに公開しないスキーマに置き、通常の利用者へのテーブル権限・RLSポリシーは付与しません（デフォルト拒否）。
- `app_private.is_camera_admin()`: 引数なしの権限確認専用関数。現在のAuthユーザーID・現在のメール・メール確認済み時刻を照合します。ユーザーが編集できるmetadataやブラウザ側の管理フラグは使いません。
- 非公開のAuth情報を参照する必要があるため、この小さな関数だけSECURITY DEFINERとし、空のsearch_path・完全修飾名・authenticatedだけの実行権限に限定します。
- 公開RPC `is_camera_admin`はSECURITY INVOKERでbooleanだけ返します。
- メール許可一覧の「RLS有効・ポリシーなし」というSecurity AdvisorのINFOは、直接アクセスを拒否する意図した設定です。
- ブラウザへ渡すのはSupabase URLとpublishable keyのみ。secret key / service_roleは使用しません。

管理者の追加・変更は、運用者がSupabase上で許可一覧を更新します。個人情報をリポジトリのSQLへ書かないでください。

## 検証

`npm run check`でESLint・型・Node.js標準テストを実行します。テストフレームワークは追加していません。YouTube URLの正規化・危険なホスト名・ユーザー情報付きURL・不正ID・重複vパラメーターなどをテストしています。

別途、匿名のSELECT/RPC拒否、非管理者のINSERT拒否、UPDATE/DELETE権限なしをDBとRESTで検証しています。実際のログインと管理者による保存の確認には、初回アカウント登録・メール確認が必要です。
