import sys
import json
import argparse
from register import PlatformRegistrar

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--proxy', type=str, required=True)
    parser.add_argument('--email', type=str, required=True)
    parser.add_argument('--grizzly_key', type=str, default="") # 👈 接收传过来的接码KEY
    args = parser.parse_args()

    try:
        registrar = PlatformRegistrar(proxy=args.proxy, email=args.email, grizzly_key=args.grizzly_key)
        result = registrar.register(index=1) 
        
        output = {
            "status": "success",
            "data": {
                "email": result["email"],
                "password": result["password"],
                "access_token": result["access_token"],
                "refresh_token": result["refresh_token"], # 给 codex 的 rt
            }
        }
        print(json.dumps(output))
        sys.exit(0)

    except Exception as e:
        print(json.dumps({"status": "error", "message": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()