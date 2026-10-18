import sqlite3

# Sesuaikan path database Anda jika berbeda nama
db_path = "jci_star_portal.db" # atau jci_star_portal.db tergantung nama file database aktif Anda

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    cursor.execute("ALTER TABLE chapters ADD COLUMN pic_email TEXT DEFAULT '';")
    print("✅ Kolom 'pic_email' berhasil ditambahkan ke tabel chapters!")
except Exception as e:
    print("ℹ️ Catatan:", e)

conn.commit()
conn.close()