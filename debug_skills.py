import os

def list_extensions(start_dir):
    for root, dirs, files in os.walk(start_dir):
        print(f"Directory: {root}")
        for f in files:
            if f.endswith('.md'):
                print(f"  - {f}")

list_extensions("c:/Antigravity/AbadaLink/skills")
