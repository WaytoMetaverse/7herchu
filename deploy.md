# 部署到Vercel + Railway指南

## 1. 设置Railway数据库

1. 访问 [Railway](https://railway.app/) 并登录
2. 创建新项目
3. 选择 "Provision PostgreSQL"
4. 等待数据库创建完成
5. 在数据库详情页面，复制连接字符串

## 2. 在Vercel上设置环境变量

在Vercel项目设置中添加以下环境变量：

- `DATABASE_URL`: Railway PostgreSQL连接字符串
- `NEXTAUTH_URL`: 您的Vercel域名 (例如: https://your-app.vercel.app)
- `NEXTAUTH_SECRET`: 生成一个随机密钥 (可以使用: `openssl rand -base64 32`)

## 3. 部署步骤

1. 将代码推送到GitHub
2. 在Vercel上连接GitHub仓库
3. 设置环境变量
4. 部署

## 4. 数据库迁移

部署完成后，需要运行数据库迁移：

```bash
# 在Vercel上设置环境变量后，重新部署
# 或者使用Vercel CLI运行迁移
vercel env pull .env.local
npx prisma migrate deploy
```

## 5. 验证部署

1. 检查Vercel部署状态
2. 验证数据库连接
3. 测试应用功能
