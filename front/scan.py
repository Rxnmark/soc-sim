import os

# Папки, які ми ігноруємо, щоб не засмічувати вивід
IGNORE_DIRS = {
    'node_modules', '.git', 'venv', 'env', '__pycache__', 
    'dist', 'build', '.next', '.vscode'
}

def generate_tree(dir_path, prefix=""):
    tree_str = ""
    try:
        items = os.listdir(dir_path)
    except PermissionError:
        return ""

    # Фільтруємо і сортуємо (спочатку папки, потім файли)
    items = [i for i in items if i not in IGNORE_DIRS]
    items.sort(key=lambda x: (not os.path.isdir(os.path.join(dir_path, x)), x.lower()))

    for i, item in enumerate(items):
        path = os.path.join(dir_path, item)
        is_last = i == (len(items) - 1)
        connector = "└── " if is_last else "├── "
        tree_str += f"{prefix}{connector}{item}\n"
        
        if os.path.isdir(path):
            extension = "    " if is_last else "│   "
            tree_str += generate_tree(path, prefix + extension)
            
    return tree_str

if __name__ == "__main__":
    root_dir = "." # Сканує поточну папку
    output_file = "project_structure.txt"
    
    with open(output_file, "w", encoding="utf-8") as f:
        f.write(f"📂 Project Structure:\n\n")
        f.write(generate_tree(root_dir))
        
    print(f"✅ Готово! Структуру збережено у файл: {output_file}")