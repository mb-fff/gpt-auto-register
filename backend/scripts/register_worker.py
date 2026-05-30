import sys
import json
import argparse
from register import PlatformRegistrar

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--proxy', type=str, default="")
    parser.add_argument('--email', type=str, required=True)
    parser.add_argument('--grizzly_key', type=str, default="")
    parser.add_argument('--country', type=str, default="6") # 👈 新增：接收 Node 传来的国家代码
    args = parser.parse_args()

    try:
        # 将参数全部传给核心注册类
        registrar = PlatformRegistrar(proxy=args.proxy, email=args.email, grizzly_key=args.grizzly_key, country=args.country)
        result = registrar.register(index=1) 
        
        output = {
            "status": "success",
            "data": {
                "email": result["email"],
                "password": result["password"],
                "access_token": result["access_token"],
                "refresh_token": result["refresh_token"],
            }
        }
        print(json.dumps(output))
        sys.exit(0)

    except Exception as e:
        print(json.dumps({"status": "error", "message": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()