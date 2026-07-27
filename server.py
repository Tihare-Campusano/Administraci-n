import subprocess
import os
import sys
import json
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

# File where sync data will be saved on the Host PC
SYNC_FILE = 'sync_db.json'

def merge_items(local_items, incoming_items):
    merged = {item['id']: item for item in local_items if isinstance(item, dict) and 'id' in item}
    for item in incoming_items:
        if not isinstance(item, dict) or 'id' not in item:
            continue
        item_id = item['id']
        if item_id not in merged:
            merged[item_id] = item
        else:
            local_updated = merged[item_id].get('updatedAt', '')
            incoming_updated = item.get('updatedAt', '')
            if incoming_updated > local_updated:
                merged[item_id] = item
    return list(merged.values())

def merge_databases(local_db, incoming_db):
    keys = ['products', 'customers', 'orders', 'expenses']
    merged_db = {}
    for key in keys:
        local_list = local_db.get(key, [])
        incoming_list = incoming_db.get(key, [])
        merged_db[key] = merge_items(local_list, incoming_list)
    return merged_db

class SyncHTTPRequestHandler(BaseHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        if self.path == '/api/sync':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            
            data = {"products": [], "customers": [], "orders": [], "expenses": []}
            if os.path.exists(SYNC_FILE):
                try:
                    with open(SYNC_FILE, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                except Exception as e:
                    print(f"Error al leer sync_db.json: {e}")
                    
            self.wfile.write(json.dumps(data).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        if self.path == '/api/sync':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                incoming_data = json.loads(post_data.decode('utf-8'))
            except Exception as e:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(b"Invalid JSON")
                return

            local_data = {"products": [], "customers": [], "orders": [], "expenses": []}
            if os.path.exists(SYNC_FILE):
                try:
                    with open(SYNC_FILE, 'r', encoding='utf-8') as f:
                        local_data = json.load(f)
                except Exception as e:
                    print(f"Error al leer sync_db.json en POST: {e}")

            # Merge databases
            merged_data = merge_databases(local_data, incoming_data)
            
            # Save merged database
            try:
                with open(SYNC_FILE, 'w', encoding='utf-8') as f:
                    json.dump(merged_data, f, ensure_ascii=False, indent=2)
            except Exception as e:
                print(f"Error al guardar sync_db.json: {e}")
                self.send_response(500)
                self.end_headers()
                self.wfile.write(b"Error saving sync file")
                return

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(merged_data).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

def start_sync_server():
    server_address = ('0.0.0.0', 8080)
    httpd = HTTPServer(server_address, SyncHTTPRequestHandler)
    print("==================================================")
    print("  Servidor de Sincronización iniciado en puerto 8080")
    print("==================================================")
    httpd.serve_forever()

def start_dev_server():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    if script_dir:
        os.chdir(script_dir)
        
    print("==================================================")
    print("  FoodAdmin - Iniciando Servidor de Desarrollo   ")
    print("==================================================")
    print("Iniciando Vite + TypeScript (con soporte de red local)...")
    print("Presiona Ctrl + C en esta ventana para apagar la aplicación.")
    print("==================================================")
    
    # Iniciar servidor de sincronización Python en un hilo separado
    sync_thread = threading.Thread(target=start_sync_server, daemon=True)
    sync_thread.start()
    
    env = os.environ.copy()
    node_path = r"C:\Program Files\nodejs"
    if node_path not in env.get("PATH", ""):
        env["PATH"] = node_path + os.pathsep + env.get("PATH", "")
        
    try:
        cmd = ["C:\\Program Files\\nodejs\\npm.cmd", "run", "dev"]
        process = subprocess.Popen(cmd, env=env, shell=True)
        
        import time
        time.sleep(2)
        
        print("Lanzando FoodAdmin en modo ventana de escritorio...")
        subprocess.Popen(["cmd", "/c", "start", "msedge", "--app=http://localhost:8000/"], shell=True)
        
        process.wait()
    except KeyboardInterrupt:
        print("\nServidor de desarrollo detenido con éxito. ¡Hasta luego!")
        sys.exit(0)
    except Exception as e:
        print(f"Error al iniciar el servidor: {e}")
        sys.exit(1)

if __name__ == '__main__':
    start_dev_server()
