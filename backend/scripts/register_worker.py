# backend/scripts/register_worker.py (基于你的 openai_register.py 修改)
import sys
import json
import argparse
from register import PlatformRegistrar # 假设你将核心类抽离

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--proxy', type=str, required=True, help='代理地址')
    parser.add_argument('--email', type=str, help='指定邮箱（可选，不传则脚本内部自动获取）')
    args = parser.parse_args()

    try:
        # 初始化注册器（使用传入的代理）
        registrar = PlatformRegistrar(proxy=args.proxy)
        
        # 执行注册核心逻辑
        result = registrar.register(index=1) 
        
        # 组装成功结果，必须是纯 JSON，打印到标准输出
        output = {
            "status": "success",
            "data": {
                "email": result["email"],
                "password": result["password"],
                "access_token": str(result.get("access_token", "")),
                "refresh_token": str(result.get("refresh_token", "")),
            }
        }
        print(json.dumps(output))
        sys.exit(0)

    except Exception as e:
        # 捕获异常，输出错误 JSON
        error_output = {
            "status": "error",
            "message": str(e)
        }
        print(json.dumps(error_output))
        sys.exit(1)

if __name__ == "__main__":
    main()