# PWA 推送通知設定指南

## 🎯 功能說明

當有人報名活動時（講師/內部成員/來賓），所有啟用推送通知的用戶將收到即時通知，格式如下：

```
🌟宇宙 報名了 10/28（二）18:30 - 21:00 BOD 打造獲利的金店面🌟
講師:2位、內部成員:4位、來賓10位，共16位
```

點擊通知後會自動導向活動詳情頁面。

---

## ⚙️ 環境變數設定

### 步驟 1：VAPID 金鑰已生成

從之前的輸出中，我們已經生成了 VAPID 金鑰：

```
Public Key:
BMj4H4_xkUyYDl-VFTjkOxtmUlkvAg4ntlCoLvhKNc_b9RlKVDAfjlVd8JUDRoMY8w_pXVTd07kE4dGHaMFeokk

Private Key:
upg54DIkodxzPgw7NiSYC1AhebpCBwq_EElXqsHOSD8
```

### 步驟 2：設定環境變數

在您的 `.env` 或 `.env.local` 文件中添加以下內容：

```env
# Web Push 推送通知
NEXT_PUBLIC_VAPID_PUBLIC_KEY="BMj4H4_xkUyYDl-VFTjkOxtmUlkvAg4ntlCoLvhKNc_b9RlKVDAfjlVd8JUDRoMY8w_pXVTd07kE4dGHaMFeokk"
VAPID_PRIVATE_KEY="upg54DIkodxzPgw7NiSYC1AhebpCBwq_EElXqsHOSD8"
VAPID_SUBJECT="mailto:your-email@example.com"
```

⚠️ **重要**：
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` 必須以 `NEXT_PUBLIC_` 開頭才能在客戶端使用
- `VAPID_SUBJECT` 請填入您的實際電子郵件地址
- 請確保私鑰（VAPID_PRIVATE_KEY）不要洩漏

### 步驟 3：Vercel 部署設定

在 Vercel 上設定環境變數：

1. 進入 Vercel 專案設定
2. 找到 "Environment Variables"
3. 添加以下三個環境變數：
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`
   - `VAPID_SUBJECT`
4. 重新部署專案

---

## 📱 使用方式

### 用戶端操作

1. **開啟推送通知**
   - 進入「個人資料」頁面
   - 在「通知設定」區塊
   - 點擊「開啟通知」按鈕
   - 瀏覽器會請求通知權限，請點擊「允許」

2. **關閉推送通知**
   - 進入「個人資料」頁面
   - 在「通知設定」區塊
   - 點擊「關閉通知」按鈕

3. **接收通知**
   - 當有人報名活動時，會自動收到推送通知
   - 即使 PWA 關閉也能收到通知
   - 點擊通知會自動導向活動詳情頁面

### 通知觸發時機

✅ **會發送通知**：
- 講師報名活動
- 內部成員報名活動（僅限新報名）
- 來賓報名活動

❌ **不會發送通知**：
- 取消報名
- 請假
- 修改餐點選擇（不算新報名）

---

## 🔧 技術細節

### 檔案結構

```
src/
├── lib/
│   ├── webpush.ts                    # Web Push 核心功能
│   └── notificationHelper.ts         # 通知輔助函數
├── components/
│   └── PushNotificationToggle.tsx    # 通知開關元件
├── app/
│   ├── api/
│   │   └── push/
│   │       ├── subscribe/route.ts    # 訂閱 API
│   │       ├── unsubscribe/route.ts  # 取消訂閱 API
│   │       └── status/route.ts       # 查詢狀態 API
│   ├── profile/page.tsx              # 個人資料（含通知設定）
│   ├── events/[id]/
│   │   └── register/page.tsx         # 內部成員報名
│   ├── api/
│   │   ├── guest-register/route.ts   # 來賓報名 API
│   │   └── speaker/book/route.ts     # 講師報名 API
│   └── ...
├── prisma/
│   └── schema.prisma                 # 新增 PushSubscription 模型
└── public/
    └── sw.js                          # Service Worker（含推送處理）
```

### 資料庫

新增 `PushSubscription` 模型用於儲存用戶的推送訂閱：

```prisma
model PushSubscription {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  endpoint        String
  p256dh          String
  auth            String
  isEnabled       Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

### 工作流程

1. **訂閱流程**：
   - 用戶點擊「開啟通知」
   - 請求瀏覽器通知權限
   - 訂閱 Service Worker Push Manager
   - 將訂閱資訊儲存到資料庫

2. **發送流程**：
   - 用戶報名活動
   - 伺服器端觸發 `sendRegistrationNotification()`
   - 查詢所有啟用推送的訂閱
   - 使用 Web Push 發送通知
   - Service Worker 接收並顯示通知

3. **點擊流程**：
   - 用戶點擊通知
   - Service Worker 處理點擊事件
   - 導向活動詳情頁面

---

## 🐛 故障排除

### 通知沒有收到

1. **檢查瀏覽器權限**
   - 確保允許了通知權限
   - Chrome：設定 > 隱私權和安全性 > 網站設定 > 通知

2. **檢查訂閱狀態**
   - 進入個人資料頁面
   - 查看「推送通知已啟用」訊息

3. **檢查 Service Worker**
   - 開啟開發者工具
   - Application > Service Workers
   - 確認 Service Worker 已啟用

4. **檢查環境變數**
   - 確認 VAPID 金鑰正確設定
   - 確認 `.env` 文件有正確載入

### iOS Safari 注意事項

- iOS 16.4+ 才支援 Web Push
- 需要將網站「加入主畫面」才能使用
- 某些限制可能仍然存在

---

## 📊 監控和日誌

推送通知相關的日誌會顯示在伺服器端：

```
[WebPush] 發送通知給 N 個訂閱
[WebPush] 成功發送給用戶 XXX
[WebPush] 完成：成功 N/M
[Notification] 已發送報名通知: XXX (講師)
```

如果發送失敗，會有警告日誌但不會中斷報名流程。

---

## 🎉 完成

現在您的 PWA 已經支援推送通知功能！用戶可以即時收到報名通知，提升團隊協作效率。

