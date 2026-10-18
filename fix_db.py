import sqlite3

# Nama file database SQLite kamu (sesuaikan jika namanya beda, misal: 'app.db')
DB_FILE = "jci_star_portal.db"

def run_migration():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    # 1. Tambah kolom nvp_name jika belum ada
    try:
        cursor.execute("ALTER TABLE chapters ADD COLUMN nvp_name TEXT DEFAULT 'Unassigned';")
        print("✅ Kolom 'nvp_name' berhasil ditambahkan!")
    except sqlite3.OperationalError as e:
        print("ℹ️ Kolom 'nvp_name' sudah ada / di-skip:", e)

    # 2. Tambah kolom pic_email jika belum ada
    try:
        cursor.execute("ALTER TABLE chapters ADD COLUMN pic_email TEXT DEFAULT '';")
        print("✅ Kolom 'pic_email' berhasil ditambahkan!")
    except sqlite3.OperationalError as e:
        print("ℹ️ Kolom 'pic_email' sudah ada / di-skip:", e)

    conn.commit()
    conn.close()
    print("🎉 Migrasi database SQLite selesai!")

if __name__ == "__main__":
    run_migration()