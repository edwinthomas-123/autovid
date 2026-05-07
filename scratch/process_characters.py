import os
from rembg import remove
from PIL import Image
import io

input_files = [
    r"C:\Users\njaana\.gemini\antigravity\brain\f703974a-9e6a-4484-8da2-ffdce67eec55\real_gigachad_man_1777907341949.png",
    r"C:\Users\njaana\.gemini\antigravity\brain\f703974a-9e6a-4484-8da2-ffdce67eec55\real_gamer_girl_1777907359186.png",
    r"C:\Users\njaana\.gemini\antigravity\brain\f703974a-9e6a-4484-8da2-ffdce67eec55\real_sigma_male_handsome_1777907377098.png",
    r"C:\Users\njaana\.gemini\antigravity\brain\f703974a-9e6a-4484-8da2-ffdce67eec55\real_npc_girl_style_1777907392886.png",
    r"C:\Users\njaana\.gemini\antigravity\brain\f703974a-9e6a-4484-8da2-ffdce67eec55\real_hypebeast_male_1777907409021.png",
    r"C:\Users\njaana\.gemini\antigravity\brain\f703974a-9e6a-4484-8da2-ffdce67eec55\real_aesthetic_soft_girl_1777907426409.png"
]

output_dir = r"f:\Anti Gravity Projets\autovid\public\characters"
os.makedirs(output_dir, exist_ok=True)

names = [
    "gigachad", "gamer_girl", "sigma_male", "npc_girl", "hypebeast", "soft_girl"
]

for i, input_path in enumerate(input_files):
    output_path = os.path.join(output_dir, f"{names[i]}.png")
    print(f"Processing {input_path} -> {output_path}...")
    
    try:
        with open(input_path, 'rb') as f:
            input_data = f.read()
        
        # Remove background
        output_data = remove(input_data)
        
        # Save with transparency
        with open(output_path, 'wb') as f:
            f.write(output_data)
    except Exception as e:
        print(f"Error processing {input_path}: {e}")

print("Done!")
