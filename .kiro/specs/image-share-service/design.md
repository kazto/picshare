# 設計書

## 概要

個人用画像シェアサービスは、Cloudflare R2を使用した画像ストレージとWebベースのユーザーインターフェースを組み合わせたシステムです。シンプルで高速な画像アップロード、管理、共有機能を提供します。

## アーキテクチャ

### システム構成

```
[Webブラウザ] ←→ [React Frontend] ←→ [Cloudflare Workers] ←→ [Cloudflare R2]
                                            ↓
                                      [Cloudflare D1]
```

### 技術スタック

- **フロントエンド**: React 18 + TypeScript + Vite
- **バックエンド**: Cloudflare Workers + TypeScript
- **ストレージ**: Cloudflare R2
- **データベース**: Cloudflare D1 (SQLite互換)
- **認証**: JWT + セッション管理

## コンポーネントとインターフェース

### フロントエンドコンポーネント

#### 1. ImageUpload コンポーネント
- ドラッグ&ドロップ対応のファイルアップロード
- 複数ファイル選択・一括アップロード
- 個別ファイルの進捗表示
- 全体進捗表示
- ファイル形式・サイズ検証
- アップロード中のキャンセル機能

#### 2. ImageGallery コンポーネント
- グリッドレイアウトでのサムネイル表示
- 仮想スクロール（大量画像対応）
- ソート・フィルタリング機能

#### 3. ImageViewer コンポーネント
- フルサイズ画像表示
- 画像情報表示
- 共有リンクコピー機能
- 削除機能

#### 4. ImageCard コンポーネント
- サムネイル表示
- ホバー時の詳細情報
- クイックアクション（削除、共有）

### 認証コンポーネント

#### 1. Login コンポーネント
- ユーザー名・パスワード入力フォーム
- ログイン状態管理
- JWT トークン保存

#### 2. AuthProvider コンポーネント
- 認証状態のグローバル管理
- トークン自動更新
- 認証が必要なルートの保護

### バックエンドAPI

#### 認証API

#### 1. ログインAPI
```
POST /api/auth/login
Content-Type: application/json
Body: { username, password }
Response: { token, expiresIn }
```

#### 2. トークン検証API
```
GET /api/auth/verify
Headers: Authorization: Bearer <token>
Response: { valid: boolean, user: {...} }
```

#### 画像管理API（認証必須）

#### 3. 画像アップロードAPI（単一ファイル）
```
POST /api/images
Headers: Authorization: Bearer <token>
Content-Type: multipart/form-data
Response: { id, url, filename, size, uploadDate }
```

#### 3-2. 画像一括アップロードAPI
```
POST /api/images/batch
Headers: Authorization: Bearer <token>
Content-Type: multipart/form-data
Response: {
  results: [
    { success: true, id, url, filename, size, uploadDate },
    { success: false, filename, error }
  ],
  totalUploaded: number,
  totalFailed: number
}
```

#### 4. 画像一覧取得API
```
GET /api/images?page=1&limit=20&sort=date
Headers: Authorization: Bearer <token>
Response: { images: [...], total, totalSize }
```

#### 5. 画像削除API
```
DELETE /api/images/:id
Headers: Authorization: Bearer <token>
Response: { success: boolean }
```

#### 6. 画像詳細取得API
```
GET /api/images/:id
Headers: Authorization: Bearer <token>
Response: { id, url, filename, size, uploadDate, metadata }
```

## データモデル

### User テーブル (Cloudflare D1)

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Image テーブル (Cloudflare D1)

```sql
CREATE TABLE images (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  public_url TEXT NOT NULL,
  user_id TEXT NOT NULL,
  upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  metadata TEXT, -- JSON形式でEXIF等の情報
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### R2 オブジェクト構造

```
bucket/
├── images/
│   ├── 2024/01/uuid1.jpg
│   ├── 2024/01/uuid2.png
│   └── ...
└── thumbnails/
    ├── 2024/01/uuid1_thumb.jpg
    ├── 2024/01/uuid2_thumb.png
    └── ...
```

## エラーハンドリング

### フロントエンド

1. **ファイルアップロードエラー**
   - ファイルサイズ超過: "ファイルサイズは10MB以下にしてください"
   - 非対応形式: "対応していないファイル形式です"
   - ネットワークエラー: "アップロードに失敗しました。再試行してください"

2. **画像読み込みエラー**
   - 404エラー: プレースホルダー画像表示
   - ネットワークエラー: 再読み込みボタン表示

3. **削除エラー**
   - 権限エラー: "削除権限がありません"
   - ネットワークエラー: "削除に失敗しました。再試行してください"

### バックエンド

1. **R2接続エラー**
   - 認証失敗: 500エラーとログ出力
   - ネットワークタイムアウト: リトライ機能

2. **データベースエラー**
   - 接続失敗: アプリケーション起動失敗
   - クエリエラー: 適切なHTTPステータスコード返却

3. **ファイル処理エラー**
   - 破損ファイル: 400エラー
   - メモリ不足: 413エラー

## テスト戦略

### 単体テスト

1. **フロントエンド**
   - React Testing Library使用
   - コンポーネントの動作テスト
   - ユーザーインタラクションテスト

2. **バックエンド**
   - Vitest使用
   - API エンドポイントテスト
   - データベース操作テスト
   - R2統合テスト（モック使用）

### 統合テスト

1. **E2Eテスト**
   - Playwright使用
   - 画像アップロードフロー
   - 画像表示・削除フロー
   - エラーハンドリング

2. **パフォーマンステスト**
   - 大量画像読み込み
   - 同時アップロード
   - メモリ使用量監視

### テスト環境

- **開発環境**: ローカルSQLite + R2テストバケット
- **CI/CD**: GitHub Actions + テスト用R2バケット
- **本番環境**: 本番R2バケット

## セキュリティ考慮事項

1. **認証・認可**
   - JWT トークンによる認証
   - パスワードのハッシュ化（bcrypt使用）
   - トークンの有効期限管理
   - CORS設定による不正アクセス防止

2. **ファイルアップロード**
   - MIME type検証
   - ファイルサイズ制限
   - ファイル名サニタイズ
   - 認証済みユーザーのみアップロード可能

3. **R2アクセス**
   - 環境変数での認証情報管理
   - 最小権限の原則
   - ユーザー毎のファイルアクセス制御

4. **公開URL**
   - 推測困難なファイル名（UUID使用）
   - 直接アクセス可能（認証不要）
   - ユーザー毎のファイル分離

## パフォーマンス最適化

1. **画像最適化**
   - サムネイル自動生成
   - WebP形式への変換（対応ブラウザ）
   - 遅延読み込み

2. **キャッシュ戦略**
   - ブラウザキャッシュ活用
   - CDN活用（Cloudflare）

3. **データベース最適化**
   - インデックス設定
   - ページネーション実装