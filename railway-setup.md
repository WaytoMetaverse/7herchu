# Railway数据库设置指南

## 1. 创建Railway账户
- 访问 [Railway.app](https://railway.app/)
- 使用GitHub账户登录

## 2. 创建新项目
1. 点击 "New Project"
2. 选择 "Deploy from GitHub repo" 或 "Start from scratch"

## 3. 添加PostgreSQL数据库
1. 在项目仪表板中点击 "New"
2. 选择 "Database" → "PostgreSQL"
3. 等待数据库创建完成

## 4. 获取连接信息
1. 点击PostgreSQL服务
2. 在 "Connect" 标签页中找到连接字符串
3. 复制 `DATABASE_URL`

## 5. 数据库配置
- 数据库名称: 自动生成
- 用户名: 自动生成
- 密码: 自动生成
- 主机: 自动生成
- 端口: 通常是5432

## 6. 在Vercel中设置环境变量
将复制的 `DATABASE_URL` 添加到Vercel项目设置的环境变量中。

## 7. 安全注意事项
- Railway数据库默认是公开的，建议设置访问控制
- 定期备份数据库
- 监控数据库使用量和成本
