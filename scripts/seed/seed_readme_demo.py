"""
Creates the exact 5 demo accounts documented in README.md, all with
password Password123!, with minimal real profile data so each role's
dashboard isn't empty on first login. Safe to re-run (falls back to
login if an account already exists).

Run: python seed_readme_demo.py [base_api_url]
Defaults to production; pass http://localhost:3000/api for local dev.
"""
import os, sys

import requests

BASE = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("API_BASE", "https://foodtrace-gh.onrender.com/api")
PASSWORD = "Password123!"

# All demo accounts get the same recovery question so a reviewer can test the
# security-question password reset on any of them (answer: Accra).
SECURITY_QUESTION = "What town were you born in?"
SECURITY_ANSWER = "Accra"

def post(url, body, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return requests.post(f"{BASE}{url}", json=body, headers=headers, timeout=30)

def set_security_question(token):
    if not token:
        return
    requests.put(f"{BASE}/auth/security-question",
                 json={"securityQuestion": SECURITY_QUESTION, "securityAnswer": SECURITY_ANSWER},
                 headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"}, timeout=30)

def register_and_login(full_name, email, role):
    r = post("/auth/register", {"fullName": full_name, "email": email, "password": PASSWORD, "role": role, "language": "en",
                                "securityQuestion": SECURITY_QUESTION, "securityAnswer": SECURITY_ANSWER})
    if r.status_code == 200:
        print(f"  [OK] registered {email}")
        return r.json()["token"]
    r2 = post("/auth/login", {"identifier": email, "password": PASSWORD})
    if r2.status_code == 200:
        print(f"  [OK] already existed, logged in {email}")
        token = r2.json()["token"]
        set_security_question(token)  # ensure recovery works on pre-existing accounts too
        return token
    print(f"  [ERR] {email}: register={r.status_code} {r.text[:150]} | login={r2.status_code} {r2.text[:150]}")
    return None

print("Seeding README demo accounts on production\n" + "=" * 40)

print("\n[1/5] Consumer")
register_and_login("Demo Consumer", "consumer@foodtrace.gh", "consumer")

print("\n[2/5] Farmer")
farmer_token = register_and_login("Kwame Asante", "kwame.asante@foodtrace.gh", "farmer")
if farmer_token:
    r = post("/food/farms", {
        "name": "Kwame Asante Farm", "district": "Kumasi", "region": "Ashanti",
        "cropTypes": ["tomato", "pepper"]
    }, farmer_token)
    print(f"  farm: {r.status_code}")

print("\n[3/5] Manufacturer")
mfr_token = register_and_login("Accra Foods Admin", "accra.foods@foodtrace.gh", "manufacturer")
if mfr_token:
    r = post("/manufacturer/profile", {
        "companyName": "Accra Foods Ltd", "fdaRegistrationNumber": "FDA/GH/2024/001",
        "sector": "packaged foods", "subscriptionTier": "medium"
    }, mfr_token)
    print(f"  profile: {r.status_code}")

print("\n[4/5] Pharmacist")
pharm_token = register_and_login("Kumasi Central Pharmacist", "kumasi.pharmacy@foodtrace.gh", "pharmacist")
if pharm_token:
    r = post("/drug/register", {
        "businessName": "Kumasi Central Pharmacy", "ghanaPharmacyCouncilNumber": "GPC/2024/0234",
        "district": "Kumasi", "region": "Ashanti"
    }, pharm_token)
    print(f"  pharmacy: {r.status_code}")

print("\n[5/5] Regulator")
register_and_login("FDA Regulator", "regulator@foodtrace.gh", "regulator")

print("\n[DONE] All README demo accounts ready (password: Password123!)")
