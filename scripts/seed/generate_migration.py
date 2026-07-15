"""
Read scripts/seed/image_manifest.json (built by build_real_images.py) and emit
backend/src/main/resources/db/migration/V19__real_demo_images.sql

- product_batches rows matched by product_name directly.
- drug_batches rows matched via JOIN to drugs.name (drug_batches has no name column).
Also verifies zero duplicate sha256 hashes across the manifest before writing.
"""
import json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MANIFEST_PATH = os.path.join(ROOT, "scripts", "seed", "image_manifest.json")
MIGRATION_PATH = os.path.join(ROOT, "backend", "src", "main", "resources", "db", "migration", "V19__real_demo_images.sql")

def sql_escape(s):
    return s.replace("'", "''")

def main():
    manifest = json.load(open(MANIFEST_PATH, encoding="utf-8"))

    hashes = {}
    dupes = []
    for name, entry in manifest.items():
        h = entry["sha256"]
        if h in hashes:
            dupes.append((name, hashes[h]))
        else:
            hashes[h] = name
    if dupes:
        print("DUPLICATE IMAGES DETECTED:")
        for a, b in dupes:
            print(f"  {a!r} shares an image with {b!r}")
        sys.exit(1)

    food_lines = []
    drug_lines = []
    for name, entry in manifest.items():
        uri = sql_escape(entry["data_uri"])
        pname = sql_escape(name)
        if entry["type"] == "food":
            food_lines.append(f"UPDATE product_batches SET image_url = '{uri}' WHERE product_name = '{pname}';")
        else:
            drug_lines.append(
                f"UPDATE drug_batches db SET image_url = '{uri}' "
                f"FROM drugs d WHERE d.id = db.drug_id AND d.name = '{pname}';"
            )

    header = (
        "-- Replace generic category-shared demo images with real, distinct product\n"
        "-- photos sourced from Wikimedia Commons -- one unique real photo per demo\n"
        "-- product (no two products share an image; verified by sha256 in\n"
        "-- scripts/seed/image_manifest.json before this file was generated).\n"
        "-- Matches by product name so this is idempotent and safe to re-run; only\n"
        "-- updates image_url, does not reseed any rows.\n\n"
    )

    with open(MIGRATION_PATH, "w", encoding="utf-8", newline="\n") as f:
        f.write(header)
        for line in food_lines:
            f.write(line + "\n")
        f.write("\n")
        for line in drug_lines:
            f.write(line + "\n")

    print(f"Wrote {len(food_lines)} food + {len(drug_lines)} drug UPDATE statements "
          f"({len(food_lines) + len(drug_lines)} total) to {MIGRATION_PATH}")

if __name__ == "__main__":
    main()
