import base64
import http.server
import urllib.parse
import webbrowser

import requests

REDIRECT_URI = "http://127.0.0.1:8888/callback"
SCOPE = "user-read-currently-playing"


def main():
    client_id = input("spotify client id: ").strip()
    client_secret = input("spotify client secret: ").strip()

    auth_url = "https://accounts.spotify.com/authorize?" + urllib.parse.urlencode(
        {
            "client_id": client_id,
            "response_type": "code",
            "redirect_uri": REDIRECT_URI,
            "scope": SCOPE,
        }
    )

    code_holder = {}

    class Handler(http.server.BaseHTTPRequestHandler):
        def do_GET(self):
            qs = urllib.parse.urlparse(self.path).query
            params = urllib.parse.parse_qs(qs)
            code_holder["code"] = params.get("code", [None])[0]
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b"done, you can close this tab.")

        def log_message(self, *args):
            pass

    print("opening browser for spotify auth...")
    webbrowser.open(auth_url)

    server = http.server.HTTPServer(("127.0.0.1", 8888), Handler)
    server.handle_request()

    code = code_holder.get("code")
    if not code:
        raise SystemExit(
            "no code received — check the redirect uri in your spotify app settings"
        )

    auth_header = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()
    resp = requests.post(
        "https://accounts.spotify.com/api/token",
        headers={"Authorization": f"Basic {auth_header}"},
        data={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": REDIRECT_URI,
        },
    )
    resp.raise_for_status()
    tokens = resp.json()
    print("\nrefresh token:\n", tokens["refresh_token"])


if __name__ == "__main__":
    main()
