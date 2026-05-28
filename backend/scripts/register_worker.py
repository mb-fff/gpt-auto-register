# backend/scripts/register_worker.py
import sys
import json
import argparse
from register import PlatformRegistrar

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--proxy', type=str, required=True, help='代理地址')
    parser.add_argument('--email', type=str, required=True, help='必须传入 Node.js 生成的邮箱')
    args = parser.parse_args()

    try:
        # 把 Node 生成的邮箱塞给注册器
        registrar = PlatformRegistrar(proxy=args.proxy, email=args.email)
        result = registrar.register(index=1) 
        
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
        error_output = {
            "status": "error",
            "message": str(e)
        }
        print(json.dumps(error_output))
        sys.exit(1)

if __name__ == "__main__":
    main()