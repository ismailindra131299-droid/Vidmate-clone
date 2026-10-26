import os
import sys

def tampilkan_struktur(root_dir, abaikan_folder=[".git", "node_modules", "__pycache__", ".expo"]):
    print("\n=== STRUKTUR FOLDER PROYEK VIDMATE CLONE ===")
    for root, dirs, files in os.walk(root_dir):
        dirs[:] = [d for d in dirs if d not in abaikan_folder]
        level = root.replace(root_dir, '').count(os.sep)
        indent = ' ' * 4 * (level)
        print(f"{indent}📁 {os.path.basename(root)}/")
        subindent = ' ' * 4 * (level + 1)
        for f in files:
            if f != "inspector.py":
                print(f"{subindent}📄 {f}")

def baca_isi_file(nama_file):
    if not os.path.exists(nama_file):
        print(f"\n❌ File '{nama_file}' tidak ditemukan.")
        return
    print(f"\n=== ISI FILE: {nama_file} ===")
    try:
        with open(nama_file, 'r', encoding='utf-8') as f:
            print(f.read())
    except Exception as e:
        print(f"❌ Gagal membaca file: {str(e)}")
    print("==============================")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        baca_isi_file(sys.argv[1])
    else:
        tampilkan_struktur(os.getcwd())
