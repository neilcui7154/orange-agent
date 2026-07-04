# 微信小程序保险代理人助手 - 部署文档

## 服务器要求

- 操作系统：Linux（推荐 Ubuntu 20.04 或 CentOS 7+）
- CPU：2 核心以上
- 内存：4GB 以上
- 硬盘：20GB 以上
- 网络：公网 IP，开放 80、443 端口

## 环境准备

### 1. 安装 Node.js 18+

```bash
# 使用 nvm 安装（推荐）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18

# 验证安装
node -v
npm -v
```

### 2. 安装 MySQL 8.0

```bash
# Ubuntu
sudo apt update
sudo apt install mysql-server

# CentOS
sudo yum install mysql-server

# 启动 MySQL
sudo systemctl start mysql
sudo systemctl enable mysql

# 安全配置
sudo mysql_secure_installation
```

### 3. 安装 nginx

```bash
# Ubuntu
sudo apt install nginx

# CentOS
sudo yum install nginx

# 启动 nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 4. 安装 PM2

```bash
npm install -g pm2
```

## 数据库配置

### 1. 创建数据库和用户

```bash
mysql -u root -p
```

```sql
-- 创建数据库
CREATE DATABASE insurance_assistant DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建用户
CREATE USER 'insurance_user'@'localhost' IDENTIFIED BY 'your_strong_password';

-- 授权
GRANT ALL PRIVILEGES ON insurance_assistant.* TO 'insurance_user'@'localhost';
FLUSH PRIVILEGES;

EXIT;
```

### 2. 导入表结构

```bash
mysql -u insurance_user -p insurance_assistant < backend/db/schema.sql
```

### 3. 导入白名单数据

```bash
# 编辑白名单 Excel 文件
# backend/scripts/whitelist-template.xlsx

# 导入数据
cd backend
node scripts/import-whitelist.js scripts/whitelist-template.xlsx
```

## 后端部署

### 1. 上传代码到服务器

```bash
# 方式 1：使用 scp
scp -r ./backend user@your-server:/var/www/insurance-assistant/

# 方式 2：使用 Git
ssh user@your-server
cd /var/www
git clone <your-repo-url> insurance-assistant
```

### 2. 配置环境变量

```bash
cd /var/www/insurance-assistant/backend
cp .env.example .env
nano .env
```

编辑 `.env` 文件：

```env
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=insurance_user
DB_PASSWORD=your_strong_password
DB_NAME=insurance_assistant

# JWT 配置（生成强随机密钥）
JWT_SECRET=your_random_secret_key_at_least_32_chars_long_here

# Claude API 配置
CLAUDE_API_KEY=sk-IYLvMglPbyVZ2848anldHhp69xj6eR7veumkGLtC4fKrCUOC
CLAUDE_API_BASE=https://api.skyapi.org
CLAUDE_MODEL=claude-haiku-4-5

# 微信小程序配置
WECHAT_APPID=your_actual_appid
WECHAT_SECRET=your_actual_secret

# 服务器配置
PORT=3000
NODE_ENV=production

# 知识库路径
KNOWLEDGE_PATH=/data/knowledge
MEMORY_PATH=/data/memories
```

### 3. 安装依赖

```bash
npm install --production
```

### 4. 创建日志目录

```bash
mkdir -p logs
```

### 5. 使用 PM2 启动服务

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 6. 查看服务状态

```bash
pm2 status
pm2 logs insurance-assistant-backend
```

## 知识库同步

### 1. 创建知识库目录

```bash
sudo mkdir -p /data/knowledge
sudo mkdir -p /data/memories
sudo chown -R $USER:$USER /data/knowledge /data/memories
```

### 2. 从本地同步知识库

```bash
# 方式 1：使用 scp
scp -r "D:\寿险上分\0.知识库\*" user@your-server:/data/knowledge/

# 方式 2：使用 rsync（推荐）
rsync -avz --delete "D:\寿险上分\0.知识库/" user@your-server:/data/knowledge/
```

### 3. 设置文件权限

```bash
chmod -R 644 /data/knowledge/*
chmod -R 644 /data/memories/*
```

## nginx 配置

### 1. 创建 nginx 配置文件

```bash
sudo nano /etc/nginx/sites-available/insurance-assistant
```

配置内容：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL 证书配置
    ssl_certificate /etc/nginx/ssl/your-domain.crt;
    ssl_certificate_key /etc/nginx/ssl/your-domain.key;

    # SSL 安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # 日志
    access_log /var/log/nginx/insurance-assistant-access.log;
    error_log /var/log/nginx/insurance-assistant-error.log;

    # 反向代理到 Node.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 2. 启用配置

```bash
sudo ln -s /etc/nginx/sites-available/insurance-assistant /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 3. 配置 SSL 证书

使用 Let's Encrypt 免费证书：

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## 小程序配置

### 1. 修改 API 地址

编辑 `miniprogram/config.js`：

```javascript
const config = {
  production: {
    apiBase: 'https://your-domain.com'
  }
};

const env = 'production';
module.exports = config[env];
```

### 2. 配置微信公众平台

登录 [微信公众平台](https://mp.weixin.qq.com/)：

1. 进入「开发」-「开发管理」-「开发设置」
2. 配置服务器域名：
   - request 合法域名：`https://your-domain.com`
   - uploadFile 合法域名：`https://your-domain.com`
   - downloadFile 合法域名：`https://your-domain.com`

### 3. 上传小程序代码

1. 使用微信开发者工具打开 `miniprogram` 目录
2. 点击「上传」，填写版本号和备注
3. 登录微信公众平台，提交审核
4. 审核通过后，发布上线

## 验证部署

### 1. 测试后端接口

```bash
curl https://your-domain.com/health
```

应返回：

```json
{
  "success": true,
  "message": "服务运行正常",
  "timestamp": "2026-04-28T..."
}
```

### 2. 测试小程序

1. 使用微信扫码打开小程序
2. 输入邀请码和手机号登录
3. 发送测试消息，验证对话功能

## 监控与维护

### 1. 查看日志

```bash
# PM2 日志
pm2 logs insurance-assistant-backend

# nginx 日志
sudo tail -f /var/log/nginx/insurance-assistant-access.log
sudo tail -f /var/log/nginx/insurance-assistant-error.log
```

### 2. 重启服务

```bash
# 重启后端
pm2 restart insurance-assistant-backend

# 重启 nginx
sudo systemctl restart nginx
```

### 3. 更新代码

```bash
cd /var/www/insurance-assistant/backend
git pull
npm install --production
pm2 restart insurance-assistant-backend
```

### 4. 备份数据库

```bash
# 备份
mysqldump -u insurance_user -p insurance_assistant > backup_$(date +%Y%m%d).sql

# 恢复
mysql -u insurance_user -p insurance_assistant < backup_20260428.sql
```

## 常见问题

### 1. 数据库连接失败

检查 `.env` 文件中的数据库配置是否正确，确保 MySQL 服务正在运行。

### 2. 知识库加载失败

检查知识库目录权限，确保 Node.js 进程有读取权限。

### 3. 小程序无法连接后端

检查服务器域名是否已在微信公众平台配置，确保 SSL 证书有效。

### 4. Claude API 调用失败

检查 API Key 是否正确，确保服务器可以访问 `api.skyapi.org`。

## 安全建议

1. 定期更新系统和软件包
2. 使用强密码，定期更换
3. 配置防火墙，只开放必要端口
4. 定期备份数据库和知识库
5. 监控服务器资源使用情况
6. 配置日志轮转，避免日志文件过大

## 联系支持

如有问题，请联系技术支持团队。
