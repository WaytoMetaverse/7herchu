# Vercel部署检查清单

## 部署前检查
- [ ] 代码已推送到GitHub
- [ ] Railway数据库已创建并运行
- [ ] 环境变量已准备就绪

## Vercel设置
- [ ] 创建Vercel账户
- [ ] 导入GitHub仓库
- [ ] 设置项目名称和域名

## 环境变量配置
- [ ] `DATABASE_URL` (Railway PostgreSQL连接字符串)
- [ ] `NEXTAUTH_URL` (Vercel域名)
- [ ] `NEXTAUTH_SECRET` (随机密钥)
- [ ] 其他必要的环境变量

## 部署配置
- [ ] 框架预设: Next.js
- [ ] 构建命令: `npx prisma generate && next build`
- [ ] 输出目录: `.next`
- [ ] 安装命令: `npm install`

## 部署后验证
- [ ] 检查构建日志
- [ ] 验证数据库连接
- [ ] 测试主要功能
- [ ] 检查错误日志
- [ ] 验证环境变量

## 数据库迁移
- [ ] 运行 `npx prisma migrate deploy`
- [ ] 验证数据库表结构
- [ ] 检查种子数据

## 性能优化
- [ ] 启用Vercel Analytics
- [ ] 配置CDN设置
- [ ] 监控函数执行时间
