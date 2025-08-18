#!/bin/bash

# 数据库部署脚本
echo "开始数据库部署..."

# 生成Prisma客户端
echo "生成Prisma客户端..."
npx prisma generate

# 运行数据库迁移
echo "运行数据库迁移..."
npx prisma migrate deploy

# 验证数据库连接
echo "验证数据库连接..."
npx prisma db seed --preview-feature

echo "数据库部署完成！"
