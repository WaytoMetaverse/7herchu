# LINE 機器人雙機器人設定指南

## 🎯 設定步驟

### 步驟 1：創建環境變數文件

在你的專案根目錄創建 `.env.local` 文件，並添加以下內容：

```env
# Database
DATABASE_URL="你的資料庫連接字串"

# NextAuth
NEXTAUTH_URL="https://your-domain.vercel.app"
NEXTAUTH_SECRET="your-secret-key-here"

# 其他現有的環境變數...

# LINE 機器人設定（主要機器人）
LINE_CHANNEL_ID="你的主要機器人頻道ID"
LINE_CHANNEL_SECRET="你的主要機器人頻道密鑰"

# LINE 機器人設定（備用機器人 - 可選）
LINE_CHANNEL_ID_2="你的備用機器人頻道ID"
LINE_CHANNEL_SECRET_2="你的備用機器人頻道密鑰"
```

### 步驟 2：獲取 LINE 機器人資訊

#### 主要機器人設定
1. 登入 [LINE Developers Console](https://developers.line.biz/console/)
2. 選擇你的主要機器人頻道
3. 複製 **Channel ID** 和 **Channel Secret**

#### 備用機器人設定
1. 創建一個新的 LINE 機器人頻道，或者使用現有的另一個頻道
2. 複製 **Channel ID** 和 **Channel Secret**

### 步驟 3：設定環境變數

將獲取的資訊填入 `.env.local` 文件：

```env
# 主要機器人
LINE_CHANNEL_ID="1234567890"
LINE_CHANNEL_SECRET="abcdef1234567890abcdef1234567890"

# 備用機器人
LINE_CHANNEL_ID_2="0987654321"
LINE_CHANNEL_SECRET_2="fedcba0987654321fedcba0987654321"
```

### 步驟 4：部署設定

如果你使用 Vercel 部署，需要在 Vercel 專案設定中添加環境變數：

1. 進入 Vercel 專案設定
2. 找到 "Environment Variables"
3. 添加以下環境變數：
   - `LINE_CHANNEL_ID`
   - `LINE_CHANNEL_SECRET`
   - `LINE_CHANNEL_ID_2`
   - `LINE_CHANNEL_SECRET_2`

### 步驟 5：測試設定

1. 重新啟動你的應用程式
2. 訪問 `/admin/line-bot` 頁面查看機器人狀態
3. 確認兩個機器人都顯示為 "已配置"

## 🔧 功能說明

### 自動切換機制
- 當主要機器人達到額度上限時，系統會自動切換到備用機器人
- 切換過程對用戶完全透明
- 系統會記錄切換時間和當前使用的機器人

### 監控功能
- 訪問 `/admin/line-bot` 可以查看機器人狀態
- 系統會記錄 API 錯誤和切換歷史
- 支援即時監控機器人連接狀態

### 錯誤處理
- 監控 HTTP 狀態碼 429（Too Many Requests）
- 監控 HTTP 狀態碼 403（Forbidden）
- 自動識別額度相關錯誤並切換機器人

## ⚠️ 注意事項

1. **安全性**：絕對不要在代碼中硬編碼 API 金鑰
2. **環境變數**：確保 `.env.local` 文件在 `.gitignore` 中
3. **備用機器人**：備用機器人設定是可選的，但建議設定以確保服務不中斷
4. **群組綁定**：兩個機器人都需要加入同一個 LINE 群組並綁定

## 🚀 完成後的功能

設定完成後，你的系統將具備：
- ✅ 自動監控 LINE 機器人額度
- ✅ 自動切換到備用機器人
- ✅ 機器人狀態監控頁面
- ✅ 詳細的錯誤記錄和追蹤
- ✅ 無縫的服務切換

## 📞 需要幫助？

如果在設定過程中遇到問題，可以：
1. 檢查 `/admin/line-bot` 頁面的狀態顯示
2. 查看應用程式的控制台日誌
3. 確認環境變數設定正確
