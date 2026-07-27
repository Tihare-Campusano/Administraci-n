import subprocess
import os
import sys

def start_dev_server():
    # Set working directory to script location
    script_dir = os.path.dirname(os.path.abspath(__file__))
    if script_dir:
        os.chdir(script_dir)
        
    print("==================================================")
    print("  FoodAdmin - Iniciando Servidor de Desarrollo   ")
    print("==================================================")
    print("Iniciando Vite + TypeScript...")
    print("Presiona Ctrl + C en esta ventana para apagar la aplicación.")
    print("==================================================")
    
    # Inject Node.js path into environment PATH for the command execution
    env = os.environ.copy()
    node_path = r"C:\Program Files\nodejs"
    if node_path not in env.get("PATH", ""):
        env["PATH"] = node_path + os.pathsep + env.get("PATH", "")
        
    try:
        # Run npm run dev inside shell
        cmd = ["C:\\Program Files\\nodejs\\npm.cmd", "run", "dev"]
        process = subprocess.Popen(cmd, env=env, shell=True)
        
        # Esperar 2 segundos a que Vite inicialice el puerto
        import time
        time.sleep(2)
        
        print("Lanzando FoodAdmin en modo ventana de escritorio...")
        # Abrir Edge en modo aplicación (sin barra de direcciones ni pestañas)
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
